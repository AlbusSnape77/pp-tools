from __future__ import annotations

import hashlib
import secrets
import time
from urllib.parse import urlsplit


class OriginDenied(ValueError):
    pass


class PairingCodeInvalid(ValueError):
    pass


class PairingCodeExpired(ValueError):
    pass


def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_digest(token: str, salt: bytes) -> str:
    return hashlib.scrypt(
        token.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
    ).hex()


def normalize_origin(value: str) -> str:
    if not value or value == "null":
        raise OriginDenied("origin is required")
    parsed = urlsplit(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise OriginDenied("origin must use http or https")
    if parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment:
        raise OriginDenied("origin contains unsupported components")
    host = parsed.hostname.lower()
    port = parsed.port
    if (parsed.scheme == "http" and port == 80) or (
        parsed.scheme == "https" and port == 443
    ):
        port = None
    suffix = f":{port}" if port is not None else ""
    return f"{parsed.scheme}://{host}{suffix}"


class OriginPolicy:
    def __init__(self, configured_origins=(), *, local_ports=()):
        self._configured = {
            normalize_origin(origin) for origin in configured_origins
        }
        self._local_ports = {int(port) for port in local_ports}

    def allows(self, value: str) -> bool:
        try:
            origin = normalize_origin(value)
            parsed = urlsplit(origin)
        except (OriginDenied, ValueError):
            return False
        if origin in self._configured:
            return True
        return (
            parsed.scheme == "http"
            and parsed.hostname in {"127.0.0.1", "localhost"}
            and parsed.port in self._local_ports
        )


class PairingManager:
    def __init__(self, *, clock=time.time, ttl_seconds: float = 300):
        self._clock = clock
        self._ttl_seconds = ttl_seconds
        self._code: str | None = None
        self._issued_at: float | None = None

    def issue_code(self) -> str:
        self._code = f"{secrets.randbelow(1_000_000):06d}"
        self._issued_at = float(self._clock())
        return self._code

    def remaining_seconds(self) -> int:
        if self._issued_at is None:
            return 0
        remaining = self._ttl_seconds - (float(self._clock()) - self._issued_at)
        return max(0, int(remaining))

    def exchange(self, code: str, origin: str) -> str:
        normalize_origin(origin)
        if self._code is None or not secrets.compare_digest(str(code), self._code):
            raise PairingCodeInvalid("pairing code is invalid")
        if self._issued_at is None or float(self._clock()) - self._issued_at > self._ttl_seconds:
            self._code = None
            self._issued_at = None
            raise PairingCodeExpired("pairing code has expired")
        self._code = None
        self._issued_at = None
        return new_token()
