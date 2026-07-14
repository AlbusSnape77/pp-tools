from delta_companion.control_window import (
    ControlWindowModel,
    DELTA_LAYOUT,
    DELTA_THEME,
    format_control_snapshot,
)


class PairingManagerStub:
    def issue_code(self):
        return "123456"

    def remaining_seconds(self):
        return 300


class PairingStoreStub:
    def __init__(self):
        self.origins = [{"origin": "https://example.com"}]

    def list_origins(self):
        return self.origins

    def revoke(self, origin):
        self.origins = [item for item in self.origins if item["origin"] != origin]
        return True


class JobQueueStub:
    def __init__(self):
        self.cancelled = []

    def list(self):
        return [{"id": "job-1", "state": "running"}]

    def cancel(self, job_id):
        self.cancelled.append(job_id)
        return {"id": job_id, "state": "cancelled"}


def test_control_window_model_exposes_pairing_and_job_actions(tmp_path):
    pairings = PairingStoreStub()
    jobs = JobQueueStub()
    model = ControlWindowModel(
        version="1.0.0",
        port=43127,
        data_dir=tmp_path,
        pairing_manager=PairingManagerStub(),
        pairing_store=pairings,
        job_queue=jobs,
    )

    code = model.issue_pairing_code()
    snapshot = model.snapshot()
    model.stop_job("job-1")
    model.revoke_origin("https://example.com")

    assert code == "123456"
    assert snapshot["service"] == "http://127.0.0.1:43127"
    assert snapshot["pairing_code"] == "123456"
    assert snapshot["jobs"][0]["id"] == "job-1"
    assert jobs.cancelled == ["job-1"]
    assert pairings.origins == []


def test_control_window_matches_delta_visual_tokens():
    assert DELTA_THEME["background"] == "#0c0e0f"
    assert DELTA_THEME["surface"] == "#13181a"
    assert DELTA_THEME["accent"] == "#2be08c"
    assert DELTA_THEME["text"] == "#e9eef0"
    assert DELTA_LAYOUT["sites_text_width"] == 1
    assert DELTA_LAYOUT["jobs_min_width"] >= 150


def test_control_snapshot_formats_pairing_and_status_content():
    view = format_control_snapshot(
        {
            "version": "1.0.0",
            "service": "http://127.0.0.1:43127",
            "pairing_code": "123456",
            "pairing_seconds": 125,
            "origins": [{"origin": "http://127.0.0.1:8787"}],
            "jobs": [{"id": "job-1", "state": "running"}],
        }
    )

    assert view["service"] == "127.0.0.1:43127"
    assert view["expiry"] == "02:05"
    assert view["paired_sites"] == "http://127.0.0.1:8787"
    assert view["job_count"] == "1"


def test_control_snapshot_excludes_finished_jobs_from_active_count():
    view = format_control_snapshot(
        {
            "jobs": [
                {"id": "job-1", "state": "done"},
                {"id": "job-2", "state": "error"},
                {"id": "job-3", "state": "cancelled"},
            ]
        }
    )

    assert view["job_count"] == "0"
