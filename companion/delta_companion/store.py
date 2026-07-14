from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import sqlite3


SCHEMA = """
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL UNIQUE,
  tags TEXT NOT NULL DEFAULT '[]',
  note TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_schema(connection: sqlite3.Connection) -> None:
    connection.execute("PRAGMA journal_mode=WAL")
    connection.executescript(SCHEMA)


def connect(database_path: str | Path) -> sqlite3.Connection:
    path = Path(database_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    ensure_schema(connection)
    return connection


def _row_to_player(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "nickname": row["nickname"],
        "tags": json.loads(row["tags"] or "[]"),
        "note": row["note"],
        "data": json.loads(row["data"] or "{}"),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def upsert_snapshot(connection: sqlite3.Connection, nickname: str, data: dict) -> dict:
    now = _now()
    row = connection.execute(
        "SELECT * FROM players WHERE nickname = ?", (nickname,)
    ).fetchone()
    if row is None:
        connection.execute(
            "INSERT INTO players "
            "(nickname, tags, note, data, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (nickname, "[]", None, json.dumps(data, ensure_ascii=False), now, now),
        )
    else:
        merged = json.loads(row["data"] or "{}")
        merged.update(data)
        connection.execute(
            "UPDATE players SET data = ?, updated_at = ? WHERE id = ?",
            (json.dumps(merged, ensure_ascii=False), now, row["id"]),
        )
    connection.commit()
    return get_by_nickname(connection, nickname)


def get_by_nickname(connection: sqlite3.Connection, nickname: str) -> dict | None:
    row = connection.execute(
        "SELECT * FROM players WHERE nickname = ?", (nickname,)
    ).fetchone()
    return _row_to_player(row) if row else None


def get_by_id(connection: sqlite3.Connection, player_id: int) -> dict | None:
    row = connection.execute(
        "SELECT * FROM players WHERE id = ?", (player_id,)
    ).fetchone()
    return _row_to_player(row) if row else None


def search(connection: sqlite3.Connection, query: str) -> list[dict]:
    value = (query or "").strip()
    if not value:
        rows = connection.execute(
            "SELECT * FROM players ORDER BY updated_at DESC"
        ).fetchall()
    else:
        like = f"%{value}%"
        rows = connection.execute(
            "SELECT * FROM players "
            "WHERE nickname LIKE ? OR tags LIKE ? OR note LIKE ? OR data LIKE ? "
            "ORDER BY updated_at DESC",
            (like, like, like, like),
        ).fetchall()
    return [_row_to_player(row) for row in rows]


def update_player(
    connection: sqlite3.Connection,
    player_id: int,
    *,
    nickname: str | None = None,
    tags: list[str] | None = None,
    note: str | None = None,
    data: dict | None = None,
) -> dict | None:
    row = connection.execute(
        "SELECT * FROM players WHERE id = ?", (player_id,)
    ).fetchone()
    if row is None:
        return None
    connection.execute(
        "UPDATE players SET nickname = ?, tags = ?, note = ?, data = ?, "
        "updated_at = ? WHERE id = ?",
        (
            nickname if nickname is not None else row["nickname"],
            json.dumps(tags, ensure_ascii=False) if tags is not None else row["tags"],
            note if note is not None else row["note"],
            json.dumps(data, ensure_ascii=False) if data is not None else row["data"],
            _now(),
            player_id,
        ),
    )
    connection.commit()
    return get_by_id(connection, player_id)


def delete_player(connection: sqlite3.Connection, player_id: int) -> bool:
    cursor = connection.execute("DELETE FROM players WHERE id = ?", (player_id,))
    connection.commit()
    return cursor.rowcount > 0
