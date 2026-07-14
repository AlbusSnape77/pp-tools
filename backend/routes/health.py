from pathlib import Path

from flask import Blueprint, current_app, jsonify

health_bp = Blueprint("health", __name__, url_prefix="/api")


@health_bp.get("/health")
def health_check():
    database_directory = Path(current_app.config["DB_PATH"]).parent
    database_directory.mkdir(parents=True, exist_ok=True)
    frontend_index = Path(current_app.config["FRONTEND_DIST"]) / "index.html"
    checks = {
        "database_directory": "ready" if database_directory.is_dir() else "missing",
        "frontend_build": "ready" if frontend_index.is_file() else "missing",
    }
    status = "ok" if all(value == "ready" for value in checks.values()) else "degraded"
    return jsonify({"status": status, "checks": checks})
