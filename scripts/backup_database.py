import os
import sqlite3
from datetime import datetime
from pathlib import Path


def main():
    root = Path(__file__).resolve().parents[1]
    source = Path(os.environ.get("DB_PATH", root / "backend" / "data" / "app.db"))
    if not source.is_absolute():
        source = root / source
    if not source.is_file():
        raise SystemExit(f"数据库不存在：{source}")

    backup_directory = source.parent / "backups"
    backup_directory.mkdir(parents=True, exist_ok=True)
    target = backup_directory / f"app-{datetime.now():%Y%m%d-%H%M%S}.db"

    with sqlite3.connect(source) as source_connection:
        with sqlite3.connect(target) as target_connection:
            source_connection.backup(target_connection)

    print(f"备份完成：{target}")


if __name__ == "__main__":
    main()
