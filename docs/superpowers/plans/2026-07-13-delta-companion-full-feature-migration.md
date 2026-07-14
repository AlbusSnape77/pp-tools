# Delta Companion 原版功能迁移 Implementation Plan

> **执行要求：** 实施时必须使用 `executing-plans` 逐项执行。每个任务先写失败测试，再做最小实现并验证。提交和推送仅由用户在 GitHub Desktop 中操作。

**目标：** 把原 `Delta Force` 的自动游戏查询、OCR、任务、花名册和校准完整迁移到 PP Tools，并通过安全的便携 Companion 同时服务本机个人网站和未来公网网站。

**架构：** PP Tools 新增独立 `companion/` Python 包，承接原 Delta 的桌面自动化、数据库和本机版本化接口；React Delta 页面只通过 `DeltaCompanionClient` 通信。个人网站本机服务只负责按需启动 Companion，公网网站通过 `delta-stats://` 唤起并用 6 位码配对，所有私有数据留在 `127.0.0.1`。

**技术栈：** Python 3.14、Flask、SQLite、RapidOCR、OpenCV、PyAutoGUI、MSS、PyInstaller、React 18、Vite 5、Vitest、Testing Library、Node.js 内置测试、Windows HKCU 协议注册。

---

## 计划边界

本计划分为三个连续阶段，每个阶段结束时都得到可运行、可回归的软件：

1. **Companion 核心阶段：** 源码冻结、引擎迁移、数据迁移、数据库、安全和版本化接口。
2. **网页恢复阶段：** 自动查询、后端花名册、倒计时、任务进度、校准和三语界面。
3. **交付阶段：** 本机按需启动、协议唤起、便携 EXE、公网连接、浏览器和真实游戏验收。

不在阶段 1 完成前改写 React 查询主流程；不在安全接口完成前让公网网页调用桌面自动化。

## 文件结构

### PP Tools 新建目录与文件

- `companion/pyproject.toml`：Companion 包元数据、依赖和 pytest 配置。
- `companion/requirements.txt`：运行与构建依赖锁定入口。
- `companion/delta_companion/__init__.py`：版本号和公共入口。
- `companion/delta_companion/__main__.py`：命令行与 EXE 启动入口。
- `companion/delta_companion/app.py`：Flask 应用工厂和版本化路由注册。
- `companion/delta_companion/paths.py`：开发、打包和用户数据路径。
- `companion/delta_companion/codes.py`：稳定状态码、错误码和任务步骤。
- `companion/delta_companion/config.py`：端口、来源白名单、查询限制和版本配置。
- `companion/delta_companion/security.py`：配对码、令牌摘要、Origin 和 CORS 校验。
- `companion/delta_companion/pairing_store.py`：配对来源与令牌摘要持久化。
- `companion/delta_companion/migration.py`：原 Delta 数据一次性迁移、校验和回滚。
- `companion/delta_companion/store.py`：玩家档案 SQLite 存储。
- `companion/delta_companion/jobs.py`：单工作线程任务队列和状态。
- `companion/delta_companion/protocol.py`：`delta-stats://` HKCU 注册与解析。
- `companion/delta_companion/single_instance.py`：Windows 单实例锁。
- `companion/delta_companion/control_window.py`：配对码、来源管理、任务和退出窗口。
- `companion/delta_companion/engine/automate.py`：游戏自动操作。
- `companion/delta_companion/engine/classify.py`：截图页面分类。
- `companion/delta_companion/engine/imgio.py`：截图读写。
- `companion/delta_companion/engine/lookup.py`：四页档案合并。
- `companion/delta_companion/engine/notify.py`：Windows 通知。
- `companion/delta_companion/engine/ocr.py`：OCR 适配。
- `companion/delta_companion/engine/parse.py`：数据解析。
- `companion/delta_companion/routes/health.py`：健康、版本和能力接口。
- `companion/delta_companion/routes/pairing.py`：配对与撤销接口。
- `companion/delta_companion/routes/players.py`：花名册增删改查。
- `companion/delta_companion/routes/lookup.py`：自动与手动识别接口。
- `companion/delta_companion/routes/calibration.py`：截图和模板接口。
- `companion/tests/`：对应单元、接口、迁移和 Windows 行为测试。
- `companion/tests/fixtures/delta-samples/`：从原项目复制的真实截图与 OCR 回归素材。
- `companion/build_companion.py`：PyInstaller 构建脚本。
- `companion/delta_companion.spec`：稳定的 PyInstaller 配置。
- `scripts/inventory_delta_source.py`：原项目冻结清单与 SHA-256。
- `scripts/check_delta_companion.ps1`：构建产物、版本和安全检查。
- `frontend/src/api/deltaCompanionClient.js`：浏览器 Companion 客户端。
- `frontend/src/api/deltaCompanionClient.test.js`：客户端和错误映射测试。
- `frontend/src/tools/delta-force/useDeltaCompanion.js`：连接、配对和任务状态机。
- `frontend/src/tools/delta-force/DeltaConnectionPanel.jsx`：下载、唤起、配对和更新状态。
- `frontend/src/tools/delta-force/DeltaCountdown.jsx`：5 秒倒计时和取消。
- `frontend/src/tools/delta-force/DeltaTaskProgress.jsx`：稳定任务步骤和停止操作。
- `frontend/src/tools/delta-force/DeltaCalibrationPage.jsx`：站内校准页。
- `frontend/src/tools/delta-force/DeltaCalibrationPage.test.jsx`：校准交互测试。

### PP Tools 修改文件

- `frontend/src/embed/routes.js`：增加 `delta-force/calibration`。
- `frontend/src/embed/EmbeddedToolCenter.jsx`：分发校准页和 Companion 配置。
- `frontend/src/embed/index.jsx`：允许更新 `companionBaseUrl` 和下载地址。
- `frontend/src/i18n/messages.js`：补齐连接、配对、任务、校准和错误三语键。
- `frontend/src/tools/delta-force/DeltaForcePage.jsx`：恢复自动查询主流程和后端花名册。
- `frontend/src/tools/delta-force/DeltaCommandBar.jsx`：查询、停止、今日用量和校准。
- `frontend/src/tools/delta-force/DeltaUploadPanel.jsx`：调用 Companion 手动识别。
- `frontend/src/tools/delta-force/DeltaRoster.jsx`：读取 Companion 数据库结果。
- `frontend/src/tools/delta-force/DeltaDossier.jsx`：保存和删除走 Companion 接口。
- `frontend/src/tools/delta-force/deltaRecordStore.js`：仅保留旧浏览器数据导出迁移，不再作为主存储。
- `frontend/src/tools/delta-force/delta-force.css`：连接、倒计时、进度和校准响应式样式。
- `frontend/package.json`：增加 Companion 合同测试和打包同步命令。
- `scripts/sync_personal_site_embed.mjs`：同步 Companion 下载文件和版本清单。
- `scripts/check-project.ps1`：检查 Companion 源码、EXE、版本和 SHA-256。

### 个人网站修改与新建文件

- `local-server.js`：增加本机 Companion 检测和按需启动接口。
- `scripts/open-site.ps1`：保留只启动个人网站的行为，不提前启动 Companion。
- `js/software-routing.js`：支持 `#software/delta-force/calibration`。
- `js/app.js`：把 `companionBaseUrl` 和本机启动地址传入嵌入包。
- `tests/local-server.test.js`：按需启动、重复启动和失败测试。
- `tests/software-route.test.js`：校准子路由测试。
- `tools/pp-tools/downloads/Delta-Companion.exe`：同步生成的便携 EXE。
- `tools/pp-tools/downloads/delta-companion-version.json`：版本、大小和 SHA-256。

