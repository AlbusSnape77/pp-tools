from __future__ import annotations

import copy
from datetime import datetime
from pathlib import Path
from queue import Queue
import random
import threading
import time
import uuid

from .codes import JOB_STEPS
from .engine.automate import (
    LookupCancelled,
    clear_cancel,
    request_cancel,
    run_auto_lookup,
)
from .engine.lookup import build_record
from .engine.notify import notify
from . import store as player_store


STEP_MAP = {
    "lead_in": "prepare_game",
    "focus": "prepare_game",
    "open_social": "open_social",
    "open_add_friend": "open_social",
    "type_id": "type_query",
    "search": "search",
    "open_result": "open_result",
    "open_info": "open_result",
    "tab_profile": "capture_home",
    "tab_details": "capture_overview",
    "switch_mode": "capture_ranked",
    "tab_history": "capture_recent",
    "ocr": "ocr",
}


class DeltaLookupEngine:
    def __init__(self, calibration_dir: Path, save_dir: Path):
        self.calibration_dir = Path(calibration_dir)
        self.save_dir = Path(save_dir)

    def reset_cancel(self) -> None:
        clear_cancel()

    def cancel(self) -> None:
        request_cancel()

    def run(self, query: str, on_progress):
        paths = run_auto_lookup(
            query,
            self.calibration_dir,
            self.save_dir,
            on_progress=on_progress,
            lead_seconds=0,
        )
        notify("鼠标已交还", "截图已完成，正在本地识别")
        on_progress("ocr", "本地识别中")
        record = build_record([str(path) for path in paths])
        required = (("overview", "数据总览"), ("ranked", "排位赛"))
        missing = [label for key, label in required if not isinstance(record.get(key), dict) or not record[key]]
        if missing:
            raise RuntimeError(f"识别结果不完整，缺少{'、'.join(missing)}，本次结果未保存")
        nickname = query.strip()
        if nickname and not nickname.isdigit():
            record["nickname"] = nickname
            if isinstance(record.get("home"), dict):
                record["home"]["nickname"] = nickname
        return record


class DatabasePlayerStore:
    def __init__(self, database: Path):
        self.database = Path(database)

    def save(self, query: str, record: dict) -> dict:
        nickname = record.get("nickname") or query
        connection = player_store.connect(self.database)
        try:
            return player_store.upsert_snapshot(connection, nickname, record)
        finally:
            connection.close()


