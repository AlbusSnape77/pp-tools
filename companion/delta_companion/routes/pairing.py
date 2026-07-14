from flask import Blueprint, current_app, jsonify, request

from ..security import PairingCodeExpired, PairingCodeInvalid
from . import api_error


blueprint = Blueprint("delta_pairing", __name__)


@blueprint.post("/pair")
def pair():
    body = request.get_json(silent=True) or {}
    code = str(body.get("code") or "")
    origin = request.headers.get("Origin", "")
    manager = current_app.extensions["delta_pairing_manager"]
    store = current_app.extensions["delta_pairing_store"]
    try:
        token = manager.exchange(code, origin)
    except PairingCodeExpired:
        return api_error("pairing_code_expired", 400)
    except PairingCodeInvalid:
        return api_error("pairing_code_invalid", 400)
    store.create(origin, token=token)
    return jsonify({"token": token})


@blueprint.post("/pair/revoke")
def revoke_pairing():
    origin = request.headers.get("Origin", "")
    current_app.extensions["delta_pairing_store"].revoke(origin)
    return "", 204
