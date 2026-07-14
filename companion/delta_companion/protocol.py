from __future__ import annotations

from enum import Enum
from pathlib import Path
from urllib.parse import urlsplit


PROTOCOL_NAME = "delta-stats"
REGISTRY_ROOT = rf"Software\Classes\{PROTOCOL_NAME}"


class InvalidProtocolUrl(ValueError):
    pass


class ProtocolAction(Enum):
    START = "start"


def build_protocol_command(executable: Path) -> str:
    return f'"{executable}" --protocol "%1"'


def parse_protocol_url(value: str) -> ProtocolAction:
    parsed = urlsplit(value)
    if (
        parsed.scheme != PROTOCOL_NAME
        or parsed.netloc != "start"
        or parsed.path not in {"", "/"}
        or parsed.query
        or parsed.fragment
        or parsed.username
        or parsed.password
    ):
        raise InvalidProtocolUrl("unsupported protocol action")
    return ProtocolAction.START


def protocol_registry_values(executable: Path) -> dict[str, dict[str, str]]:
    return {
        REGISTRY_ROOT: {
            "": "URL:Delta Stats",
            "URL Protocol": "",
        },
        rf"{REGISTRY_ROOT}\shell\open\command": {
            "": build_protocol_command(executable),
        },
    }


def register_protocol(executable: Path, *, dry_run: bool = False) -> dict:
    values = protocol_registry_values(executable)
    if dry_run:
        return values
    import winreg

    for key_path, entries in values.items():
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path) as key:
            for name, value in entries.items():
                winreg.SetValueEx(key, name, 0, winreg.REG_SZ, value)
    return values


def unregister_protocol(*, dry_run: bool = False) -> list[str]:
    keys = [
        rf"{REGISTRY_ROOT}\shell\open\command",
        rf"{REGISTRY_ROOT}\shell\open",
        rf"{REGISTRY_ROOT}\shell",
        REGISTRY_ROOT,
    ]
    if dry_run:
        return keys
    import winreg

    removed = []
    for key_path in keys:
        try:
            winreg.DeleteKey(winreg.HKEY_CURRENT_USER, key_path)
            removed.append(key_path)
        except FileNotFoundError:
            continue
    return removed
