from __future__ import annotations

from pathlib import Path

from flask import Flask, request

from .engine.automate import grab_screen
from .engine.lookup import build_record
from .pairing_store import PairingStore
from .paths import resolve_paths
from .security import OriginPolicy, PairingManager
from .jobs import DatabasePlayerStore, DeltaLookupEngine, JobQueue
from .config import default_allowed_origins
from .routes import api_error


def _bearer_token() -> str | None:
    authorization = request.headers.get("Authorization", "")
    scheme, separator, token = authorization.partition(" ")
    if separator and scheme.lower() == "bearer" and token:
        return token
    return None


def create_app(config: dict | None = None) -> Flask:
    paths = resolve_paths()
    app = Flask(__name__)
    app.config.from_mapping(
        DATABASE=paths.database,
        PAIRING_FILE=paths.pairing_file,
        CALIBRATION_DIR=paths.calibration_dir,
        UPLOAD_DIR=paths.temp_dir / "uploads",
        ALLOWED_ORIGINS=default_allowed_origins(),
        LOCAL_PORTS=range(8787, 8798),
        LOOKUP_BUILDER=build_record,
        SCREENSHOT_PROVIDER=grab_screen,
        AUTO_CAPTURE_DIR=paths.temp_dir / "auto",
        JOB_QUEUE=None,
        DAILY_LIMIT=100,
        QUERY_INTERVAL_SECONDS=(45.0, 90.0),
        MAX_CONTENT_LENGTH=40 * 1024 * 1024,
    )
    if config:
        app.config.update(config)

    app.config["DATABASE"] = Path(app.config["DATABASE"])
    app.config["PAIRING_FILE"] = Path(app.config["PAIRING_FILE"])
    app.config["CALIBRATION_DIR"] = Path(app.config["CALIBRATION_DIR"])
    app.config["UPLOAD_DIR"] = Path(app.config["UPLOAD_DIR"])
    app.config["AUTO_CAPTURE_DIR"] = Path(app.config["AUTO_CAPTURE_DIR"])

    pairing_store = PairingStore(app.config["PAIRING_FILE"])
    pairing_manager = PairingManager(ttl_seconds=300)
    origin_policy = OriginPolicy(
        app.config["ALLOWED_ORIGINS"], local_ports=app.config["LOCAL_PORTS"]
    )
    app.extensions["delta_pairing_store"] = pairing_store
    app.extensions["delta_pairing_manager"] = pairing_manager
    app.extensions["delta_origin_policy"] = origin_policy
    job_queue = app.config["JOB_QUEUE"] or JobQueue(
        engine=DeltaLookupEngine(
            app.config["CALIBRATION_DIR"], app.config["AUTO_CAPTURE_DIR"]
        ),
        store=DatabasePlayerStore(app.config["DATABASE"]),
        daily_limit=app.config["DAILY_LIMIT"],
        min_interval=app.config["QUERY_INTERVAL_SECONDS"],
    )
    app.extensions["delta_job_queue"] = job_queue

    public_paths = {"/api/v1/health", "/api/v1/pair"}

    @app.before_request
    def authorize_request():
        if not request.path.startswith("/api/v1/"):
            return None
        if request.method == "OPTIONS":
            return "", 204
        if request.path == "/api/v1/health":
            return None

        origin = request.headers.get("Origin", "")
        if not origin_policy.allows(origin):
            return api_error("origin_denied", 403)
        if request.path in public_paths:
            return None

        token = _bearer_token()
        if token is None or not pairing_store.verify(origin, token):
            return api_error("token_invalid", 401)
        return None

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin", "")
        if origin_policy.allows(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Methods"] = (
                "GET,POST,PUT,DELETE,OPTIONS"
            )
            response.headers["Access-Control-Allow-Headers"] = (
                "authorization,content-type"
            )
            if request.headers.get("Access-Control-Request-Private-Network") == "true":
                response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response

    from .routes.calibration import blueprint as calibration_blueprint
    from .routes.health import blueprint as health_blueprint
    from .routes.lookup import blueprint as lookup_blueprint
    from .routes.pairing import blueprint as pairing_blueprint
    from .routes.players import blueprint as players_blueprint

    for blueprint in (
        health_blueprint,
        pairing_blueprint,
        players_blueprint,
        lookup_blueprint,
        calibration_blueprint,
    ):
        app.register_blueprint(blueprint, url_prefix="/api/v1")

    return app
