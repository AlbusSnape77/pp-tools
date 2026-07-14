import threading
import time

import pytest

from delta_companion.codes import JOB_STEPS
from delta_companion.engine.automate import LookupCancelled
from delta_companion.jobs import DeltaLookupEngine, JobQueue


RAW_STEPS = (
    "focus",
    "open_social",
    "type_id",
    "search",
    "open_result",
    "tab_profile",
    "tab_details",
    "switch_mode",
    "tab_history",
)


def wait_until_terminal(queue, job_id, timeout=2):
    deadline = time.time() + timeout
    while time.time() < deadline:
        job = queue.get(job_id)
        if job["state"] in {"done", "error", "cancelled"}:
            return job
        time.sleep(0.01)
    raise AssertionError("job did not reach a terminal state")


class MemoryStore:
    def save(self, query, record):
        return {"id": 1, "uid": record["home"]["uid"], "query": query}


class ImmediateEngine:
    def __init__(self):
        self.cancel_observed = False

    def reset_cancel(self):
        self.cancel_observed = False

    def cancel(self):
        self.cancel_observed = True

    def run(self, query, on_progress):
        for step in RAW_STEPS:
            on_progress(step, step)
        on_progress("ocr", "ocr")
        return {"nickname": query, "home": {"uid": query}}


class BlockingEngine(ImmediateEngine):
    def __init__(self):
        super().__init__()
        self.started = threading.Event()

    def run(self, query, on_progress):
        self.started.set()
        while not self.cancel_observed:
            time.sleep(0.01)
        raise LookupCancelled()


def test_named_lookup_preserves_the_exact_query_as_nickname(monkeypatch, tmp_path):
    from delta_companion import jobs

    monkeypatch.setattr(jobs, "run_auto_lookup", lambda *args, **kwargs: [tmp_path / "home.png"])
    monkeypatch.setattr(
        jobs,
        "build_record",
        lambda _paths: {
            "nickname": "当区被端就受着",
            "home": {"nickname": "当区被端就受着", "uid": "903586363393768864841"},
            "overview": {"rank_score": 6303},
            "ranked": {"rank_score": 6303},
        },
    )
    monkeypatch.setattr(jobs, "notify", lambda *args: None)

    record = DeltaLookupEngine(tmp_path, tmp_path).run("当区被踹就受着", lambda *args: None)

    assert record["nickname"] == "当区被踹就受着"
    assert record["home"]["nickname"] == "当区被踹就受着"


def test_automatic_lookup_rejects_an_incomplete_ranked_snapshot(monkeypatch, tmp_path):
    from delta_companion import jobs

    monkeypatch.setattr(jobs, "run_auto_lookup", lambda *args, **kwargs: [tmp_path / "overview.png"])
    monkeypatch.setattr(
        jobs,
        "build_record",
        lambda _paths: {
            "nickname": "测试玩家",
            "home": {"nickname": "测试玩家"},
            "overview": {"rank_score": 6303},
        },
    )
    monkeypatch.setattr(jobs, "notify", lambda *args: None)

    with pytest.raises(RuntimeError, match="排位赛"):
        DeltaLookupEngine(tmp_path, tmp_path).run("测试玩家", lambda *args: None)


def test_job_reports_stable_steps_and_stores_player():
    queue = JobQueue(
        engine=ImmediateEngine(),
        store=MemoryStore(),
        daily_limit=10,
        min_interval=(0, 0),
    )

    job = wait_until_terminal(queue, queue.submit("123456"))

    assert job["state"] == "done"
    assert [entry["step"] for entry in job["history"]] == list(JOB_STEPS)
    assert job["player"]["uid"] == "123456"


def test_cancelled_job_stops_engine_and_releases_worker():
    engine = BlockingEngine()
    queue = JobQueue(
        engine=engine,
        store=MemoryStore(),
        daily_limit=10,
        min_interval=(0, 0),
    )
    job_id = queue.submit("player")
    assert engine.started.wait(1)

    queue.cancel(job_id)
    job = wait_until_terminal(queue, job_id)

    assert job["state"] == "cancelled"
    assert engine.cancel_observed


def test_daily_limit_uses_local_calendar():
    queue = JobQueue(
        engine=ImmediateEngine(),
        store=MemoryStore(),
        daily_limit=1,
        min_interval=(0, 0),
    )

    first = wait_until_terminal(queue, queue.submit("one"))
    second = wait_until_terminal(queue, queue.submit("two"))

    assert first["state"] == "done"
    assert second["error"]["code"] == "daily_limit_reached"
    assert queue.usage()["today_count"] == 1
