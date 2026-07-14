from pathlib import Path

from delta_companion.paths import resolve_paths
from delta_companion.__main__ import legacy_data_candidates


def test_development_paths_live_under_pp_tools(tmp_path: Path):
    paths = resolve_paths(project_root=tmp_path, frozen=False)

    assert paths.data_dir == tmp_path / "data" / "delta-companion"
    assert paths.database == paths.data_dir / "players.db"
    assert paths.calibration_dir == paths.data_dir / "calibration"
    assert paths.backup_dir == paths.data_dir / "backups"


def test_frozen_paths_use_local_app_data(tmp_path: Path):
    paths = resolve_paths(local_app_data=tmp_path, frozen=True)

    assert paths.data_dir == tmp_path / "PPTools" / "DeltaCompanion"


def test_frozen_executable_can_locate_sibling_legacy_project(tmp_path: Path):
    executable = tmp_path / "Coding" / "pp-tools" / "companion" / "dist" / "Delta-Companion.exe"

    candidates = legacy_data_candidates(executable=executable, environment={})

    assert tmp_path / "Coding" / "Delta Force" / "data" in candidates
