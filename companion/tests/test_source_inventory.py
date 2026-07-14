from pathlib import Path

from scripts.inventory_delta_source import build_inventory


def test_inventory_records_required_engine_and_api_files(tmp_path: Path):
    source = tmp_path / "Delta Force"
    (source / "dfstats").mkdir(parents=True)
    (source / "web").mkdir()
    (source / "dfstats" / "automate.py").write_text("AUTO = 1", encoding="utf-8")
    (source / "dfstats" / "server.py").write_text("SERVER = 1", encoding="utf-8")
    (source / "web" / "app.js").write_text("const app = 1;", encoding="utf-8")

    inventory = build_inventory(source)

    assert inventory["source_root"] == str(source.resolve())
    assert {item["path"] for item in inventory["files"]} == {
        "dfstats/automate.py",
        "dfstats/server.py",
        "web/app.js",
    }
    assert all(len(item["sha256"]) == 64 for item in inventory["files"])
