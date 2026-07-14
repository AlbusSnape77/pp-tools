from __future__ import annotations

import base64
from datetime import datetime, timezone
import hmac
import json
import os
from pathlib import Path
import secrets
import uuid

from .security import new_token, normalize_origin, token_digest


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class PairingStore:
    def __init__(self, path: str | Path):
        self.path = Path(path)

    def _load(self) -> list[dict]:
        if not self.path.is_file():
            return []
        value = json.loads(self.path.read_text(encoding="utf-8"))
        return list(value.get("pairings", []))

    def _save(self, pairings: list[dict]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_name(f".{self.path.name}.{uuid.uuid4().hex}.tmp")
        temporary.write_text(
            json.dumps({"version": 1, "pairings": pairings}, ensure_ascii=False, indent=2)
            + "\n",
            encoding="utf-8",
        )
        os.replace(temporary, self.path)

    def create(self, origin: str, token: str | None = None) -> str:
        normalized = normalize_origin(origin)
        issued_token = token or new_token()
        salt = secrets.token_bytes(16)
        now = _now()
        record = {
            "origin": normalized,
            "salt": base64.b64encode(salt).decode("ascii"),
            "digest": token_digest(issued_token, salt),
            "created_at": now,
            "last_used_at": None,
        }
        pairings = [
            item for item in self._load() if item.get("origin") != normalized
        ]
        pairings.append(record)
        self._save(pairings)
        return issued_token

    def verify(self, origin: str, token: str) -> bool:
        try:
            normalized = normalize_origin(origin)
        except ValueError:
            return False
        pairings = self._load()
        for item in pairings:
            if item.get("origin") != normalized:
                continue
            salt = base64.b64decode(item["salt"])
            expected = token_digest(token, salt)
            if not hmac.compare_digest(expected, item["digest"]):
                return False
            item["last_used_at"] = _now()
            self._save(pairings)
            return True
        return False

    def list_origins(self) -> list[dict]:
        return [
            {
                "origin": item["origin"],
                "created_at": item["created_at"],
                "last_used_at": item.get("last_used_at"),
            }
            for item in self._load()
        ]

    def revoke(self, origin: str) -> bool:
        normalized = normalize_origin(origin)
        pairings = self._load()
        remaining = [item for item in pairings if item.get("origin") != normalized]
        if len(remaining) == len(pairings):
            return False
        self._save(remaining)
        return True
