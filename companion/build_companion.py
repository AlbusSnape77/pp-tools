from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

import PyInstaller.__main__

from delta_companion import __version__
from delta_companion.config import API_VERSION, validate_allowed_origins


ROOT = Path(__file__).resolve().parent


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_release_manifest(
    executable: Path,
    *,
    version: str,
    api_version: int,
    allowed_origins: list[str],
) -> dict:
    return {
        "version": version,
        "api_version": api_version,
        "file": executable.name,
        "size": executable.stat().st_size,
        "sha256": file_sha256(executable),
        "allowed_origins": sorted(set(allowed_origins)),
    }


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def default_local_origins() -> list[str]:
    origins = [f"http://127.0.0.1:{port}" for port in range(8787, 8798)]
    origins.extend(["http://127.0.0.1:5176", "http://127.0.0.1:4176"])
    return origins


def build(*, allowed_origins: list[str], run_tests: bool = True) -> Path:
    allowed_origins = list(validate_allowed_origins(allowed_origins))
    if run_tests:
        subprocess.run(
            [sys.executable, "-m", "pytest", str(ROOT / "tests"), "-q"],
            cwd=ROOT.parent,
            check=True,
        )

    build_root = ROOT / "build"
    dist_root = ROOT / "dist"
    origins_file = build_root / "allowed_origins.json"
    write_json(origins_file, {"allowed_origins": allowed_origins})
    previous = os.environ.get("DELTA_ALLOWED_ORIGINS_FILE")
    os.environ["DELTA_ALLOWED_ORIGINS_FILE"] = str(origins_file)
    try:
        PyInstaller.__main__.run(
            [
                str(ROOT / "delta_companion.spec"),
                "--noconfirm",
                "--clean",
                f"--distpath={dist_root}",
                f"--workpath={build_root / 'pyinstaller'}",
            ]
        )
    finally:
        if previous is None:
            os.environ.pop("DELTA_ALLOWED_ORIGINS_FILE", None)
        else:
            os.environ["DELTA_ALLOWED_ORIGINS_FILE"] = previous

    executable = dist_root / "Delta-Companion.exe"
    if not executable.is_file():
        raise FileNotFoundError(f"Build output is missing: {executable}")
    manifest = build_release_manifest(
        executable,
        version=__version__,
        api_version=API_VERSION,
        allowed_origins=allowed_origins,
    )
    write_json(dist_root / "delta-companion-version.json", manifest)
    return executable


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Build Delta Companion")
    parser.add_argument("--allowed-origin", action="append", default=[])
    parser.add_argument("--skip-tests", action="store_true")
    args = parser.parse_args(argv)
    origins = default_local_origins() + list(args.allowed_origin)
    executable = build(allowed_origins=origins, run_tests=not args.skip_tests)
    print(executable)
    print(f"SHA-256: {file_sha256(executable)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
