from functools import wraps

from flask import current_app, jsonify, request
from itsdangerous import BadSignature, URLSafeTimedSerializer


def serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="admin-session")


def make_admin_token():
    return serializer().dumps({"role": "admin"})


def verify_admin_token(token):
    try:
        data = serializer().loads(
            token,
            max_age=current_app.config["ADMIN_TOKEN_MAX_AGE"],
        )
    except BadSignature:
        return False
    return data.get("role") == "admin"


def require_admin(function):
    @wraps(function)
    def wrapped(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        prefix = "Bearer "
        token = header[len(prefix) :].strip() if header.startswith(prefix) else ""
        if not token or not verify_admin_token(token):
            return jsonify({"error": "Admin login is required."}), 401
        return function(*args, **kwargs)

    return wrapped
