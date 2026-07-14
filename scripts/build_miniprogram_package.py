import argparse
import hashlib
import os
import re
import shutil
import tempfile
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT_FILES = {
    ".gitignore",
    "app.js",
    "app.json",
    "app.wxss",
    "package.json",
    "project.config.json",
    "README.md",
    "sitemap.json",
}
ROOT_DIRECTORIES = {
    "cloudfunctions",
    "components",
    "config",
    "ec-canvas",
    "pages",
    "styles",
    "tabbar",
    "tests",
    "utils",
}
EXCLUDED_NAMES = {
    ".git",
    "node_modules",
    "miniprogram_npm",
    "project.private.config.json",
}
EXCLUDED_SUFFIXES = {".db", ".log", ".pyc", ".sqlite"}
TEXT_SUFFIXES = {".cjs", ".css", ".html", ".js", ".json", ".md", ".wxml", ".wxss", ".txt"}
SENSITIVE_PATTERNS = {
    "AppID": re.compile(r"wx[0-9a-fA-F]{16}"),
    "云环境 ID": re.compile(r"cloud[0-9]+-[A-Za-z0-9-]+"),
    "Windows 绝对路径": re.compile(r"[A-Za-z]:\\(?!/)(?:[^\r\n]+)"),
}


def included_files(source):
    source = Path(source).resolve()
    files = []
    for root_file in sorted(ROOT_FILES):
        path = source / root_file
        if path.is_file():
            files.append(path)
    for root_directory in sorted(ROOT_DIRECTORIES):
        directory = source / root_directory
        if not directory.is_dir():
            continue
        for path in sorted(directory.rglob("*")):
            if not path.is_file():
                continue
            relative = path.relative_to(source)
            if any(part in EXCLUDED_NAMES for part in relative.parts):
                continue
            if path.suffix.lower() in EXCLUDED_SUFFIXES:
                continue
            files.append(path)
    return files


def validate_source(source, files):
    source = Path(source).resolve()
    required = {"app.js", "app.json", "project.config.json", "README.md"}
    available = {path.relative_to(source).as_posix() for path in files}
    missing = sorted(required - available)
    if missing:
        raise ValueError(f"源码缺少必要文件：{', '.join(missing)}")

    findings = []
    for path in files:
        if path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        text = path.read_text(encoding="utf-8", errors="strict")
        for label, pattern in SENSITIVE_PATTERNS.items():
            if pattern.search(text):
                findings.append(f"{path.relative_to(source).as_posix()} ({label})")
    if findings:
        raise ValueError(f"发现敏感标识：{'; '.join(findings)}")


def sha256_file(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def build_package(source, output, copy_targets=None):
    source = Path(source).resolve()
    output = Path(output).resolve()
    files = included_files(source)
    validate_source(source, files)
    output.parent.mkdir(parents=True, exist_ok=True)

    handle, temporary_name = tempfile.mkstemp(prefix="miniprogram-", suffix=".zip", dir=output.parent)
    os.close(handle)
    temporary = Path(temporary_name)
    try:
        with ZipFile(temporary, "w", ZIP_DEFLATED, compresslevel=9) as archive:
            for path in files:
                archive.write(path, path.relative_to(source).as_posix())
        with ZipFile(temporary) as archive:
            if archive.testzip() is not None:
                raise ValueError("压缩包完整性检查失败")
        temporary.replace(output)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise

    for target in copy_targets or []:
        target_path = Path(target).resolve()
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(output, target_path)
        if sha256_file(target_path) != sha256_file(output):
            raise ValueError(f"复制后的压缩包校验失败：{target_path}")

    return output


def parse_args():
    parser = argparse.ArgumentParser(description="生成三平方奶茶店小程序脱敏源码包")
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--copy-to", action="append", default=[])
    return parser.parse_args()


def main():
    args = parse_args()
    output = build_package(args.source, args.output, args.copy_to)
    with ZipFile(output) as archive:
        file_count = len(archive.namelist())
    print(f"打包完成：{output}")
    print(f"文件数量：{file_count}")
    print(f"文件大小：{output.stat().st_size} 字节")
    print(f"SHA-256：{sha256_file(output)}")


if __name__ == "__main__":
    main()
