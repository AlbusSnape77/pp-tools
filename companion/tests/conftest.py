from pathlib import Path

import numpy as np
import pytest

from delta_companion.app import create_app


ORIGIN = "https://example.com"


class StubJobQueue:
    def __init__(self):
        self.jobs = {}

    def submit(self, query):
        job_id = f"job-{len(self.jobs) + 1}"
        self.jobs[job_id] = {
            "id": job_id,
            "query": query,
            "state": "pending",
            "step": None,
            "history": [],
            "error": None,
            "player": None,
        }
        return job_id

    def get(self, job_id):
        return self.jobs.get(job_id)

    def cancel(self, job_id):
        job = self.jobs.get(job_id)
        if job:
            job["state"] = "cancelled"
        return job

    def list(self):
        return list(self.jobs.values())

    def usage(self):
        return {"today_count": 0, "daily_limit": 100, "queue_depth": 0}


@pytest.fixture
def app(tmp_path: Path):
    def lookup_builder(_paths):
        return {
            "nickname": "追风君子",
            "home": {"uid": "123456"},
            "recent": {"hidden": True, "matches": []},
        }

    application = create_app(
        {
            "TESTING": True,
            "DATABASE": tmp_path / "players.db",
            "PAIRING_FILE": tmp_path / "pairings.json",
            "CALIBRATION_DIR": tmp_path / "calibration",
            "UPLOAD_DIR": tmp_path / "uploads",
            "ALLOWED_ORIGINS": [ORIGIN],
            "LOCAL_PORTS": range(8787, 8798),
            "LOOKUP_BUILDER": lookup_builder,
            "SCREENSHOT_PROVIDER": lambda: np.zeros((20, 30, 3), dtype=np.uint8),
            "JOB_QUEUE": StubJobQueue(),
        }
    )
    return application


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def authorized_headers(app):
    token = app.extensions["delta_pairing_store"].create(ORIGIN)
    return {"Origin": ORIGIN, "Authorization": f"Bearer {token}"}