---

### 任务 1：冻结原 Delta 源码和行为清单

**文件：**

- 新建：`scripts/inventory_delta_source.py`
- 新建：`companion/tests/test_source_inventory.py`
- 新建生成：`docs/delta-source-inventory.json`

- [ ] **步骤 1：编写失败测试**

```python
from pathlib import Path

from scripts.inventory_delta_source import build_inventory


def test_inventory_records_required_engine_and_api_files(tmp_path: Path):
    source = tmp_path / "Delta Force"
    (source / "dfstats").mkdir(parents=True)
    (source / "web").mkdir()
    (source / "dfstats" / "automate.py").write_text("AUTO = 1", encoding="utf-8")
    (source / "dfstats" / "server.py").write_text("SERVER = 1", encoding="utf-8")
    (source / "web" / "app.js").write_text("const app = 1;", encoding="utf-8")

    inventory = build_inventory(source)

    assert inventory["source_root"] == str(source.resolve())
    assert {item["path"] for item in inventory["files"]} == {
        "dfstats/automate.py", "dfstats/server.py", "web/app.js"
    }
    assert all(len(item["sha256"]) == 64 for item in inventory["files"])
```

- [ ] **步骤 2：运行测试并确认失败**

运行：

```powershell
cd "E:\A Study\Coding\pp-tools"
backend\.venv\Scripts\python.exe -m pytest companion\tests\test_source_inventory.py -q
```

预期：失败，提示 `scripts.inventory_delta_source` 不存在。

- [ ] **步骤 3：实现冻结清单脚本**

```python
from __future__ import annotations

import hashlib
import json
from pathlib import Path

REQUIRED_GLOBS = ("dfstats/*.py", "web/*", "test_parse.py", "requirements.txt")


def build_inventory(source_root: Path) -> dict:
    root = source_root.resolve()
    paths = sorted({path for pattern in REQUIRED_GLOBS for path in root.glob(pattern) if path.is_file()})
    files = []
    for path in paths:
        files.append({
            "path": path.relative_to(root).as_posix(),
            "size": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        })
    return {"source_root": str(root), "files": files}


if __name__ == "__main__":
    source = Path(__file__).resolve().parents[2] / "Delta Force"
    output = Path(__file__).resolve().parents[1] / "docs" / "delta-source-inventory.json"
    output.write_text(json.dumps(build_inventory(source), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
```

- [ ] **步骤 4：生成清单并验证原项目未被修改**

运行：

```powershell
backend\.venv\Scripts\python.exe scripts\inventory_delta_source.py
git -C "E:\A Study\Coding\Delta Force" status --short
```

预期：清单生成；原项目状态与执行前一致，不出现新文件。

- [ ] **步骤 5：GitHub Desktop 检查点**

确认只新增清单脚本、测试和生成清单。建议摘要：`chore: inventory legacy delta source`。

---

### 任务 2：建立 Companion 包、路径和稳定状态代码

**文件：**

- 新建：`companion/pyproject.toml`
- 新建：`companion/requirements.txt`
- 新建：`companion/delta_companion/__init__.py`
- 新建：`companion/delta_companion/codes.py`
- 新建：`companion/delta_companion/paths.py`
- 新建：`companion/delta_companion/config.py`
- 新建：`companion/tests/test_paths.py`
- 新建：`companion/tests/test_codes.py`

- [ ] **步骤 1：编写路径失败测试**

```python
from pathlib import Path

from delta_companion.paths import resolve_paths


def test_development_paths_live_under_pp_tools(tmp_path: Path):
    paths = resolve_paths(project_root=tmp_path, frozen=False)
    assert paths.data_dir == tmp_path / "data" / "delta-companion"
    assert paths.database == paths.data_dir / "players.db"
    assert paths.calibration_dir == paths.data_dir / "calibration"
    assert paths.backup_dir == paths.data_dir / "backups"


def test_frozen_paths_use_local_app_data(tmp_path: Path):
    paths = resolve_paths(local_app_data=tmp_path, frozen=True)
    assert paths.data_dir == tmp_path / "PPTools" / "DeltaCompanion"
```

- [ ] **步骤 2：编写代码集合失败测试**

```python
from delta_companion.codes import ERROR_CODES, JOB_STEPS


def test_codes_are_stable_and_unique():
    assert JOB_STEPS == (
        "prepare_game", "open_social", "type_query", "search", "open_result",
        "capture_home", "capture_overview", "capture_ranked", "capture_recent",
        "ocr", "store",
    )
    assert len(ERROR_CODES) == len(set(ERROR_CODES))
    assert "game_not_running" in ERROR_CODES
    assert "calibration_required" in ERROR_CODES
```

- [ ] **步骤 3：运行测试并确认失败**

运行：

```powershell
cd companion
..\backend\.venv\Scripts\python.exe -m pytest tests\test_paths.py tests\test_codes.py -q
```

预期：失败，提示 `delta_companion` 不存在。

- [ ] **步骤 4：实现路径和状态代码**

`codes.py`：

```python
JOB_STEPS = (
    "prepare_game", "open_social", "type_query", "search", "open_result",
    "capture_home", "capture_overview", "capture_ranked", "capture_recent",
    "ocr", "store",
)

ERROR_CODES = (
    "companion_unavailable", "pairing_required", "pairing_code_invalid",
    "pairing_code_expired", "origin_denied", "token_invalid", "version_incompatible",
    "game_not_running", "player_not_found", "calibration_required",
    "automation_failed", "ocr_empty", "daily_limit_reached", "job_cancelled",
)
```

`paths.py` 使用不可变数据类：

```python
from dataclasses import dataclass
from pathlib import Path
import os


@dataclass(frozen=True)
class CompanionPaths:
    data_dir: Path
    database: Path
    calibration_dir: Path
    backup_dir: Path
    temp_dir: Path
    pairing_file: Path
    migration_file: Path


def resolve_paths(project_root=None, local_app_data=None, frozen=False):
    if frozen:
        base = Path(local_app_data or os.environ["LOCALAPPDATA"]) / "PPTools" / "DeltaCompanion"
    else:
        root = Path(project_root or Path(__file__).resolve().parents[2])
        base = root / "data" / "delta-companion"
    return CompanionPaths(
        data_dir=base,
        database=base / "players.db",
        calibration_dir=base / "calibration",
        backup_dir=base / "backups",
        temp_dir=base / "temp",
        pairing_file=base / "pairings.json",
        migration_file=base / "migration.json",
    )
```

- [ ] **步骤 5：运行测试**

先把 Companion 以可编辑模式安装到项目现有 Python 环境，后续无论从仓库根目录还是 `companion` 目录运行，都使用同一份源码：

```powershell
backend\.venv\Scripts\python.exe -m pip install -e companion
backend\.venv\Scripts\python.exe -m pytest companion\tests\test_paths.py companion\tests\test_codes.py -q
```

预期：全部通过。

- [ ] **步骤 6：GitHub Desktop 检查点**

建议摘要：`feat: scaffold delta companion core`。

---

### 任务 3：迁移原版 OCR、解析和自动操作引擎

**文件：**

- 新建：`companion/delta_companion/engine/*.py`
- 新建：`companion/tests/test_engine_parse.py`
- 新建：`companion/tests/test_engine_lookup.py`
- 新建：`companion/tests/test_engine_automation_contract.py`
- 参考只读：`E:/A Study/Coding/Delta Force/dfstats/*.py`
- 参考只读：`E:/A Study/Coding/Delta Force/test_parse.py`

