from pathlib import Path
from tempfile import TemporaryDirectory, gettempdir


RADAR_KEYS = {
    "战斗": "combat",
    "生存": "survival",
    "合作": "support",
    "搜索": "search",
    "财富": "wealth",
}


def load_record_builder():
    from services.delta_core.lookup import build_record

    return build_record


def normalize_record(record):
    normalized = dict(record or {})
    overview = normalized.get("overview") or {}
    ranked = normalized.get("ranked") or {}
    rank_source = ranked if ranked.get("rank_name") else overview
    existing_rank = normalized.get("rank") or {}

    normalized["rank"] = {
        "name": existing_rank.get("name") or rank_source.get("rank_name"),
        "stars": existing_rank.get("stars") if existing_rank.get("stars") is not None else rank_source.get("rank_star"),
    }

    radar = normalized.get("radar") or overview.get("radar") or ranked.get("radar") or {}
    normalized["radar"] = {
        RADAR_KEYS.get(key, key): value
        for key, value in radar.items()
        if value is not None
    }

    recent = normalized.get("recent") or {}
    normalized["recent_matches"] = normalized.get("recent_matches") or recent.get("matches") or []
    return normalized


class DeltaRecognizer:
    def __init__(self, upload_dir=None, record_builder=None):
        default_dir = Path(gettempdir()) / "pp-tools" / "delta-force"
        self.upload_dir = Path(upload_dir or default_dir)
        self.record_builder = record_builder

    def analyze(self, files):
        if not files:
            raise ValueError("At least one screenshot is required.")

        self.upload_dir.mkdir(parents=True, exist_ok=True)
        with TemporaryDirectory(prefix="request-", dir=self.upload_dir) as request_dir:
            saved_paths = []
            for index, upload in enumerate(files):
                suffix = Path(upload.filename or "").suffix.lower() or ".png"
                path = Path(request_dir) / f"{index}{suffix}"
                upload.save(path)
                saved_paths.append(str(path))

            builder = self.record_builder or load_record_builder()
            return normalize_record(builder(saved_paths))