class JobQueue:
    def __init__(
        self,
        *,
        engine,
        store,
        daily_limit: int = 100,
        min_interval: tuple[float, float] = (45.0, 90.0),
        clock=time,
    ):
        self.engine = engine
        self.store = store
        self.daily_limit = int(daily_limit)
        self.min_interval = min_interval
        self.clock = clock
        self._queue: Queue[str] = Queue()
        self._jobs: dict[str, dict] = {}
        self._lock = threading.Lock()
        self._running_job_id: str | None = None
        self._last_finished = 0.0
        self._daily_date = self._today()
        self._daily_count = 0
        self._worker = threading.Thread(target=self._work, daemon=True)
        self._worker.start()

    def _now(self) -> float:
        return float(self.clock.time())

    def _today(self) -> str:
        return datetime.fromtimestamp(self._now()).astimezone().date().isoformat()

    def _refresh_day(self) -> None:
        today = self._today()
        if today != self._daily_date:
            self._daily_date = today
            self._daily_count = 0

    def submit(self, query: str) -> str:
        job_id = uuid.uuid4().hex[:12]
        job = {
            "id": job_id,
            "query": query,
            "state": "pending",
            "step": None,
            "message": "排队中",
            "history": [],
            "error": None,
            "player": None,
            "cancel_requested": False,
            "created_at": self._now(),
            "started_at": None,
            "ended_at": None,
        }
        with self._lock:
            self._jobs[job_id] = job
        self._queue.put(job_id)
        return job_id

    def get(self, job_id: str) -> dict | None:
        with self._lock:
            job = self._jobs.get(job_id)
            return copy.deepcopy(job) if job else None

    def list(self, limit: int = 20) -> list[dict]:
        with self._lock:
            jobs = sorted(
                self._jobs.values(), key=lambda job: job["created_at"], reverse=True
            )
            return copy.deepcopy(jobs[:limit])

    def usage(self) -> dict:
        with self._lock:
            self._refresh_day()
            return {
                "today_count": self._daily_count,
                "daily_limit": self.daily_limit,
                "queue_depth": self._queue.qsize(),
            }

    def cancel(self, job_id: str) -> dict | None:
        should_signal = False
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return None
            if job["state"] in {"done", "error", "cancelled"}:
                return copy.deepcopy(job)
            job["cancel_requested"] = True
            job["message"] = "停止中"
            if job["state"] == "pending":
                job["state"] = "cancelled"
                job["ended_at"] = self._now()
            elif self._running_job_id == job_id:
                should_signal = True
            snapshot = copy.deepcopy(job)
        if should_signal:
            self.engine.cancel()
        return snapshot

    def _set(self, job_id: str, **values) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job.update(values)

    def _cancel_requested(self, job_id: str) -> bool:
        with self._lock:
            job = self._jobs.get(job_id)
            return bool(
                job
                and (job["cancel_requested"] or job["state"] == "cancelled")
            )

    def _progress(self, job_id: str, seen: set[str], raw_step: str, message: str):
        step = STEP_MAP.get(raw_step, raw_step)
        if step not in JOB_STEPS or step in seen:
            return
        seen.add(step)
        with self._lock:
            job = self._jobs[job_id]
            job["step"] = step
            job["message"] = message
            job["history"].append(
                {"step": step, "message": message, "at": self._now()}
            )

    def _wait_for_interval(self, job_id: str) -> bool:
        wait_until = self._last_finished + random.uniform(*self.min_interval)
        while self._now() < wait_until:
            if self._cancel_requested(job_id):
                return False
            remaining = wait_until - self._now()
            self.clock.sleep(min(0.2, max(0.0, remaining)))
        return not self._cancel_requested(job_id)

    def _work(self) -> None:
        while True:
            job_id = self._queue.get()
            if self._cancel_requested(job_id):
                continue
            with self._lock:
                self._refresh_day()
                if self._daily_count >= self.daily_limit:
                    job = self._jobs[job_id]
                    job.update(
                        state="error",
                        error={"code": "daily_limit_reached", "details": {}},
                        message="今日查询次数已用完",
                        ended_at=self._now(),
                    )
                    continue
            if not self._wait_for_interval(job_id):
                continue

            self.engine.reset_cancel()
            with self._lock:
                if self._jobs[job_id]["cancel_requested"]:
                    self._jobs[job_id].update(
                        state="cancelled", ended_at=self._now()
                    )
                    continue
                self._running_job_id = job_id
                self._daily_count += 1
                self._jobs[job_id].update(
                    state="running", started_at=self._now(), message="开始查询"
                )

            seen: set[str] = set()
            try:
                record = self.engine.run(
                    self._jobs[job_id]["query"],
                    lambda step, message: self._progress(
                        job_id, seen, step, message
                    ),
                )
                self._progress(job_id, seen, "store", "保存玩家档案")
                player = self.store.save(self._jobs[job_id]["query"], record)
                self._set(
                    job_id,
                    state="done",
                    player=player,
                    message="查询完成",
                    ended_at=self._now(),
                )
            except LookupCancelled:
                self._set(
                    job_id,
                    state="cancelled",
                    error={"code": "job_cancelled", "details": {}},
                    message="已停止",
                    ended_at=self._now(),
                )
            except Exception as error:
                self._set(
                    job_id,
                    state="error",
                    error={
                        "code": "automation_failed",
                        "details": {"message": str(error)},
                    },
                    message="查询失败",
                    ended_at=self._now(),
                )
            finally:
                with self._lock:
                    self._running_job_id = None
                    self._last_finished = self._now()