- [ ] **步骤 1：移植原解析测试并改为新导入路径**

```python
from delta_companion.engine.classify import classify
from delta_companion.engine import parse


def test_real_overview_sample_keeps_original_values(sample_ocr, sample_dimensions):
    roles = {classify(tokens): name for name, tokens in sample_ocr.items()}
    name = roles["overview"]
    width, height = sample_dimensions(name)
    result = parse.parse_overview(sample_ocr[name], width, height)
    assert result["matches"] == 853
    assert result["escape_rate"] == "35.3%"
    assert result["carry_value"] == "987.7M"
```

把原 `test_parse.py` 的真实截图、`samples/ocr_result.json` 和每一个有效断言移植到 pytest fixture；只把 `dfstats` 导入改成 `delta_companion.engine`，不得删减分类、总览、排位、近期战局、段位和主页断言。测试素材复制到 `companion/tests/fixtures/delta-samples/`，不能继续依赖原项目路径。

- [ ] **步骤 2：编写自动操作接口合同测试**

```python
from inspect import signature
from delta_companion.engine.automate import run_auto_lookup


def test_run_auto_lookup_keeps_progress_and_cancel_contract():
    parameters = signature(run_auto_lookup).parameters
    assert tuple(parameters) == (
        "query", "calib_dir", "save_dir", "on_progress", "lead_seconds", "on_capture"
    )
```

再为原版取消机制增加行为测试：调用 `request_cancel()` 后，自动操作在下一个检查点抛出 `LookupCancelled`；调用 `clear_cancel()` 后新任务可以继续。测试必须替换截图、窗口聚焦、鼠标和键盘模块，禁止在自动测试中真的操作桌面。

- [ ] **步骤 3：运行测试并确认失败**

运行：

```powershell
backend\.venv\Scripts\python.exe -m pytest companion\tests\test_engine_parse.py companion\tests\test_engine_lookup.py companion\tests\test_engine_automation_contract.py -q
```

预期：失败，提示引擎模块不存在。

- [ ] **步骤 4：复制并适配原版引擎**

逐文件复制以下源码，保持算法和常量不变，只修改包内导入和路径注入：

```text
dfstats/automate.py -> companion/delta_companion/engine/automate.py
dfstats/classify.py -> companion/delta_companion/engine/classify.py
dfstats/imgio.py    -> companion/delta_companion/engine/imgio.py
dfstats/lookup.py   -> companion/delta_companion/engine/lookup.py
dfstats/notify.py   -> companion/delta_companion/engine/notify.py
dfstats/ocr.py      -> companion/delta_companion/engine/ocr.py
dfstats/parse.py    -> companion/delta_companion/engine/parse.py
```

保持原版 `run_auto_lookup` 的参数和操作顺序，保留 `request_cancel()`、`clear_cancel()`、`LookupCancelled` 与内部 `_ck()` 检查点：

```python
def run_auto_lookup(query, calib_dir, save_dir, on_progress=_noop,
                    lead_seconds=5.0, on_capture=None):
    # 原版每个步骤边界和等待循环都通过 _ck() 响应 request_cancel()。
    ...
```

取消状态由任务队列在启动任务前调用 `clear_cancel()`，收到停止请求时调用 `request_cancel()`；不要再引入第二套取消参数，避免网页停止按钮与原版自动操作状态不一致。

- [ ] **步骤 5：安装缺失的桌面依赖**

在 `companion/requirements.txt` 固定：

```text
Flask>=3.1,<4
rapidocr-onnxruntime>=1.2,<2
opencv-python>=4.10,<5
pyautogui>=0.9,<1
mss>=9,<11
waitress>=3,<4
pyinstaller>=6,<7
```

运行：

```powershell
backend\.venv\Scripts\python.exe -m pip install -r companion\requirements.txt
```

- [ ] **步骤 6：运行原版与新引擎解析回归**

运行：

```powershell
python "E:\A Study\Coding\Delta Force\test_parse.py"
backend\.venv\Scripts\python.exe -m pytest companion\tests\test_engine_parse.py companion\tests\test_engine_lookup.py companion\tests\test_engine_automation_contract.py -q
```

预期：两组测试全部通过。

- [ ] **步骤 7：GitHub Desktop 检查点**

确认原 `Delta Force` 仓库没有变化。建议摘要：`feat: migrate delta recognition engine`。

---

### 任务 4：实现玩家数据库和一次性数据迁移

**文件：**

- 新建：`companion/delta_companion/store.py`
- 新建：`companion/delta_companion/migration.py`
- 新建：`companion/tests/test_store.py`
- 新建：`companion/tests/test_migration.py`

- [ ] **步骤 1：编写数据库兼容失败测试**

```python
from delta_companion.store import connect, search, upsert_snapshot


def test_store_reads_and_updates_legacy_player_shape(tmp_path):
    connection = connect(tmp_path / "players.db")
    stored = upsert_snapshot(connection, "追风君子", {"home": {"uid": "123"}})
    assert stored["nickname"] == "追风君子"
    assert search(connection, "123")[0]["id"] == stored["id"]
```

- [ ] **步骤 2：编写迁移成功、重复执行和失败回滚测试**

```python
def test_migration_copies_database_and_calibration_once(tmp_path):
    source = make_legacy_data(tmp_path / "source")
    target = tmp_path / "target"
    first = migrate_legacy_data(source, target)
    second = migrate_legacy_data(source, target)
    assert first.status == "completed"
    assert second.status == "already_completed"
    assert sha256(source / "players.db") == sha256(target / "players.db")
    assert (target / "calibration" / "social.png").exists()


def test_failed_validation_preserves_existing_target(tmp_path):
    target = make_current_data(tmp_path / "target")
    before = sha256(target / "players.db")
    with pytest.raises(MigrationValidationError):
        migrate_legacy_data(make_invalid_data(tmp_path / "source"), target)
    assert sha256(target / "players.db") == before
```

- [ ] **步骤 3：运行测试并确认失败**

运行：`backend\.venv\Scripts\python.exe -m pytest companion\tests\test_store.py companion\tests\test_migration.py -q`  
预期：失败，提示存储和迁移模块不存在。

- [ ] **步骤 4：移植原 `store.py` 并参数化数据库路径**

所有函数接收显式连接或路径，不读取原项目全局目录：

```python
def connect(database_path):
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    ensure_schema(connection)
    return connection
```

- [ ] **步骤 5：实现原子迁移**

迁移实现必须使用临时目录和 `os.replace`，迁移清单包含：

```python
manifest = {
    "version": 1,
    "source": str(source.resolve()),
    "completed_at": datetime.now(timezone.utc).isoformat(),
    "files": [{"path": relative, "size": size, "sha256": digest} for ...],
}
```

只在数据库 `PRAGMA integrity_check` 返回 `ok`、必要表存在且文件哈希匹配后写入完成标记。

- [ ] **步骤 6：使用原数据执行只读预演**

运行：

```powershell
backend\.venv\Scripts\python.exe -m delta_companion.migration `
  --source "E:\A Study\Coding\Delta Force\data" `
  --target "E:\A Study\Coding\pp-tools\companion\data\migration-preview" `
  --dry-run
