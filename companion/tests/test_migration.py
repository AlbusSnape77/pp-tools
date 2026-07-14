import hashlib
import sqlite3

import pytest

from delta_companion.migration import (
    MigrationValidationError,
    migrate_legacy_data,
)


SCHEMA = """
CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL UNIQUE,
  tags TEXT NOT NULL DEFAULT '[]',
  note TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
"""


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def make_legacy_data(root):
    root.mkdir(parents=True)
    connection = sqlite3.connect(root / "players.db")
    connection.executescript(SCHEMA)
    connection.execute(
        "INSERT INTO players "
        "(nickname, tags, note, data, created_at, updated_at) "
        "VALUES (?, '[]', NULL, '{}', ?, ?)",
        ("追风君子", "2026-07-13T00:00:00+00:00", "2026-07-13T00:00:00+00:00"),
    )
    connection.commit()
    connection.close()
    calibration = root / "calibration"
    calibration.mkdir()
    (calibration / "social.png").write_bytes(b"calibration")
    return root


def make_current_data(root):
    root.mkdir(parents=True)
    connection = sqlite3.connect(root / "players.db")
    connection.executescript(SCHEMA)
    connection.commit()
    connection.close()
    return root


def make_invalid_data(root):
    root.mkdir(parents=True)
    (root / "players.db").write_bytes(b"not a database")
    return root


def test_migration_copies_database_and_calibration_once(tmp_path):
    source = make_legacy_data(tmp_path / "source")
    target = tmp_path / "target"

    first = migrate_legacy_data(source, target)
    second = migrate_legacy_data(source, target)

    assert first.status == "completed"
    assert first.player_count == 1
    assert second.status == "already_completed"
    assert sha256(source / "players.db") == sha256(target / "players.db")
    assert (target / "calibration" / "social.png").exists()
    assert (target / "migration.json").exists()


def test_failed_validation_preserves_existing_target(tmp_path):
    target = make_current_data(tmp_path / "target")
    before = sha256(target / "players.db")

    with pytest.raises(MigrationValidationError):
        migrate_legacy_data(make_invalid_data(tmp_path / "source"), target)

    assert sha256(target / "players.db") == before


def test_dry_run_does_not_create_target(tmp_path):
    source = make_legacy_data(tmp_path / "source")
    target = tmp_path / "target"

    result = migrate_legacy_data(source, target, dry_run=True)

    assert result.status == "dry_run"
    assert result.player_count == 1
    assert result.calibration_count == 1
    assert not target.exists()
