import pytest

from delta_companion.security import (
    OriginPolicy,
    PairingCodeExpired,
    PairingCodeInvalid,
    PairingManager,
)
from delta_companion.config import load_allowed_origins


class FakeClock:
    def __init__(self):
        self.value = 1_000.0

    def __call__(self):
        return self.value


def test_pairing_code_is_six_digits_and_single_use():
    clock = FakeClock()
    manager = PairingManager(clock=clock, ttl_seconds=300)

    code = manager.issue_code()
    token = manager.exchange(code, "https://example.com")

    assert code.isdigit() and len(code) == 6
    assert len(token) >= 43
    with pytest.raises(PairingCodeInvalid):
        manager.exchange(code, "https://example.com")


def test_pairing_code_expires_after_five_minutes():
    clock = FakeClock()
    manager = PairingManager(clock=clock, ttl_seconds=300)
    code = manager.issue_code()

    clock.value += 301

    with pytest.raises(PairingCodeExpired):
        manager.exchange(code, "https://example.com")


def test_origin_policy_allows_exact_local_and_configured_origins():
    policy = OriginPolicy(["https://example.com"], local_ports=range(8787, 8798))

    assert policy.allows("http://127.0.0.1:8787")
    assert policy.allows("https://example.com")
    assert not policy.allows("https://example.com.evil.test")
    assert not policy.allows("null")


def test_allowed_origin_file_accepts_local_http_and_public_https(tmp_path):
    path = tmp_path / "allowed_origins.json"
    path.write_text(
        '{"allowed_origins":["http://127.0.0.1:8787","https://tools.example.com"]}',
        encoding="utf-8",
    )

    assert load_allowed_origins(path) == (
        "http://127.0.0.1:8787",
        "https://tools.example.com",
    )