```

预期：输出待复制文件、档案数、模板数和校验值，不修改来源和正式目标。

- [ ] **步骤 7：运行测试**

预期：`test_store.py` 和 `test_migration.py` 全部通过。

- [ ] **步骤 8：GitHub Desktop 检查点**

建议摘要：`feat: migrate delta data safely`。

---

### 任务 5：实现配对码、令牌和来源白名单

**文件：**

- 新建：`companion/delta_companion/security.py`
- 新建：`companion/delta_companion/pairing_store.py`
- 新建：`companion/tests/test_security.py`
- 新建：`companion/tests/test_pairing_store.py`

- [ ] **步骤 1：编写配对和令牌失败测试**

```python
def test_pairing_code_is_six_digits_single_use_and_expires(fake_clock):
    manager = PairingManager(clock=fake_clock, ttl_seconds=300)
    code = manager.issue_code()
    assert code.isdigit() and len(code) == 6
    token = manager.exchange(code, "https://example.com")
    assert len(token) >= 43
    with pytest.raises(PairingCodeInvalid):
        manager.exchange(code, "https://example.com")


def test_token_is_bound_to_exact_origin(tmp_path):
    store = PairingStore(tmp_path / "pairings.json")
    token = store.create("https://example.com")
    assert store.verify("https://example.com", token)
    assert not store.verify("https://evil.example", token)
    assert token not in (tmp_path / "pairings.json").read_text("utf-8")
```

- [ ] **步骤 2：编写 CORS 白名单失败测试**

```python
def test_origin_policy_allows_exact_local_and_configured_origins():
    policy = OriginPolicy(["https://example.com"], local_ports=range(8787, 8798))
    assert policy.allows("http://127.0.0.1:8787")
    assert policy.allows("https://example.com")
    assert not policy.allows("https://example.com.evil.test")
    assert not policy.allows("null")
```

- [ ] **步骤 3：运行测试并确认失败**

运行：`backend\.venv\Scripts\python.exe -m pytest companion\tests\test_security.py companion\tests\test_pairing_store.py -q`  
预期：失败，提示安全模块不存在。

- [ ] **步骤 4：实现安全模块**

核心规则：

```python
def new_token():
    return secrets.token_urlsafe(32)


def token_digest(token, salt):
    return hashlib.scrypt(token.encode(), salt=salt, n=2**14, r=8, p=1).hex()


