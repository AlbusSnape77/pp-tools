from flask import jsonify


def api_error(code: str, status: int, details: dict | None = None):
    return jsonify({"error": {"code": code, "details": details or {}}}), status
