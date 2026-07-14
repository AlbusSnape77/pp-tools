from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import sqlite3
import tempfile
import uuid


class MigrationValidationError(RuntimeError):
    pass


@dataclass(frozen=True)
class MigrationResult:
    status: str
    player_count: int
    calibration_count: int
    files: tuple[dict, ...]


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _database_player_count(database: Path) -> int:
    if not database.is_file():
        raise MigrationValidationError("players.db is missing")
    try:
        connection = sqlite3.connect(f"file:{database.as_posix()}?mode=ro", uri=True)
        try:
            integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
            if integrity != "ok":
                raise MigrationValidationError(f"database integrity check failed: {integrity}")
            tables = {
                row[0]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                )
            }
            if "players" not in tables:
                raise MigrationValidationError("players table is missing")
            return int(connection.execute("SELECT COUNT(*) FROM players").fetchone()[0])
        finally:
            connection.close()
    except sqlite3.DatabaseError as error:
        raise MigrationValidationError("players.db is not a valid SQLite database") from error


def _source_files(source: Path) -> list[tuple[Path, Path]]:
    files = [(source / "players.db", Path("players.db"))]
    calibration = source / "calibration"
    if calibration.is_dir():
        files.extend(
            (path, path.relative_to(source))
            for path in sorted(calibration.rglob("*"))
            if path.is_file()
        )
    return files


def _file_records(source: Path) -> tuple[dict, ...]:
    records = []
    for path, relative in _source_files(source):
        if not path.is_file():
            raise MigrationValidationError(f"required migration file is missing: {relative}")
        records.append(
            {
                "path": relative.as_posix(),
                "size": path.stat().st_size,
                "sha256": _sha256(path),
            }
        )
    return tuple(records)


def _write_json_atomic(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary, path)


def migrate_legacy_data(
    source_root: str | Path,
    target_root: str | Path,
    *,
    dry_run: bool = False,
) -> MigrationResult:
    source = Path(source_root).resolve()
    target = Path(target_root).resolve()
    marker = target / "migration.json"
    if marker.is_file() and not dry_run:
        current = json.loads(marker.read_text(encoding="utf-8"))
        return MigrationResult(
            status="already_completed",
            player_count=int(current.get("player_count", 0)),
            calibration_count=int(current.get("calibration_count", 0)),
            files=tuple(current.get("files", [])),
        )

    player_count = _database_player_count(source / "players.db")
    files = _file_records(source)
    calibration_count = sum(
        1 for item in files if item["path"].startswith("calibration/")
    )
    if dry_run:
        return MigrationResult("dry_run", player_count, calibration_count, files)

    target.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=f".{target.name}.staging-", dir=target.parent))
    rollback = target.parent / f".{target.name}.rollback-{uuid.uuid4().hex}"
    moved_existing = False
    try:
        if target.is_dir():
            shutil.copytree(target, staging, dirs_exist_ok=True)
            backup = staging / "backups" / datetime.now(timezone.utc).strftime(
                "%Y%m%dT%H%M%SZ"
            )
            shutil.copytree(target, backup)

        for source_file, relative in _source_files(source):
            destination = staging / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_file, destination)

        _database_player_count(staging / "players.db")
        for item in files:
            copied = staging / item["path"]
            if copied.stat().st_size != item["size"] or _sha256(copied) != item["sha256"]:
                raise MigrationValidationError(f"copied file validation failed: {item['path']}")

        manifest = {
            "version": 1,
            "source": str(source),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "player_count": player_count,
            "calibration_count": calibration_count,
            "files": list(files),
        }
        _write_json_atomic(staging / "migration.json", manifest)

        if target.exists():
            os.replace(target, rollback)
            moved_existing = True
        try:
            os.replace(staging, target)
        except Exception:
            if moved_existing and rollback.exists():
                os.replace(rollback, target)
            raise
        if rollback.exists():
            shutil.rmtree(rollback)
        return MigrationResult("completed", player_count, calibration_count, files)
    finally:
        if staging.exists():
            shutil.rmtree(staging, ignore_errors=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Migrate Delta Stats local data")
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--target", required=True, type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)
    result = migrate_legacy_data(args.source, args.target, dry_run=args.dry_run)
    print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