def normalize_origin(value):
    parsed = urlsplit(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise OriginDenied()
    return f"{parsed.scheme}://{parsed.hostname}{':' + str(parsed.port) if parsed.port else ''}"
```

配对文件只保存 `origin`、随机 `salt`、摘要、创建时间和最后使用时间。写入使用临时文件加 `os.replace`。

- [ ] **步骤 5：运行安全测试**

预期：全部通过，并验证配对文件中不存在明文 token。

- [ ] **步骤 6：GitHub Desktop 检查点**

建议摘要：`feat: secure companion pairing`。

---

### 任务 6：建立版本化 Companion API

**文件：**

- 新建：`companion/delta_companion/app.py`
- 新建：`companion/delta_companion/routes/health.py`
- 新建：`companion/delta_companion/routes/pairing.py`
- 新建：`companion/delta_companion/routes/players.py`
- 新建：`companion/delta_companion/routes/lookup.py`
- 新建：`companion/delta_companion/routes/calibration.py`
- 新建：`companion/tests/test_api_security.py`
- 新建：`companion/tests/test_api_players.py`
- 新建：`companion/tests/test_api_lookup.py`
- 新建：`companion/tests/test_api_calibration.py`

- [ ] **步骤 1：编写健康和未授权失败测试**

```python
def test_health_is_public_but_players_require_origin_and_token(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json["version"] == "1.0.0"
    assert response.json["api_version"] == 1

    denied = client.get("/api/v1/players", headers={"Origin": "https://example.com"})
    assert denied.status_code == 401
    assert denied.json == {"error": {"code": "token_invalid"}}
```

- [ ] **步骤 2：编写预检和来源失败测试**

```python
def test_preflight_only_grants_allowed_origin(client):
    allowed = client.options("/api/v1/players", headers={
        "Origin": "https://example.com",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type",
        "Access-Control-Request-Private-Network": "true",
    })
    assert allowed.headers["Access-Control-Allow-Origin"] == "https://example.com"
    assert allowed.headers["Access-Control-Allow-Private-Network"] == "true"
    denied = client.options("/api/v1/players", headers={"Origin": "https://evil.test"})
    assert "Access-Control-Allow-Origin" not in denied.headers
```

- [ ] **步骤 3：编写玩家和手动识别合同测试**

```python
def test_authorized_player_crud_and_manual_lookup(authorized_client, image_files):
    result = authorized_client.post("/api/v1/manual-lookup", data={"images": image_files})
    assert result.status_code == 200
    player_id = result.json["player"]["id"]
    assert authorized_client.get(f"/api/v1/players/{player_id}").status_code == 200
    assert authorized_client.put(f"/api/v1/players/{player_id}", json={"note": "重点观察"}).json["note"] == "重点观察"
    assert authorized_client.delete(f"/api/v1/players/{player_id}").status_code == 204
```

- [ ] **步骤 4：运行接口测试并确认失败**

运行：`backend\.venv\Scripts\python.exe -m pytest companion\tests\test_api_*.py -q`  
预期：失败，提示应用工厂和路由不存在。

- [ ] **步骤 5：实现应用工厂和统一错误结构**

```python
def create_app(config=None):
    app = Flask(__name__)
    app.config.from_mapping(DEFAULT_CONFIG)
    if config:
        app.config.update(config)
    register_security(app)
    app.register_blueprint(health_blueprint, url_prefix="/api/v1")
    app.register_blueprint(pairing_blueprint, url_prefix="/api/v1")
    app.register_blueprint(players_blueprint, url_prefix="/api/v1")
    app.register_blueprint(lookup_blueprint, url_prefix="/api/v1")
    app.register_blueprint(calibration_blueprint, url_prefix="/api/v1")
    return app
```

所有错误使用：

```json
{"error":{"code":"game_not_running","details":{}}}
```

- [ ] **步骤 6：运行接口测试**

预期：安全、玩家、手动识别和校准接口测试全部通过。

- [ ] **步骤 7：GitHub Desktop 检查点**

建议摘要：`feat: add versioned companion api`。

---

### 任务 7：迁移单工作线程自动查询任务

**文件：**

- 新建：`companion/delta_companion/jobs.py`
- 新建：`companion/tests/test_jobs.py`
- 修改：`companion/delta_companion/routes/lookup.py`
- 修改：`companion/delta_companion/codes.py`

- [ ] **步骤 1：编写任务完成和步骤进度失败测试**

```python
def test_job_reports_stable_steps_and_stores_player(fake_engine, store, fake_clock):
    queue = JobQueue(engine=fake_engine, store=store, clock=fake_clock, min_interval=(0, 0))
    job_id = queue.submit("123456")
    job = wait_until_terminal(queue, job_id)
    assert job["state"] == "done"
    assert [entry["step"] for entry in job["history"]] == list(JOB_STEPS)
    assert job["player"]["uid"] == "123456"
```

- [ ] **步骤 2：编写取消、每日限制和单线程失败测试**

```python
def test_cancelled_job_stops_engine_and_releases_worker(fake_engine):
    queue = JobQueue(engine=fake_engine.blocking(), daily_limit=10)
    job_id = queue.submit("player")
    queue.cancel(job_id)
    assert wait_until_terminal(queue, job_id)["state"] == "cancelled"
    assert fake_engine.cancel_observed


def test_daily_limit_uses_local_calendar(fake_clock):
    queue = JobQueue(engine=instant_engine(), daily_limit=1, clock=fake_clock)
    assert wait_until_terminal(queue, queue.submit("one"))["state"] == "done"
    assert wait_until_terminal(queue, queue.submit("two"))["error"]["code"] == "daily_limit_reached"
```

- [ ] **步骤 3：运行测试并确认失败**

运行：`backend\.venv\Scripts\python.exe -m pytest companion\tests\test_jobs.py -q`  
预期：失败，提示 `JobQueue` 不存在。

- [ ] **步骤 4：移植原任务行为并改为依赖注入**

```python
class JobQueue:
    def __init__(self, engine, store, clock=time, daily_limit=30, min_interval=(8, 16)):
        self.engine = engine
        self.store = store
        self.clock = clock
        self.daily_limit = daily_limit
        self.min_interval = min_interval
        self._queue = Queue()
        self._jobs = {}
```

保留原版一个 worker、随机查询间隔、每日限制、取消标志和通知；任务对外只暴露稳定 `state`、`step`、`history`、`error.code`、`player` 和时间字段。

- [ ] **步骤 5：接入路由**

实现：

```text
POST /api/v1/auto-lookup
GET  /api/v1/jobs/{job_id}
POST /api/v1/jobs/{job_id}/cancel
GET  /api/v1/jobs
GET  /api/v1/usage
```

- [ ] **步骤 6：运行任务和接口测试**

运行：

```powershell
backend\.venv\Scripts\python.exe -m pytest companion\tests\test_jobs.py companion\tests\test_api_lookup.py -q
```

预期：全部通过。

- [ ] **步骤 7：GitHub Desktop 检查点**

建议摘要：`feat: restore automatic delta jobs`。

---

### 任务 8：实现单实例、协议注册和 Companion 控制窗口

**文件：**

- 新建：`companion/delta_companion/single_instance.py`
- 新建：`companion/delta_companion/protocol.py`
- 新建：`companion/delta_companion/control_window.py`
- 新建：`companion/delta_companion/__main__.py`
- 新建：`companion/tests/test_protocol.py`
- 新建：`companion/tests/test_single_instance.py`
- 新建：`companion/tests/test_control_window_model.py`

- [ ] **步骤 1：编写协议注册失败测试**

```python
def test_protocol_command_quotes_executable_path():
    command = build_protocol_command(Path(r"C:\Program Files\PP Tools\Delta Companion.exe"))
    assert command == '"C:\\Program Files\\PP Tools\\Delta Companion.exe" --protocol "%1"'


def test_protocol_url_only_accepts_start_action():
    assert parse_protocol_url("delta-stats://start") == ProtocolAction.START
    with pytest.raises(InvalidProtocolUrl):
        parse_protocol_url("delta-stats://run-command?value=calc")
```

- [ ] **步骤 2：编写单实例失败测试**

```python
def test_second_instance_notifies_existing_instance(fake_mutex, fake_notifier):
    first = SingleInstance("PPTools.DeltaCompanion", fake_mutex, fake_notifier)
    assert first.acquire()
    second = SingleInstance("PPTools.DeltaCompanion", fake_mutex, fake_notifier)
    assert not second.acquire()
    assert fake_notifier.start_requested
```

- [ ] **步骤 3：运行测试并确认失败**

运行：`backend\.venv\Scripts\python.exe -m pytest companion\tests\test_protocol.py companion\tests\test_single_instance.py companion\tests\test_control_window_model.py -q`  
预期：失败，提示 Windows 模块不存在。

- [ ] **步骤 4：实现 HKCU 协议注册**

注册位置：

```text
HKCU\Software\Classes\delta-stats
HKCU\Software\Classes\delta-stats\shell\open\command
```

根键写入 `URL Protocol` 空值，命令只允许当前 EXE 加 `--protocol "%1"`。卸载操作只删除当前用户的 `delta-stats` 键。

- [ ] **步骤 5：实现控制窗口模型**

窗口只显示和操作：

- 服务状态和版本。
- 当前 6 位配对码与剩余时间。
- 已配对来源列表和撤销按钮。
- 当前任务、停止任务。
- 打开数据目录。
- 注册或移除协议。
- 退出 Companion。

窗口层调用独立模型，不在 Tkinter 回调中直接读写配对文件或任务队列。

- [ ] **步骤 6：实现启动入口**

```python
def main(argv=None):
    args = parse_args(argv)
    paths = resolve_paths(frozen=getattr(sys, "frozen", False))
    ensure_directories(paths)
    migrate_if_needed(paths)
    register_protocol_if_requested(args, Path(sys.executable))
    with SingleInstance("PPTools.DeltaCompanion") as instance:
        if not instance.acquired:
            instance.request_start()
            return 0
        return run_service_and_window(paths, protocol_url=args.protocol)
```

- [ ] **步骤 7：运行测试和 Windows 注册预演**

测试使用临时注册表适配器，不修改真实注册表。通过后运行 `--register-protocol --dry-run`，预期只打印将写入的键和值。

- [ ] **步骤 8：GitHub Desktop 检查点**

建议摘要：`feat: add companion desktop lifecycle`。

---

### 任务 9：实现浏览器 Companion 客户端和连接状态机

**文件：**

- 新建：`frontend/src/api/deltaCompanionClient.js`
- 新建：`frontend/src/api/deltaCompanionClient.test.js`
- 新建：`frontend/src/tools/delta-force/useDeltaCompanion.js`
- 新建：`frontend/src/tools/delta-force/useDeltaCompanion.test.jsx`
- 新建：`frontend/src/tools/delta-force/DeltaConnectionPanel.jsx`
- 修改：`frontend/src/i18n/messages.js`

- [ ] **步骤 1：编写客户端失败测试**

```javascript
it("sends origin-bound bearer token and maps companion error codes", async () => {
  localStorage.setItem("pp-tools.delta.token:https://example.com", "secret-token");
  fetch.mockResolvedValue(new Response(JSON.stringify({ error: { code: "game_not_running" } }), {
    status: 409,
    headers: { "Content-Type": "application/json" },
  }));
  const client = createDeltaCompanionClient({ baseUrl: "http://127.0.0.1:5174", siteOrigin: "https://example.com" });
  await expect(client.autoLookup("player")).rejects.toMatchObject({ code: "game_not_running" });
  expect(fetch).toHaveBeenCalledWith(
    "http://127.0.0.1:5174/api/v1/auto-lookup",
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer secret-token" }) }),
  );
});
```

- [ ] **步骤 2：编写状态机失败测试**

```jsx
it("moves from unavailable through launch and pairing to ready", async () => {
  const client = fakeClient({ health: [offline(), online({ paired: false }), online({ paired: true })] });
  const { result } = renderHook(() => useDeltaCompanion({ client, protocolUrl: "delta-stats://start" }));
  await waitFor(() => expect(result.current.state).toBe("unavailable"));
  act(() => result.current.launch());
  expect(window.location.href).toContain("delta-stats://start");
  await act(() => result.current.pair("123456"));
  expect(result.current.state).toBe("ready");
});
```

- [ ] **步骤 3：运行测试并确认失败**

运行：

```powershell
cd frontend
npm test -- --run src/api/deltaCompanionClient.test.js src/tools/delta-force/useDeltaCompanion.test.jsx
```

预期：失败，提示客户端和 hook 不存在。

- [ ] **步骤 4：实现客户端**

公共方法固定为：

```javascript
return {
  health, pair, revokePairing, listPlayers, getPlayer, updatePlayer, deletePlayer,
  manualLookup, autoLookup, getJob, cancelJob, getUsage,
  getCalibration, getScreenshot, saveCalibration, deleteCalibration,
};
```

请求优先构造 `Request` 并在浏览器支持时设置 `targetAddressSpace: "loopback"`；不支持时删除该选项重试一次。HTTP 错误转换为 `{ code, details, status }`。

- [ ] **步骤 5：实现连接状态机**

状态只允许：

```text
checking, unavailable, launching, permission_denied, pairing_required,
pairing, ready, version_incompatible, error
```

状态机不保存玩家数据，不负责查询任务。

- [ ] **步骤 6：实现三语连接面板**

覆盖下载、运行、协议唤起、重新检测、6 位码输入、权限拒绝、版本更新和撤销配对。新增字典键后运行三语叶子键一致性测试。

- [ ] **步骤 7：运行测试**

预期：客户端、状态机、连接面板和语言测试全部通过。

- [ ] **步骤 8：GitHub Desktop 检查点**

建议摘要：`feat: connect web to delta companion`。

---

### 任务 10：恢复自动查询、任务进度和后端花名册

**文件：**

- 新建：`frontend/src/tools/delta-force/DeltaCountdown.jsx`
- 新建：`frontend/src/tools/delta-force/DeltaTaskProgress.jsx`
- 修改：`frontend/src/tools/delta-force/DeltaForcePage.jsx`
- 修改：`frontend/src/tools/delta-force/DeltaCommandBar.jsx`
- 修改：`frontend/src/tools/delta-force/DeltaUploadPanel.jsx`
- 修改：`frontend/src/tools/delta-force/DeltaRoster.jsx`
- 修改：`frontend/src/tools/delta-force/DeltaDossier.jsx`
- 修改：`frontend/src/tools/delta-force/DeltaForcePage.test.jsx`

- [ ] **步骤 1：编写 5 秒倒计时失败测试**

```jsx
it("waits five seconds before submitting and can cancel", async () => {
  vi.useFakeTimers();
  const onComplete = vi.fn();
  const onCancel = vi.fn();
  render(<DeltaCountdown seconds={5} onComplete={onComplete} onCancel={onCancel} />);
  expect(screen.getByText("5")).toBeInTheDocument();
  await vi.advanceTimersByTimeAsync(4000);
  expect(onComplete).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "取消" }));
  await vi.advanceTimersByTimeAsync(2000);
  expect(onComplete).not.toHaveBeenCalled();
  expect(onCancel).toHaveBeenCalledOnce();
});
```

- [ ] **步骤 2：编写完整自动查询失败测试**

```jsx
it("submits an automatic lookup, polls progress, and opens the stored player", async () => {
  const client = fakeCompanionClient()
    .withPlayers([])
    .withAutoLookup({ job_id: "job-1" })
    .withJobSequence([
      { state: "running", step: "type_query" },
      { state: "running", step: "capture_recent" },
      { state: "done", step: "store", player: recognizedPlayer },
    ]);
  render(<DeltaForcePage companionClient={client} countdownSeconds={0} />);
  await userEvent.type(screen.getByPlaceholderText("输入对方昵称或编号(UID)，回车查询"), "123456");
  await userEvent.click(screen.getByRole("button", { name: "查询" }));
  expect(await screen.findByText("输入昵称或 UID")).toBeInTheDocument();
  expect(await screen.findByDisplayValue(recognizedPlayer.nickname)).toBeInTheDocument();
  expect(client.autoLookup).toHaveBeenCalledWith("123456");
});
```

- [ ] **步骤 3：编写后端花名册失败测试**

```jsx
it("loads, edits, and deletes players through companion instead of localStorage", async () => {
  render(<DeltaForcePage companionClient={fakeCompanionClient().withPlayers([recognizedPlayer])} />);
  await userEvent.clear(screen.getByLabelText("玩家备注"));
  await userEvent.type(screen.getByLabelText("玩家备注"), "远程观察");
  await userEvent.click(screen.getByRole("button", { name: "保存" }));
  expect(client.updatePlayer).toHaveBeenCalledWith(recognizedPlayer.id, expect.objectContaining({ note: "远程观察" }));
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
});
```

- [ ] **步骤 4：运行测试并确认失败**

运行：`npm test -- --run src/tools/delta-force`  
预期：新测试失败，旧手动识别和视图模型测试保持通过。

- [ ] **步骤 5：实现查询主流程**

`DeltaForcePage` 状态拆分为：

```javascript
const [players, setPlayers] = useState([]);
const [connection, setConnection] = useState("checking");
const [countdownQuery, setCountdownQuery] = useState("");
const [job, setJob] = useState(null);
const [usage, setUsage] = useState(null);
```

查询按钮只在 `ready`、非忙碌且输入非空时启动倒计时。倒计时完成后提交任务，每 500ms 轮询；终态后停止轮询。离开页面时若任务仍在运行，调用取消接口并清理定时器。

- [ ] **步骤 6：恢复停止和今日用量**

`DeltaCommandBar` 接收：

```jsx
<DeltaCommandBar
  query={query}
  busy={Boolean(job && ["pending", "running"].includes(job.state))}
  usage={usage}
  onSearch={beginCountdown}
  onStop={cancelCurrentJob}
  onCalibration={() => onNavigate("delta-force/calibration")}
