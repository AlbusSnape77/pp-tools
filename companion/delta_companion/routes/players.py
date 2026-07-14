from flask import Blueprint, current_app, jsonify, request

from .. import store
from . import api_error


blueprint = Blueprint("delta_players", __name__)


def _connection():
    return store.connect(current_app.config["DATABASE"])


@blueprint.get("/players")
def list_players():
    connection = _connection()
    try:
        return jsonify(store.search(connection, request.args.get("q", "")))
    finally:
        connection.close()


@blueprint.get("/players/<int:player_id>")
def get_player(player_id: int):
    connection = _connection()
    try:
        player = store.get_by_id(connection, player_id)
    finally:
        connection.close()
    return jsonify(player) if player else api_error("player_not_found", 404)


@blueprint.put("/players/<int:player_id>")
def update_player(player_id: int):
    body = request.get_json(silent=True) or {}
    connection = _connection()
    try:
        player = store.update_player(
            connection,
            player_id,
            nickname=body.get("nickname"),
            tags=body.get("tags"),
            note=body.get("note"),
            data=body.get("data"),
        )
    finally:
        connection.close()
    return jsonify(player) if player else api_error("player_not_found", 404)


@blueprint.delete("/players/<int:player_id>")
def delete_player(player_id: int):
    connection = _connection()
    try:
        deleted = store.delete_player(connection, player_id)
    finally:
        connection.close()
    return ("", 204) if deleted else api_error("player_not_found", 404)
