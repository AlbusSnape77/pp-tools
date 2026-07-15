import hashlib

from companion.build_companion import build_release_manifest, default_release_origins


def test_release_manifest_contains_exe_hash_and_api_version(tmp_path):
    executable = tmp_path / "Delta-Companion.exe"
    executable.write_bytes(b"binary")

    manifest = build_release_manifest(
        executable,
        version="1.0.0",
        api_version=1,
        allowed_origins=["http://127.0.0.1:8787"],
    )

    assert manifest == {
        "version": "1.0.0",
        "api_version": 1,
        "file": "Delta-Companion.exe",
        "size": 6,
        "sha256": hashlib.sha256(b"binary").hexdigest(),
        "allowed_origins": ["http://127.0.0.1:8787"],
    }


def test_default_release_origins_include_public_site():
    assert "https://albussnape77.github.io" in default_release_origins()