/>
```

- [ ] **步骤 7：把手动识别和档案操作切到 Companion**

删除主流程对 `loadRecords/saveRecords` 的调用。手动识别调用 `client.manualLookup(files)`；保存、删除和搜索调用对应 Companion 方法。旧 localStorage 数据只提供一次性“导出旧浏览器档案”兼容工具，不自动覆盖 Companion 数据。

- [ ] **步骤 8：运行 Delta 全部测试**

运行：`npm test -- --run src/tools/delta-force src/api/deltaCompanionClient.test.js`  
预期：全部通过。

- [ ] **步骤 9：GitHub Desktop 检查点**

建议摘要：`feat: restore complete delta workflow`。

---

### 任务 11：实现站内校准页面和嵌套路由

**文件：**

- 新建：`frontend/src/tools/delta-force/DeltaCalibrationPage.jsx`
- 新建：`frontend/src/tools/delta-force/DeltaCalibrationPage.test.jsx`
- 修改：`frontend/src/embed/routes.js`
- 修改：`frontend/src/embed/routes.test.js`
- 修改：`frontend/src/embed/EmbeddedToolCenter.jsx`
- 修改：`frontend/src/i18n/messages.js`
- 修改：`frontend/src/tools/delta-force/delta-force.css`

- [ ] **步骤 1：编写嵌套路由失败测试**

```javascript
expect(normalizeToolRoute("delta-force/calibration")).toBe("delta-force/calibration");
expect(normalizeToolRoute("delta-force/unknown")).toBe("home");
```

- [ ] **步骤 2：编写校准页面失败测试**

```jsx
it("captures the desktop, saves a selected crop, and deletes a template", async () => {
  const client = fakeCompanionClient().withCalibration([{ name: "social", ready: false }]);
  render(<I18nProvider language="zh"><DeltaCalibrationPage client={client} onBack={vi.fn()} /></I18nProvider>);
  await userEvent.click(screen.getByRole("button", { name: "获取桌面截图" }));
  expect(await screen.findByRole("img", { name: "当前桌面截图" })).toBeInTheDocument();
  defineSelection({ x: 10, y: 20, width: 200, height: 80 });
  await userEvent.click(screen.getByRole("button", { name: "保存社交入口模板" }));
  expect(client.saveCalibration).toHaveBeenCalledWith("social", expect.any(Blob));
});
```

- [ ] **步骤 3：运行测试并确认失败**

运行：

```powershell
npm test -- --run src/embed/routes.test.js src/tools/delta-force/DeltaCalibrationPage.test.jsx
```

预期：失败，提示校准路由和页面不存在。

- [ ] **步骤 4：实现校准画布**

页面使用普通 `<canvas>` 显示 Companion 返回的 PNG，指针拖拽生成受边界限制的矩形。保存时创建离屏 canvas 裁剪并导出 PNG Blob。模板名只能从 Companion 返回的白名单选择，不能由 URL 任意传入。

- [ ] **步骤 5：实现路由和返回**

`EmbeddedToolCenter` 在 `delta-force/calibration` 渲染校准页；返回更新到 `delta-force`，不重新加载站点。个人网站 hash 保持完整嵌套路由。

- [ ] **步骤 6：补齐三语和响应式样式**

新增模板状态、截图、裁剪、保存、删除、完整性和错误文案。桌面画布最大宽度 1120px；手机端使用横向可缩放预览，不产生页面横向溢出。

- [ ] **步骤 7：运行校准、路由和语言测试**

预期：全部通过。

- [ ] **步骤 8：GitHub Desktop 检查点**

建议摘要：`feat: add integrated delta calibration`。

---

### 任务 12：个人网站进入 Delta 时按需启动 Companion

**文件：**

- 修改：`E:/A Study/Coding/My/local-server.js`
- 修改：`E:/A Study/Coding/My/tests/local-server.test.js`
- 修改：`E:/A Study/Coding/My/js/software-routing.js`
- 修改：`E:/A Study/Coding/My/tests/software-route.test.js`
- 修改：`E:/A Study/Coding/My/js/app.js`

- [ ] **步骤 1：编写按需启动失败测试**

```javascript
test("runtime start launches companion once and waits for health", async () => {
  const spawn = createSpawnStub();
  const health = createHealthStub([false, false, true]);
  const server = createServer({ spawnCompanion: spawn, companionHealth: health });
  const first = await request(server, "POST", "/api/delta-runtime/start");
  const second = await request(server, "POST", "/api/delta-runtime/start");
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(spawn.calls.length, 1);
  assert.deepEqual(await first.json(), { status: "ready", base_url: "http://127.0.0.1:5174" });
});
```

- [ ] **步骤 2：编写启动失败测试**

```javascript
test("runtime start returns stable errors for missing executable and timeout", async () => {
  const missing = await request(createServer({ companionExecutable: "Z:/missing.exe" }), "POST", "/api/delta-runtime/start");
  assert.equal(missing.status, 503);
  assert.deepEqual(await missing.json(), { error: { code: "companion_not_installed" } });
});
```

- [ ] **步骤 3：运行测试并确认失败**

运行：`node --test tests/local-server.test.js tests/software-route.test.js`  
预期：新测试失败。

- [ ] **步骤 4：实现受限启动器**

`local-server.js` 只允许 POST 固定路径 `/api/delta-runtime/start`。可执行文件解析顺序固定：

```text
DELTA_COMPANION_EXE 环境变量
../pp-tools/companion/dist/Delta Companion.exe
../pp-tools/companion/.venv/Scripts/pythonw.exe -m delta_companion
```

禁止从请求参数接收命令、路径或参数。并发请求共享同一个启动 Promise；健康检查最多等待 10 秒。

- [ ] **步骤 5：支持校准嵌套路由**

```javascript
assert.deepEqual(parseSiteHash("#software/delta-force/calibration"), {
  view: "software",
  toolRoute: "delta-force/calibration",
});
```

- [ ] **步骤 6：进入 Delta 时启动**

`app.js` 只在本机来源且工具路由以 `delta-force` 开头时调用启动接口；公网来源跳过本机网站接口，由嵌入组件执行协议唤起。传入：

```javascript
controller.update({
  companionBaseUrl: "http://127.0.0.1:5174",
  companionDownloadUrl: "tools/pp-tools/downloads/Delta-Companion.exe",
  companionProtocolUrl: "delta-stats://start",
});
```

- [ ] **步骤 7：运行个人网站测试**

预期：现有日记、静态资源、路由和新增启动测试全部通过。

- [ ] **步骤 8：GitHub Desktop 检查点**

建议摘要：`feat: start delta companion on demand`。

---

### 任务 13：构建便携 EXE 和发布清单

**文件：**

- 新建：`companion/build_companion.py`
- 新建：`companion/delta_companion.spec`
- 新建：`companion/tests/test_build_manifest.py`
- 修改：`scripts/sync_personal_site_embed.mjs`
- 修改：`scripts/sync_personal_site_embed.test.mjs`
- 修改：`frontend/package.json`

- [ ] **步骤 1：编写版本清单失败测试**

```python
def test_release_manifest_contains_exe_hash_and_api_version(tmp_path):
    exe = tmp_path / "Delta-Companion.exe"
    exe.write_bytes(b"binary")
    manifest = build_release_manifest(exe, version="1.0.0", api_version=1)
    assert manifest == {
        "version": "1.0.0",
        "api_version": 1,
        "file": "Delta-Companion.exe",
        "size": 6,
        "sha256": hashlib.sha256(b"binary").hexdigest(),
    }
