from pathlib import Path

import pytest

from delta_companion.protocol import (
    InvalidProtocolUrl,
    ProtocolAction,
    build_protocol_command,
    parse_protocol_url,
    protocol_registry_values,
)
from delta_companion.__main__ import parse_args


def test_protocol_command_quotes_executable_path():
    command = build_protocol_command(
        Path(r"C:\Program Files\PP Tools\Delta Companion.exe")
    )

    assert command == (
        '"C:\\Program Files\\PP Tools\\Delta Companion.exe" --protocol "%1"'
    )


def test_protocol_url_only_accepts_start_action():
    assert parse_protocol_url("delta-stats://start") == ProtocolAction.START

    with pytest.raises(InvalidProtocolUrl):
        parse_protocol_url("delta-stats://run-command?value=calc")


def test_registry_plan_is_limited_to_current_user_protocol_keys():
    values = protocol_registry_values(Path(r"C:\Tools\Delta Companion.exe"))

    assert set(values) == {
        r"Software\Classes\delta-stats",
        r"Software\Classes\delta-stats\shell\open\command",
    }
    assert values[r"Software\Classes\delta-stats"]["URL Protocol"] == ""


def test_startup_arguments_support_safe_registry_preview():
    args = parse_args(["--register-protocol", "--dry-run"])

    assert args.register_protocol
    assert args.dry_run
    assert args.protocol is None


def test_startup_arguments_support_headless_health_check():
    args = parse_args(["--health-check"])

    assert args.health_check
