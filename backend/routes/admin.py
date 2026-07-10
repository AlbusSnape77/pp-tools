from hmac import compare_digest

from flask import Blueprint, current_app, jsonify, request

from services.auth import make_admin_token, require_admin
from services.milk_tea_store import MilkTeaStore


admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def store():
    instance = MilkTeaStore(current_app.config["DB_PATH"])
    instance.initialize()
    return instance


def request_body():
    body = request.get_json(silent=True)
    if body is None:
        return {}
    if not isinstance(body, dict):
        raise ValueError("Request body must be a JSON object.")
    return body


@admin_bp.post("/login")
def login():
    configured_password = current_app.config.get("ADMIN_PASSWORD")
    if not configured_password:
        return jsonify({"error": "Admin login is not configured."}), 503

    try:
        body = request_body()
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    provided_password = body.get("password")
    if not isinstance(provided_password, str) or not compare_digest(
        provided_password,
        configured_password,
    ):
        return jsonify({"error": "Invalid password."}), 401
    return jsonify({"token": make_admin_token()})


@admin_bp.get("/milk-tea/orders")
@require_admin
def list_orders():
    return jsonify({"orders": store().list_orders()})


@admin_bp.patch("/milk-tea/orders/<int:order_id>/status")
@require_admin
def update_order_status(order_id):
    try:
        body = request_body()
        order = store().update_order_status(order_id, body.get("status", ""))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    if not order:
        return jsonify({"error": "Order not found."}), 404
    return jsonify({"order": order})
