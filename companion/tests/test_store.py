from delta_companion.store import connect, search, upsert_snapshot


def test_store_reads_and_updates_legacy_player_shape(tmp_path):
    connection = connect(tmp_path / "players.db")
    try:
        stored = upsert_snapshot(connection, "追风君子", {"home": {"uid": "123"}})

        assert stored["nickname"] == "追风君子"
        assert search(connection, "123")[0]["id"] == stored["id"]
    finally:
        connection.close()