```

- [ ] **步骤 2：扩展同步失败测试**

验证同步后以下文件存在且哈希一致：

```text
tools/pp-tools/downloads/Delta-Companion.exe
tools/pp-tools/downloads/delta-companion-version.json
```

- [ ] **步骤 3：运行测试并确认失败**

运行：

```powershell
backend\.venv\Scripts\python.exe -m pytest companion\tests\test_build_manifest.py -q
node --test scripts\sync_personal_site_embed.test.mjs
```

预期：失败，提示构建清单和同步白名单未实现。

- [ ] **步骤 4：实现 PyInstaller 构建**

构建脚本先运行 Companion 测试，再调用：

```python
PyInstaller.__main__.run([
    str(spec_path), "--noconfirm", "--clean", f"--distpath={dist_dir}",
    f"--workpath={work_dir}",
])
```

Spec 显式收集 RapidOCR、ONNX Runtime、OpenCV、MSS、校准默认资源和 Tkinter，不打包测试、旧数据库或用户配对文件。

- [ ] **步骤 5：生成版本清单**

构建完成后写入 `companion/dist/delta-companion-version.json`，使用 UTF-8、稳定键顺序和小写 SHA-256。

- [ ] **步骤 6：扩展同步白名单**

同步脚本只允许复制 EXE 和版本清单到 `tools/pp-tools/downloads/`，并在输出中报告 EXE 大小和 SHA-256。

- [ ] **步骤 7：执行真实构建**

运行：

```powershell
backend\.venv\Scripts\python.exe companion\build_companion.py
cd frontend
npm run sync:personal-site
```

预期：EXE、版本清单和个人网站副本存在，哈希一致。

- [ ] **步骤 8：在 Windows 沙盒式预演中启动 EXE**

使用临时 `LOCALAPPDATA` 启动 `--register-protocol --dry-run` 和 `--health-check`；预期不写真实用户数据，退出码为 0。

- [ ] **步骤 9：GitHub Desktop 检查点**

建议摘要：`build: package delta companion`。

---

### 任务 14：公网连接、版本更新和浏览器权限恢复

**文件：**

- 修改：`frontend/src/api/deltaCompanionClient.js`
- 修改：`frontend/src/tools/delta-force/DeltaConnectionPanel.jsx`
- 修改：`frontend/src/tools/delta-force/useDeltaCompanion.js`
- 修改：`frontend/src/i18n/messages.js`
- 新建：`frontend/src/tools/delta-force/DeltaConnectionPanel.test.jsx`
- 修改：`companion/delta_companion/config.py`
- 修改：`companion/delta_companion/security.py`

- [ ] **步骤 1：编写公网首次连接失败测试**

```jsx
it("offers download, protocol launch, permission recovery, pairing, and update", async () => {
  const runtime = fakeRuntime().offline();
  render(<DeltaConnectionPanel runtime={runtime} downloadUrl="/downloads/Delta-Companion.exe" />);
  expect(screen.getByRole("link", { name: "下载本机配套程序" })).toHaveAttribute("href", "/downloads/Delta-Companion.exe");
  await userEvent.click(screen.getByRole("button", { name: "启动配套程序" }));
  expect(runtime.launch).toHaveBeenCalledWith("delta-stats://start");
  runtime.setState("pairing_required");
  await userEvent.type(screen.getByLabelText("6 位配对码"), "123456");
  await userEvent.click(screen.getByRole("button", { name: "完成配对" }));
  expect(runtime.pair).toHaveBeenCalledWith("123456");
});
```

- [ ] **步骤 2：编写版本兼容失败测试**

```javascript
expect(compareCompanionVersion({ version: "0.9.0", api_version: 1 }, { min_version: "1.0.0", api_version: 1 })).toBe("update_required");
expect(compareCompanionVersion({ version: "1.0.0", api_version: 2 }, { min_version: "1.0.0", api_version: 1 })).toBe("api_incompatible");
```

- [ ] **步骤 3：运行测试并确认失败**

运行：`npm test -- --run src/tools/delta-force/DeltaConnectionPanel.test.jsx src/api/deltaCompanionClient.test.js`  
预期：失败，缺少完整公网流程。

- [ ] **步骤 4：实现连接恢复顺序**

固定顺序：健康检查 → 本地网络权限分类 → 版本比较 → 配对状态 → 业务能力。不得把网络错误一律显示为“未安装”。

权限拒绝时显示 Chrome/Edge 地址栏恢复说明和“重新检测”；协议唤起后每 500ms 检测一次，最多 10 秒；超时后保留手动运行按钮。

- [ ] **步骤 5：实现未来域名配置**

Companion 的 `allowed_origins.json` 初始包含本机开发来源。公网域名不硬编码占位符；发布命令必须接收 `--allowed-origin https://实际域名` 并写入版本清单。未配置公网来源时拒绝公网配对。

