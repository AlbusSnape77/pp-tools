from __future__ import annotations

import io
from pathlib import Path

import cv2
from flask import Blueprint, current_app, jsonify, request, send_file

from ..engine.automate import TEMPLATES, check_calibration
from . import api_error


blueprint = Blueprint("delta_calibration", __name__)


@blueprint.get("/screenshot.png")
def screenshot():
    image = current_app.config["SCREENSHOT_PROVIDER"]()
    success, encoded = cv2.imencode(".png", image)
    if not success:
        return api_error("screenshot_encode_failed", 500)
    response = send_file(
        io.BytesIO(encoded.tobytes()),
        mimetype="image/png",
        download_name="screen.png",
    )
    response.headers["Cache-Control"] = "no-store, max-age=0"
    return response


@blueprint.get("/calibration")
def calibration_status():
    return jsonify(
        {"templates": check_calibration(current_app.config["CALIBRATION_DIR"])}
    )


@blueprint.post("/calibration/<name>")
def save_calibration(name: str):
    if name not in TEMPLATES:
        return api_error("calibration_template_invalid", 400)
    image = request.files.get("image")
    if image is None:
        return api_error("images_required", 400)
    directory = Path(current_app.config["CALIBRATION_DIR"])
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{name}.png"
    image.save(path)
    return jsonify({"ok": True, "name": name})


@blueprint.delete("/calibration/<name>")
def delete_calibration(name: str):
    if name not in TEMPLATES:
        return api_error("calibration_template_invalid", 400)
    path = Path(current_app.config["CALIBRATION_DIR"]) / f"{name}.png"
    path.unlink(missing_ok=True)
    return "", 204
