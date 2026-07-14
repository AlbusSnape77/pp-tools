from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(frozen=True)
class CompanionPaths:
    data_dir: Path
    database: Path
    calibration_dir: Path
    backup_dir: Path
    temp_dir: Path
    pairing_file: Path
    migration_file: Path


def resolve_paths(
    project_root: Path | None = None,
    local_app_data: Path | None = None,
    frozen: bool = False,
) -> CompanionPaths:
    if frozen:
        local_root = local_app_data or os.environ["LOCALAPPDATA"]
        base = Path(local_root) / "PPTools" / "DeltaCompanion"
    else:
        root = Path(project_root or Path(__file__).resolve().parents[2])
        base = root / "data" / "delta-companion"

    return CompanionPaths(
        data_dir=base,
        database=base / "players.db",
        calibration_dir=base / "calibration",
        backup_dir=base / "backups",
        temp_dir=base / "temp",
        pairing_file=base / "pairings.json",
        migration_file=base / "migration.json",
    )