- [ ] **步骤 6：运行连接和安全测试**

预期：前端连接测试、Companion Origin 测试和三语键测试全部通过。

- [ ] **步骤 7：GitHub Desktop 检查点**

建议摘要：`feat: support public companion pairing`。

---

### 任务 15：更新检查脚本、文档和全量自动验证

**文件：**

- 新建：`scripts/check_delta_companion.ps1`
- 修改：`scripts/check-project.ps1`
- 修改：`E:/A Study/Coding/My/scripts/check-site.mjs`
- 修改：`README.md`
- 修改：`docs/superpowers/specs/2026-07-13-delta-companion-full-feature-migration-design.md`

- [ ] **步骤 1：扩展必需文件检查**

检查列表至少包含：

```text
companion/delta_companion/app.py
companion/delta_companion/security.py
companion/delta_companion/migration.py
companion/dist/Delta-Companion.exe
companion/dist/delta-companion-version.json
frontend/src/api/deltaCompanionClient.js
frontend/src/tools/delta-force/DeltaCalibrationPage.jsx
My/tools/pp-tools/downloads/Delta-Companion.exe
My/tools/pp-tools/downloads/delta-companion-version.json
```

- [ ] **步骤 2：实现安全扫描**

`check_delta_companion.ps1` 必须失败于：

- EXE 和个人网站副本哈希不一致。
- 版本清单与源码版本不一致。
- 打包目录包含数据库、配对令牌、校准图片或原截图。
- Companion 绑定非 loopback 地址。
- CORS 出现通配来源。
- 代码或产物包含本机绝对项目路径。

- [ ] **步骤 3：运行 Companion 全部测试**

```powershell
backend\.venv\Scripts\python.exe -m pytest companion\tests -q
```

预期：全部通过。

- [ ] **步骤 4：运行 PP Tools 后端和前端回归**

```powershell
backend\.venv\Scripts\python.exe -m pytest backend\tests -q
cd frontend
npm test
npm run build
npm run build:embed
npm run sync:personal-site
```

预期：所有命令退出码为 0。

- [ ] **步骤 5：运行个人网站回归**

```powershell
cd "E:\A Study\Coding\My"
$tests = Get-ChildItem tests -File | Where-Object { $_.Name -match '\.test\.(js|cjs)$' } | ForEach-Object FullName
node --test $tests
node scripts\check-site.mjs
```

预期：全部通过。

- [ ] **步骤 6：执行格式与敏感信息检查**

两个仓库分别运行 `git diff --check`；扫描固定配对码、明文 token、数据库、截图、临时工具配置、私有路径和禁止署名词。预期无匹配。

- [ ] **步骤 7：更新中文文档**

README 增加：首次下载、协议注册、配对、本机网站自动启动、游戏准备、校准、停止任务、撤销配对、更新和卸载。规格状态保持“实施中”，直到真实游戏验收通过。

- [ ] **步骤 8：GitHub Desktop 检查点**

建议摘要：`test: verify delta companion delivery`。

---

### 任务 16：真实浏览器与真实游戏验收

**文件：**

- 新建生成：`docs/verification/delta-companion-2026-07-13.md`
- 修改：`docs/superpowers/specs/2026-07-13-delta-companion-full-feature-migration-design.md`

- [ ] **步骤 1：准备安全验收环境**

用户登录三角洲游戏，停留在原自动化支持的起始页面。关闭会抢占鼠标的其他程序。确认原 `Delta Force/data` 已完成只读备份。

- [ ] **步骤 2：本机启动和历史数据验收**

双击“打开我的网站”，进入 Delta。确认 Companion 此时才启动；历史花名册数量、抽样玩家和校准模板与迁移清单一致。

- [ ] **步骤 3：昵称自动查询验收**

输入一个可查询昵称，验证 5 秒倒计时、每个任务步骤、四张截图、OCR、档案保存和鼠标归还。记录任务 ID、耗时和结果摘要，不记录私有截图。

- [ ] **步骤 4：UID 自动查询验收**

输入一个 UID，重复验证搜索结果点击、四页截图、OCR 和档案。确认 UID 查询不依赖昵称文本匹配。

- [ ] **步骤 5：停止任务验收**

启动第三个查询，在截图前点击停止。确认任务进入 `cancelled`，鼠标立即归还，临时截图清理，未创建空档案。

- [ ] **步骤 6：校准和手动识别验收**

打开站内校准页，更新一个模板并重新查询；随后手动上传四张截图，确认两个入口都写入同一数据库。

- [ ] **步骤 7：Chrome 和 Edge 公网流程验收**

使用 HTTPS 测试来源验证：未运行状态、协议唤起、本地网络权限、6 位码配对、后续自动连接、撤销配对、错误来源拒绝和版本过旧提示。

- [ ] **步骤 8：桌面和手机浏览器视觉验收**

在 1440×900、390×844 下检查连接面板、查询、任务进度、档案和校准页面。手机端允许查看档案和连接状态，但自动游戏操作按钮必须明确标注需要 Windows Companion。

- [ ] **步骤 9：记录验收结果并完成规格**

验证文档记录版本、EXE SHA-256、测试数量、昵称查询、UID 查询、停止任务、校准、Chrome、Edge 和残余限制。全部通过后把 spec 状态改为“已完成”。

- [ ] **步骤 10：由用户完成最终提交和推送**

建议 PP Tools 摘要：`feat: restore delta companion workflow`。  
建议个人网站摘要：`feat: connect delta companion runtime`。  
由用户在 GitHub Desktop 中检查、提交和推送，执行过程不自动操作远端仓库。
