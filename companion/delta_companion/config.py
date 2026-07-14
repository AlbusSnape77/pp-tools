from __future__ import annotations

import json
import os
from pathlib import Path
import sys

from .security import normalize_origin


HOST = "127.0.0.1"
PORT = 43127
API_VERSION = 1
DAILY_LIMIT = 100
QUERY_INTERVAL_SECONDS = (45.0, 90.0)


def validate_allowed_origins(values) -> tuple[str, ...]:
    origins = []
    for value in values:
        origin = normalize_origin(str(value))
        scheme, remainder = origin.split("://", 1)
        hostname = remainder.split(":", 1)[0]
        if hostname not in {"127.0.0.1", "localhost"} and scheme != "https":
            raise ValueError("public Companion origins must use https")
        if origin not in origins:
            origins.append(origin)
    return tuple(origins)


def load_allowed_origins(path: str | Path) -> tuple[str, ...]:
    source = Path(path)
    data = json.loads(source.read_text(encoding="utf-8"))
    return validate_allowed_origins(data.get("allowed_origins", []))


def default_allowed_origins() -> tuple[str, ...]:
    configured = os.environ.get("DELTA_ALLOWED_ORIGINS_FILE")
    if configured and Path(configured).is_file():
        return load_allowed_origins(configured)
    if getattr(sys, "frozen", False):
        bundled = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent)) / "allowed_origins.json"
        if bundled.is_file():
            return load_allowed_origins(bundled)
    return tuple(f"http://127.0.0.1:{port}" for port in range(8787, 8798))
