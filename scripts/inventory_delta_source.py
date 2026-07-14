from __future__ import annotations

import hashlib
import json
from pathlib import Path


REQUIRED_GLOBS = ("dfstats/*.py", "web/*", "test_parse.py", "requirements.txt")


def build_inventory(source_root: Path) -> dict:
    root = source_root.resolve()
    paths = sorted(
        {
            path
            for pattern in REQUIRED_GLOBS
            for path in root.glob(pattern)
            if path.is_file()
        }
    )
    files = [
        {
            "path": path.relative_to(root).as_posix(),
            "size": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        }
        for path in paths
    ]
    return {"source_root": str(root), "files": files}


def main() -> None:
    source = Path(__file__).resolve().parents[2] / "Delta Force"
    output = Path(__file__).resolve().parents[1] / "docs" / "delta-source-inventory.json"
    inventory = build_inventory(source)
    output.write_text(
        json.dumps(inventory, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
