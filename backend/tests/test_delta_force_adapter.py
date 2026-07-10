from pathlib import Path

from services.delta_ocr import DeltaRecognizer


class Upload:
    filename = "sample.png"
    mimetype = "image/png"

    def save(self, path):
        Path(path).write_bytes(b"fake image bytes")


def test_delta_adapter_normalizes_result_and_removes_temp_files(tmp_path):
    seen_paths = []

    def fake_record_builder(paths):
        seen_paths.extend(paths)
        assert all(Path(path).exists() for path in paths)
        return {
            "nickname": "Parsed Player",
            "overview": {
                "kd": ["1.0", "1.2", "1.8"],
                "rank_name": "Gold III",
                "rank_star": 3,
                "radar": {"战斗": 72, "生存": 68, "合作": 60},
            },
            "recent": {"hidden": False, "matches": [{"result": "Success"}]},
        }

    recognizer = DeltaRecognizer(upload_dir=tmp_path, record_builder=fake_record_builder)

    result = recognizer.analyze([Upload()])

    assert result["nickname"] == "Parsed Player"
    assert result["rank"] == {"name": "Gold III", "stars": 3}
    assert result["radar"] == {"combat": 72, "survival": 68, "support": 60}
    assert result["recent_matches"] == [{"result": "Success"}]
    assert seen_paths
    assert list(tmp_path.iterdir()) == []
