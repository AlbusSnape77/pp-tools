from delta_companion.store import connect, upsert_snapshot


def test_authorized_player_crud(app, client, authorized_headers):
    connection = connect(app.config["DATABASE"])
    try:
        player = upsert_snapshot(
            connection, "追风君子", {"home": {"uid": "123456"}}
        )
    finally:
        connection.close()

    listed = client.get(
        "/api/v1/players?q=123456", headers=authorized_headers
    )
    fetched = client.get(
        f"/api/v1/players/{player['id']}", headers=authorized_headers
    )
    updated = client.put(
        f"/api/v1/players/{player['id']}",
        json={"note": "重点观察"},
        headers=authorized_headers,
    )
    deleted = client.delete(
        f"/api/v1/players/{player['id']}", headers=authorized_headers
    )

    assert listed.json[0]["id"] == player["id"]
    assert fetched.json["nickname"] == "追风君子"
    assert updated.json["note"] == "重点观察"
    assert deleted.status_code == 204
