from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
import threading

from waitress import serve

from . import __version__
from .app import create_app
from .config import API_VERSION, HOST, PORT
from .control_window import ControlWindowModel, run_control_window
from .migration import migrate_legacy_data
from .paths import CompanionPaths, resolve_paths
from .protocol import (
    parse_protocol_url,
    register_protocol,
    unregister_protocol,
)
from .single_instance import SingleInstance


def parse_args(argv=None):
    parser = argparse.ArgumentParser(prog="delta-companion")
    registry = parser.add_mutually_exclusive_group()
    registry.add_argument("--register-protocol", action="store_true")
    registry.add_argument("--unregister-protocol", action="store_true")
    parser.add_argument("--protocol")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--health-check", action="store_true")
    return parser.parse_args(argv)


def ensure_directories(paths: CompanionPaths) -> None:
    for path in (
        paths.data_dir,
        paths.calibration_dir,
        paths.backup_dir,
        paths.temp_dir,
    ):
        path.mkdir(parents=True, exist_ok=True)


def legacy_data_candidates(*, executable: Path | None = None, environment=None) -> list[Path]:
    environment = environment if environment is not None else os.environ
    candidates = []
    configured = environment.get("DELTA_LEGACY_DATA")
    if configured:
        candidates.append(Path(configured).resolve())
    if executable is not None:
        resolved = Path(executable).resolve()
        if len(resolved.parents) > 3:
            candidates.append(resolved.parents[3] / "Delta Force" / "data")
    candidates.append(Path(__file__).resolve().parents[3] / "Delta Force" / "data")
    unique = []
    for candidate in candidates:
        if candidate not in unique:
            unique.append(candidate)
    return unique


def migrate_if_needed(paths: CompanionPaths, *, executable: Path | None = None) -> None:
    if paths.migration_file.exists():
        return
    for source in legacy_data_candidates(executable=executable):
        if (source / "players.db").is_file():
            migrate_legacy_data(source, paths.data_dir)
            return


def main(argv=None) -> int:
    args = parse_args(argv)
    executable = Path(sys.executable)
    if args.health_check:
        print(json.dumps({"status": "ready", "version": __version__, "api_version": API_VERSION}))
        return 0
    if args.register_protocol:
        result = register_protocol(executable, dry_run=args.dry_run)
        if args.dry_run:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    if args.unregister_protocol:
        result = unregister_protocol(dry_run=args.dry_run)
        if args.dry_run:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    if args.protocol:
        parse_protocol_url(args.protocol)

    frozen = bool(getattr(sys, "frozen", False))
    paths = resolve_paths(frozen=frozen)
    ensure_directories(paths)
    migrate_if_needed(paths, executable=executable)
    if frozen:
        register_protocol(executable)

    with SingleInstance("Local\\PPTools.DeltaCompanion") as instance:
        if not instance.acquired:
            return 0
        app = create_app(
            {
                "DATABASE": paths.database,
                "PAIRING_FILE": paths.pairing_file,
                "CALIBRATION_DIR": paths.calibration_dir,
                "UPLOAD_DIR": paths.temp_dir / "uploads",
                "AUTO_CAPTURE_DIR": paths.temp_dir / "auto",
            }
        )
        service = threading.Thread(
            target=serve,
            kwargs={"app": app, "host": HOST, "port": PORT, "threads": 4},
            daemon=True,
        )
        service.start()
        model = ControlWindowModel(
            version=__version__,
            port=PORT,
            data_dir=paths.data_dir,
            pairing_manager=app.extensions["delta_pairing_manager"],
            pairing_store=app.extensions["delta_pairing_store"],
            job_queue=app.extensions["delta_job_queue"],
        )
        return run_control_window(model)


if __name__ == "__main__":
    raise SystemExit(main())
