import json
from zipfile import ZipFile

import pytest

from scripts.build_miniprogram_package import build_package, sha256_file


def source_fixture(tmp_path):
    source = tmp_path / "source"
    (source / "pages" / "home").mkdir(parents=True)
    (source / "utils").mkdir()
    (source / ".git").mkdir()
    (source / "app.js").write_text("App({})", encoding="utf-8")
    (source / "app.json").write_text(json.dumps({"pages": ["pages/home/home"]}), encoding="utf-8")
    (source / "app.wxss").write_text("page {}", encoding="utf-8")
    (source / "project.config.json").write_text(json.dumps({"appid": "touristappid"}), encoding="utf-8")
    (source / "README.md").write_text("导入说明", encoding="utf-8")
    (source / "pages" / "home" / "home.js").write_text("Page({})", encoding="utf-8")
    (source / "pages" / "home" / "home.wxml").write_text("<view />", encoding="utf-8")
    (source / "utils" / "runtime.js").write_text("module.exports = {}", encoding="utf-8")
    (source / "project.private.config.json").write_text("{}", encoding="utf-8")
    (source / ".git" / "config").write_text("private", encoding="utf-8")
    return source


def test_archive_contains_project_root_and_excludes_private_files(tmp_path):
    archive = build_package(source_fixture(tmp_path), tmp_path / "source.zip")

    with ZipFile(archive) as package:
        names = set(package.namelist())
        assert "app.js" in names
        assert "app.json" in names
        assert "project.config.json" in names
        assert "pages/home/home.js" in names
        assert "project.private.config.json" not in names
        assert not any(name.startswith(".git/") for name in names)


def test_archive_rejects_sensitive_identifiers_without_overwriting_valid_file(tmp_path):
    source = source_fixture(tmp_path)
    output = tmp_path / "source.zip"
    output.write_bytes(b"valid-old-package")
    (source / "app.js").write_text("const env = 'cloud9-privatevalue';", encoding="utf-8")

    with pytest.raises(ValueError, match="敏感标识"):
        build_package(source, output)

    assert output.read_bytes() == b"valid-old-package"


def test_archive_copy_has_same_checksum(tmp_path):
    output = tmp_path / "public" / "source.zip"
    copy = tmp_path / "website" / "source.zip"

    build_package(source_fixture(tmp_path), output, [copy])

    assert sha256_file(output) == sha256_file(copy)


def test_javascript_url_regex_is_not_mistaken_for_windows_path(tmp_path):
    source = source_fixture(tmp_path)
    (source / "app.js").write_text("const cloudPattern = /^cloud:\\/\\//i;", encoding="utf-8")

    archive = build_package(source, tmp_path / "source.zip")

    assert archive.is_file()


def test_real_windows_absolute_path_is_rejected(tmp_path):
    source = source_fixture(tmp_path)
    (source / "app.js").write_text("const privatePath = 'C:\\\\Users\\\\name\\\\file';", encoding="utf-8")

    with pytest.raises(ValueError, match="Windows 绝对路径"):
        build_package(source, tmp_path / "source.zip")
