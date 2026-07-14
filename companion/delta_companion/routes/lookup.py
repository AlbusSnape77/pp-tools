from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import tempfile

from flask import Blueprint, current_app, jsonify, request
from werkzeug.utils import secure_filename

from .. import store
from . import api_error


blueprint = Blueprint("delta_lookup", __name__)


def _job_queue():
    return current_app.extensions["delta_job_queue"]


@blueprint.post("/manual-lookup")
def manual_lookup():
    images = [image for image in request.files.getlist("images") if image]
    if not images:
        return api_error("images_required", 400)

    upload_root = Path(current_app.config["UPLOAD_DIR"])
    upload_root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=upload_root) as temporary:
        paths = []
        for index, image in enumerate(images):
            filename = secure_filename(image.filename or f"image-{index}.png")
            path = Path(temporary) / f"{index}-{filename}"
            image.save(path)
            paths.append(str(path))
        record = current_app.config["LOOKUP_BUILDER"](paths)

    nickname = record.get("nickname") or (
        "未命名_" + datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    )
    connection = store.connect(current_app.config["DATABASE"])
    try:
        player = store.upsert_snapshot(connection, nickname, record)
    finally:
        connection.close()
    return jsonify(
        {"player": player, "recognized_nickname": record.get("nickname")}
    )


@blueprint.post("/auto-lookup")
def automatic_lookup():
    body = request.get_json(silent=True) or {}
    query = str(body.get("query") or "").strip()
    if not query:
        return api_error("query_required", 400)
    return jsonify({"job_id": _job_queue().submit(query)}), 202


@blueprint.get("/jobs/<job_id>")
def get_job(job_id: str):
    job = _job_queue().get(job_id)
    return jsonify(job) if job else api_error("job_not_found", 404)


@blueprint.post("/jobs/<job_id>/cancel")
def cancel_job(job_id: str):
    job = _job_queue().cancel(job_id)
    return jsonify(job) if job else api_error("job_not_found", 404)


@blueprint.get("/jobs")
def list_jobs():
    return jsonify(_job_queue().list())


@blueprint.get("/usage")
def usage():
    return jsonify(_job_queue().usage())
