from flask import Blueprint, jsonify

from .. import __version__
from ..config import API_VERSION


blueprint = Blueprint("delta_health", __name__)


@blueprint.get("/health")
def health():
    return jsonify(
        {
            "status": "ready",
            "version": __version__,
            "api_version": API_VERSION,
            "capabilities": [
                "manual_lookup",
                "automatic_lookup",
                "players",
                "calibration",
            ],
        }
    )
