import io

from app import create_app


def make_client(tmp_path):
    app = create_app({"TESTING": True, "DB_PATH": tmp_path / "shop.db"})
    return app.test_client()


def test_delta_analyze_rejects_missing_files(tmp_path):
    response = make_client(tmp_path).post("/api/delta-force/analyze")

    assert response.status_code == 400
    assert response.get_json()["error"] == "At least one screenshot is required."


def test_delta_analyze_rejects_non_images(tmp_path):
    response = make_client(tmp_path).post(
        "/api/delta-force/analyze",
        data={"images": [(io.BytesIO(b"text"), "notes.txt", "text/plain")]},
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "Only image uploads are supported."


def test_delta_analyze_returns_structured_result(monkeypatch, tmp_path):
    class FakeRecognizer:
        def analyze(self, files):
            return {
                "nickname": "Sample Player",
                "overview": {"kd": ["1.20", "1.50", "1.80"]},
            }

    monkeypatch.setattr("routes.delta_force.DeltaRecognizer", FakeRecognizer)
    response = make_client(tmp_path).post(
        "/api/delta-force/analyze",
        data={"images": [(io.BytesIO(b"fake image bytes"), "sample.png", "image/png")]},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["result"]["nickname"] == "Sample Player"
    assert body["result"]["overview"]["kd"][2] == "1.80"
    assert body["warnings"] == []


def test_delta_analyze_returns_safe_error_when_recognition_fails(monkeypatch, tmp_path):
    class FailingRecognizer:
        def analyze(self, files):
            raise RuntimeError("internal recognition detail")

    monkeypatch.setattr("routes.delta_force.DeltaRecognizer", FailingRecognizer)
    response = make_client(tmp_path).post(
        "/api/delta-force/analyze",
        data={"images": [(io.BytesIO(b"image bytes"), "sample.png", "image/png")]},
        content_type="multipart/form-data",
    )

    assert response.status_code == 422
    assert response.get_json() == {"error": "Screenshots could not be analyzed."}
