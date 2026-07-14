# -*- mode: python ; coding: utf-8 -*-
import os

from PyInstaller.utils.hooks import collect_data_files, collect_submodules


companion_root = os.path.abspath(SPECPATH)
origins_file = os.environ["DELTA_ALLOWED_ORIGINS_FILE"]
datas = collect_data_files("rapidocr_onnxruntime", include_py_files=True)
datas.append((origins_file, "."))
hiddenimports = collect_submodules("rapidocr_onnxruntime") + [
    "onnxruntime",
    "pyclipper",
    "yaml",
    "six",
    "shapely",
    "shapely.geometry",
    "tkinter",
]

a = Analysis(
    [os.path.join(companion_root, "run_companion.py")],
    pathex=[companion_root],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["matplotlib", "PyQt5", "PySide6", "IPython"],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="Delta-Companion",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
)
