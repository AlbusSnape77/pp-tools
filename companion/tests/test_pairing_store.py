from delta_companion.pairing_store import PairingStore


def test_token_is_bound_to_exact_origin_and_not_saved_in_plain_text(tmp_path):
    path = tmp_path / "pairings.json"
    store = PairingStore(path)

    token = store.create("https://example.com")

    assert store.verify("https://example.com", token)
    assert not store.verify("https://evil.example", token)
    assert token not in path.read_text(encoding="utf-8")


def test_pairing_can_be_listed_and_revoked(tmp_path):
    store = PairingStore(tmp_path / "pairings.json")
    store.create("https://example.com")

    assert [item["origin"] for item in store.list_origins()] == ["https://example.com"]
    assert store.revoke("https://example.com")
    assert store.list_origins() == []
