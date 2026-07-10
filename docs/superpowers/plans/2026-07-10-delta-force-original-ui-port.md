# Delta Force 原版界面迁移实施计划

> **执行要求：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务实施；使用复选框跟踪每个步骤。

**目标：** 将当前通用白色 Delta Force 页面替换为原版深色战绩工作台，同时保留真实截图识别接口，并使用浏览器本地花名册代替旧桌面服务。

**架构：** Delta 路由使用 React 懒加载并跳过共用 `AppLayout`，因此原版全局样式只在 Delta 页面加载，不污染其他工具。原版界面拆分为指挥栏、上传区、花名册、档案和雷达图组件；玩家档案使用带版本号的 `localStorage` 存储，截图识别继续调用 `/api/delta-force/analyze`。

**技术栈：** React 18、Vite、Vitest、Testing Library、浏览器 `localStorage`、Flask 分析接口、原版 CSS 和内联 SVG 雷达图。

---

## 文件结构

### 新建文件

- `frontend/src/tools/delta-force/deltaRecordStore.js`：本地档案校验、读取、保存、搜索、新增或更新、编辑和删除。
- `frontend/src/tools/delta-force/deltaRecordStore.test.js`：本地档案持久化与损坏恢复测试。
- `frontend/src/tools/delta-force/deltaViewModel.js`：KD 评级、强度判断、识别结果转档案和显示值工具。
- `frontend/src/tools/delta-force/DeltaCommandBar.jsx`：原版顶部指挥栏。
- `frontend/src/tools/delta-force/DeltaUploadPanel.jsx`：折叠上传、拖放、粘贴、缩略图和状态。
- `frontend/src/tools/delta-force/DeltaRoster.jsx`：本地花名册和筛选。
- `frontend/src/tools/delta-force/DeltaRadar.jsx`：原版五边形雷达图。
- `frontend/src/tools/delta-force/DeltaDossier.jsx`：完整玩家档案、编辑、保存和删除。
- `frontend/src/tools/delta-force/delta-force.css`：从原版迁移的完整深色样式及网页适配规则。

### 修改文件

- `frontend/src/App.jsx`：Delta 路由使用懒加载沉浸式页面，其他路由继续使用共用布局。
- `frontend/src/App.test.jsx`：验证 Delta 路由不显示共用导航。
- `frontend/src/tools/delta-force/DeltaForcePage.jsx`：页面状态、接口请求和本地档案编排。
- `frontend/src/tools/delta-force/DeltaForcePage.test.jsx`：上传、保存、搜索、编辑、删除和错误状态测试。
- `frontend/src/styles.css`：删除当前通用 Delta 页面样式，避免重复定义。

### 视觉基准

- `E:/A Study/Coding/Delta Force/web/index.html`
- `E:/A Study/Coding/Delta Force/web/app.js`
- `E:/A Study/Coding/Delta Force/web/styles.css`

---

### 任务 1：隔离 Delta 沉浸式路由

**文件：**

- 修改：`frontend/src/App.jsx`
- 修改：`frontend/src/App.test.jsx`

- [ ] **步骤 1：先写失败测试**

将 Delta 路由测试改为异步，并断言原版品牌存在、共用导航不存在：

```jsx
it("renders the immersive Delta route without the shared navigation", async () => {
  window.history.pushState({}, "", "/tools/delta-force");

  render(<App />);

  expect(await screen.findByLabelText("返回工具中心")).toHaveTextContent("DELTASTATS");
  expect(screen.queryByRole("navigation", { name: "Primary navigation" })).not.toBeInTheDocument();
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```powershell
cd "E:\A Study\Coding\pp-tools\frontend"
npm test -- App --reporter=basic
```

预期：Delta 页面仍显示共用导航，且找不到 `DELTA` 品牌。

- [ ] **步骤 3：实现路由懒加载和布局隔离**

将 `App.jsx` 调整为：

```jsx
import { lazy, Suspense } from "react";
import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import BeautyCamPage from "./tools/beauty-cam/BeautyCamPage";
import AdminMilkTeaPage from "./tools/milk-tea/AdminMilkTeaPage";
import MilkTeaPage from "./tools/milk-tea/MilkTeaPage";

const DeltaForcePage = lazy(() => import("./tools/delta-force/DeltaForcePage"));

function regularRoute(pathname) {
  if (pathname === "/tools/beauty-cam") return <BeautyCamPage />;
  if (pathname === "/tools/milk-tea") return <MilkTeaPage />;
  if (pathname === "/admin/milk-tea") return <AdminMilkTeaPage />;
  return <HomePage />;
}

export default function App() {
  const pathname = window.location.pathname;
  if (pathname === "/tools/delta-force") {
    return (
      <Suspense fallback={<main aria-label="正在加载战绩工具" />}>
        <DeltaForcePage />
      </Suspense>
    );
  }
  return <AppLayout>{regularRoute(pathname)}</AppLayout>;
}
```

- [ ] **步骤 4：创建最小原版品牌占位以让路由测试通过**

暂时将 `DeltaForcePage.jsx` 的返回内容改为：

```jsx
export default function DeltaForcePage() {
  return (
    <main className="delta-app">
      <a href="/" aria-label="返回工具中心"><span>DELTA</span><span>STATS</span></a>
    </main>
  );
}
```

- [ ] **步骤 5：运行路由测试**

运行：

```powershell
npm test -- App --reporter=basic
```

预期：全部 App 测试通过。

- [ ] **步骤 6：GitHub Desktop 提交检查点**

提交摘要：

```text
refactor: isolate delta force workspace
```

---

### 任务 2：实现浏览器本地花名册

**文件：**

- 新建：`frontend/src/tools/delta-force/deltaRecordStore.js`
- 新建：`frontend/src/tools/delta-force/deltaRecordStore.test.js`

- [ ] **步骤 1：编写本地档案失败测试**

```js
import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteRecord,
  loadRecords,
  saveRecords,
  searchRecords,
  updateRecord,
  upsertResult,
} from "./deltaRecordStore";

beforeEach(() => localStorage.clear());

describe("deltaRecordStore", () => {
  it("recovers from malformed storage", () => {
    localStorage.setItem("delta-stats-records-v1", "not-json");
    expect(loadRecords()).toEqual([]);
  });

  it("creates and reloads a record", () => {
    const records = upsertResult([], {
      nickname: "PeRo追风君子",
      home: { uid: "45130520309978485133", title: "铜陵猛攻大师" },
      overview: { kd: ["7.2", "1.2", "1.9"] },
    }, new Date("2026-07-10T10:00:00Z"));
    saveRecords(records);

    expect(loadRecords()[0].nickname).toBe("PeRo追风君子");
    expect(loadRecords()[0].uid).toBe("45130520309978485133");
  });

  it("updates an existing UID instead of duplicating it", () => {
    const first = upsertResult([], { nickname: "Old", home: { uid: "10001" } });
    const second = upsertResult(first, { nickname: "New", home: { uid: "10001" } });
    expect(second).toHaveLength(1);
    expect(second[0].nickname).toBe("New");
  });

  it("searches, edits, and deletes records", () => {
    const records = upsertResult([], { nickname: "Player One", home: { uid: "9988" } });
    expect(searchRecords(records, "9988")).toHaveLength(1);
    const edited = updateRecord(records, records[0].id, { note: "谨慎交战" });
    expect(edited[0].note).toBe("谨慎交战");
    expect(deleteRecord(edited, records[0].id)).toEqual([]);
  });
});
```

- [ ] **步骤 2：运行测试确认模块不存在**

运行：

```powershell
npm test -- deltaRecordStore --reporter=basic
```

预期：因为 `deltaRecordStore.js` 不存在而失败。

- [ ] **步骤 3：实现本地档案模块**

```js
export const STORAGE_KEY = "delta-stats-records-v1";

const nowIso = (now) => (now instanceof Date ? now : new Date()).toISOString();
const normalizeText = (value) => String(value || "").trim().toLocaleLowerCase();
const makeId = () => globalThis.crypto?.randomUUID?.()
  || `record-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function validRecord(record) {
  return record && typeof record === "object" && typeof record.id === "string"
    && typeof record.nickname === "string" && record.data && typeof record.data === "object";
}

export function loadRecords(storage = localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(validRecord) : [];
  } catch {
    return [];
  }
}

export function saveRecords(records, storage = localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(records));
  return records;
}

export function searchRecords(records, query) {
  const term = normalizeText(query);
  if (!term) return records;
  return records.filter((record) => normalizeText(record.nickname).includes(term)
    || normalizeText(record.uid).includes(term));
}

export function upsertResult(records, result, now = new Date()) {
  const home = result.home || {};
  const uid = String(home.uid || result.uid || "").trim();
  const nickname = String(result.nickname || home.nickname || "未命名玩家").trim();
  const uidIndex = uid ? records.findIndex((record) => record.uid === uid) : -1;
  const nicknameIndex = records.findIndex((record) => normalizeText(record.nickname) === normalizeText(nickname));
  const index = uidIndex >= 0 ? uidIndex : nicknameIndex;
  const existing = index >= 0 ? records[index] : null;
  const timestamp = nowIso(now);
  const record = {
    id: existing?.id || makeId(),
    nickname,
    uid,
    title: home.title || existing?.title || "",
    tags: existing?.tags || [],
    note: existing?.note || "",
    data: result,
    created_at: existing?.created_at || timestamp,
    updated_at: timestamp,
  };
  return [record, ...records.filter((_, recordIndex) => recordIndex !== index)];
}

export function updateRecord(records, id, patch, now = new Date()) {
  return records.map((record) => record.id === id
    ? { ...record, ...patch, updated_at: nowIso(now) }
    : record);
}

export function deleteRecord(records, id) {
  return records.filter((record) => record.id !== id);
}
```

- [ ] **步骤 4：运行本地档案测试**

运行：

```powershell
npm test -- deltaRecordStore --reporter=basic
```

预期：4 个测试通过。

- [ ] **步骤 5：GitHub Desktop 提交检查点**

提交摘要：

```text
feat: add local delta roster
```

---

### 任务 3：迁移显示规则和五维雷达图

**文件：**

- 新建：`frontend/src/tools/delta-force/deltaViewModel.js`
- 新建：`frontend/src/tools/delta-force/DeltaRadar.jsx`

- [ ] **步骤 1：实现显示规则模块**

```js
export const KD_LABELS = ["普通", "机密", "绝密"];
export const RADAR_KEYS = ["战斗", "生存", "合作", "搜索", "财富"];

export const displayValue = (value) => value == null || value === "" ? "—" : value;
export const numberValue = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export function kdClass(value) {
  const number = numberValue(value);
  if (number == null) return "";
  return number >= 2 ? "good" : number >= 1 ? "mid" : "bad";
}

export function rateClass(value) {
  const number = numberValue(value);
  if (number == null) return "";
  return number >= 45 ? "good" : number >= 30 ? "mid" : "bad";
}

export function verdict(mode) {
  if (!mode) return null;
  const kd = numberValue(mode.kd?.[2]) ?? numberValue(mode.kd?.[1]) ?? numberValue(mode.kd?.[0]);
  const escapeRate = numberValue(mode.escape_rate);
  if (kd == null && escapeRate == null) return null;
  let score = 0;
  if (kd != null) score += kd >= 2 ? 2 : kd >= 1.3 ? 1.4 : kd >= 0.8 ? 0.7 : 0;
  if (escapeRate != null) score += escapeRate >= 45 ? 2 : escapeRate >= 33 ? 1.2 : escapeRate >= 25 ? 0.6 : 0;
  if (score >= 3.2) return { text: "大佬", className: "v-top" };
  if (score >= 2) return { text: "高手", className: "v-good" };
  if (score >= 1) return { text: "普通", className: "v-mid" };
  return { text: "萌新", className: "v-low" };
}

export function bestVerdict(data) {
  const order = { "v-top": 3, "v-good": 2, "v-mid": 1, "v-low": 0 };
  return [verdict(data?.overview), verdict(data?.ranked)]
    .filter(Boolean)
    .sort((left, right) => order[right.className] - order[left.className])[0] || null;
}

export function radarValue(radar, key) {
  const aliases = { 战斗: "combat", 生存: "survival", 合作: "support", 搜索: "search", 财富: "wealth" };
  return radar?.[key] ?? radar?.[aliases[key]] ?? null;
}
```

- [ ] **步骤 2：实现原版五边形雷达图**

`DeltaRadar.jsx` 使用原版坐标和标签顺序：

```jsx
import { displayValue, RADAR_KEYS, radarValue } from "./deltaViewModel";

export default function DeltaRadar({ radar, caption }) {
  const centerX = 90;
  const centerY = 82;
  const radius = 54;
  const point = (index, distance) => {
    const angle = (-90 + index * 72) * Math.PI / 180;
    return [centerX + distance * Math.cos(angle), centerY + distance * Math.sin(angle)];
  };
  const polygon = (distance) => RADAR_KEYS.map((_, index) => point(index, distance).join(",")).join(" ");
  const values = RADAR_KEYS.map((key) => Math.max(0, Math.min(100, Number(radarValue(radar, key)) || 0)));
  const dataPolygon = values.map((value, index) => point(index, radius * value / 100).join(",")).join(" ");

  return (
    <figure>
      <svg viewBox="0 0 180 168" className="radar-svg" role="img" aria-label={caption}>
        {[0.25, 0.5, 0.75, 1].map((scale) => <polygon key={scale} points={polygon(radius * scale)} className="radar-grid" />)}
        {RADAR_KEYS.map((key, index) => {
          const [x, y] = point(index, radius);
          return <line key={key} x1={centerX} y1={centerY} x2={x} y2={y} className="radar-axis" />;
        })}
        <polygon points={dataPolygon} className="radar-data" />
        {values.map((value, index) => {
          const [x, y] = point(index, radius * value / 100);
          return <circle key={RADAR_KEYS[index]} cx={x} cy={y} r="2.2" className="radar-dot" />;
        })}
        {RADAR_KEYS.map((key, index) => {
          const [x, y] = point(index, radius + 17);
          return (
            <g key={key}>
              <text x={x} y={y - 1} textAnchor="middle" className="radar-label">{key}</text>
              <text x={x} y={y + 10} textAnchor="middle" className="radar-number">{displayValue(radarValue(radar, key))}</text>
            </g>
          );
        })}
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
```

- [ ] **步骤 3：运行前端测试确保没有语法错误**

运行：

```powershell
npm test -- --reporter=basic
```

预期：现有测试继续通过。

---

### 任务 4：实现原版指挥栏、上传区和花名册

**文件：**

- 新建：`frontend/src/tools/delta-force/DeltaCommandBar.jsx`
- 新建：`frontend/src/tools/delta-force/DeltaUploadPanel.jsx`
- 新建：`frontend/src/tools/delta-force/DeltaRoster.jsx`

- [ ] **步骤 1：实现原版顶部指挥栏**

```jsx
export default function DeltaCommandBar({ query, recordCount, status, onQueryChange, onSubmit }) {
  return (
    <>
      <header id="topbar">
        <a className="brand" href="/" aria-label="返回工具中心">
          <span className="mark">◢◤</span>
          <span className="bn">DELTA<b>STATS</b></span>
          <span className="bsub">烽火地带 · 战绩分析</span>
        </a>
        <form className="cmd" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
          <input id="al-input" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="输入昵称或编号（UID），回车查询" autoComplete="off" />
          <button id="al-go" type="submit">查 询</button>
        </form>
        <div className="top-meta">
          <span id="al-stats">本地档案 {recordCount} 份</span>
          <a className="al-cal" href="/">工具中心</a>
        </div>
      </header>
      <div id="al-status" aria-live="polite">{status && <span className={`pill ${status.type}`}>{status.text}</span>}</div>
    </>
  );
}
```

- [ ] **步骤 2：实现上传组件**

组件必须保留原版 `upload`、`drop`、`thumbs`、`count`、`analyze`、`clear` 和 `upmsg` 标识。使用 `useEffect` 创建并释放预览对象地址：

```jsx
import { useEffect, useState } from "react";

export default function DeltaUploadPanel({ files, busy, message, onAddFiles, onClear, onAnalyze }) {
  const [previews, setPreviews] = useState([]);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const next = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(next);
    if (files.length) setOpen(true);
    return () => next.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [files]);

  return (
    <details id="upload" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>手动上传截图 <span className="sum-hint">拖入或 Ctrl+V 粘贴 4 张资料页截图</span></summary>
      <div id="drop" className={dragging ? "hot" : ""}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); onAddFiles(event.dataTransfer.files); }}>
        <input id="files" aria-label="截图文件" type="file" accept="image/*" multiple onChange={(event) => onAddFiles(event.target.files)} />
        <div className="hint">拖入 / 粘贴（Ctrl+V）/ 选择 4 张截图（数据总览 · 排位赛 · 最近战绩 · 首页），顺序随意</div>
        <div id="thumbs">{previews.map(({ file, url }) => <img key={`${file.name}-${file.size}`} src={url} alt={file.name} />)}</div>
        <div className="row">
          <span>已选 <span id="count">{files.length}</span> 张</span>
          <button id="analyze" type="button" disabled={busy || !files.length} onClick={onAnalyze}>{busy ? "识别中…" : "识别并记录"}</button>
          <button id="clear" type="button" className="ghost" disabled={busy || !files.length} onClick={onClear}>清空</button>
        </div>
        <div id="upmsg" role={message?.error ? "alert" : "status"}>{message?.text || ""}</div>
      </div>
    </details>
  );
}
```

- [ ] **步骤 3：实现本地花名册组件**

```jsx
import { kdClass, rateClass, verdict } from "./deltaViewModel";

export default function DeltaRoster({ records, selectedId, filter, onFilterChange, onSelect }) {
  return (
    <aside id="rail">
      <input id="search" value={filter} onChange={(event) => onFilterChange(event.target.value)} placeholder="筛选花名册…" autoComplete="off" />
      <div id="list">
        {!records.length && <div className="empty">{filter ? `没找到“${filter}”` : "还没有任何记录，上传截图开始记录吧"}</div>}
        {records.map((record) => {
          const mode = record.data.overview || record.data.ranked || {};
          const grade = verdict(mode);
          const kd = mode.kd?.[2];
          return (
            <button type="button" className={`row-item ${record.id === selectedId ? "active" : ""}`} key={record.id} onClick={() => onSelect(record.id)}>
              <span className="r1">
                <span className="rn">{record.nickname}</span>
                {record.title && <span className="title-mini">{record.title}</span>}
                {grade && <span className={`verdict ${grade.className}`}>{grade.text}</span>}
                <span className="row-arrow">›</span>
              </span>
              <span className="r2">
                {kd != null && <span className={`row-kd ${kdClass(kd)}`}>绝密 <b>{kd}</b></span>}
                {mode.escape_rate && <span className={`row-esc ${rateClass(mode.escape_rate)}`}>撤离 <b>{mode.escape_rate}</b></span>}
                {!!record.tags?.length && <span className="row-tags">{record.tags.map((tag) => <i className="tag" key={tag}>{tag}</i>)}</span>}
                <span className="row-time">{record.updated_at ? new Date(record.updated_at).toLocaleDateString() : ""}</span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
```

- [ ] **步骤 4：运行构建检查组件语法**

运行：

```powershell
npm run build
```

预期：构建通过。

---

### 任务 5：实现完整玩家档案

**文件：**

- 新建：`frontend/src/tools/delta-force/DeltaDossier.jsx`

- [ ] **步骤 1：实现对比数据和近期战绩纯函数**

在文件顶部定义：

```jsx
import { useEffect, useState } from "react";
import DeltaRadar from "./DeltaRadar";
import { bestVerdict, displayValue, kdClass, KD_LABELS, rateClass } from "./deltaViewModel";

const DETAIL_FIELDS = [
  ["命中率", "hit_rate"], ["精准击败率", "precise_kill_rate"],
  ["带出价值", "carry_value"], ["累计行动报酬", "action_reward"],
  ["曼德尔砖", "mandel_bricks"], ["带出队友价值", "carry_teammate_value"],
  ["救助队友", "rescue_teammate"], ["复活队友", "revive_teammate"],
];

function rankText(mode) {
  return [mode?.rank_name, mode?.rank_star != null ? `★${mode.rank_star}` : ""].filter(Boolean).join(" ") || "—";
}

function splitMatchLocation(mapTime = "") {
  const match = mapTime.match(/^(.*?)[-－](机密|绝密|常规|普通)\s*(.*)$/);
  return match ? { map: match[1], difficulty: match[2], time: match[3] } : { map: mapTime, difficulty: "", time: "" };
}
```

- [ ] **步骤 2：实现档案编辑状态与保存数据**

```jsx
export default function DeltaDossier({ record, onSave, onDelete, onCollapse }) {
  const [draft, setDraft] = useState(record);
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => setDraft(record), [record]);
  if (!draft) return <main id="result" />;

  const data = draft.data || {};
  const overview = data.overview;
  const ranked = data.ranked;
  const home = data.home || {};
  const grade = bestVerdict(data);
  const updateKd = (mode, index, value) => setDraft((current) => ({
    ...current,
    data: {
      ...current.data,
      [mode]: { ...current.data[mode], kd: [0, 1, 2].map((itemIndex) => itemIndex === index ? value : current.data[mode]?.kd?.[itemIndex] ?? null) },
    },
  }));
```

- [ ] **步骤 3：实现档案主体**

返回结构必须使用原版类名：`card`、`dhead`、`strip`、`dbody`、`cmp`、`radars`、`recent`、`dfoot`。核心对比表代码：

```jsx
  const modes = [["overview", "数据总览", overview], ["ranked", "排位赛", ranked]];
  const summaryRank = ranked?.rank_name ? ranked : overview;
  const summaryItems = [
    ["总览 绝密KD", overview?.kd?.[2], `kd ${kdClass(overview?.kd?.[2])}`],
    ["排位 绝密KD", ranked?.kd?.[2], `kd ${kdClass(ranked?.kd?.[2])}`],
    ["撤离率", overview?.escape_rate ?? ranked?.escape_rate, rateClass(overview?.escape_rate ?? ranked?.escape_rate)],
    ["段位", rankText(summaryRank), "rank"],
    ["赚损比", overview?.profit_ratio ?? ranked?.profit_ratio, ""],
    ["总场次", home.total_matches ?? overview?.matches, ""],
    ["总资产", home.total_assets, ""],
  ].filter(([, value]) => value != null && value !== "");

  return (
    <main id="result">
      <section className="card" data-id={draft.id}>
        <header className="dhead">
          <input aria-label="玩家昵称" className="nick" value={draft.nickname} onChange={(event) => setDraft({ ...draft, nickname: event.target.value })} />
          {grade && <span className={`verdict ${grade.className}`}>{grade.text}</span>}
          {draft.title && <span className="title-badge">{draft.title}</span>}
          {draft.uid && <span className="uid-block"><span className="uid-l">UID</span><code className="uid">{draft.uid}</code><button type="button" className="copy-btn" onClick={() => navigator.clipboard.writeText(draft.uid)}>复制</button></span>}
        </header>
        <div className="strip">{summaryItems.map(([label, value, className]) => <div className="si" key={label}><i>{label}</i><b className={className}>{displayValue(value)}</b></div>)}</div>
        <div className="dbody">
          <section className="sec-cmp">
            <h3>总览 / 排位 对比</h3>
            <table className="cmp">
              <thead><tr><th /><th>数据总览</th><th>排位赛</th></tr></thead>
              <tbody>
                {KD_LABELS.map((label, index) => <tr key={label}><th>KD · {label}{index === 2 && <em className="tip">真实水平</em>}</th>{modes.map(([modeName,, mode]) => <td key={modeName}>{mode ? <input aria-label={`${modeName}-${label}-KD`} className={`kd-in ${kdClass(mode.kd?.[index])}`} value={mode.kd?.[index] ?? ""} onChange={(event) => updateKd(modeName, index, event.target.value)} /> : <span className="na">—</span>}</td>)}</tr>)}
                <tr><th>段位</th>{modes.map(([name,, mode]) => <td key={name}>{mode ? rankText(mode) : "—"}</td>)}</tr>
                <tr><th>撤离率</th>{modes.map(([name,, mode]) => <td key={name} className={rateClass(mode?.escape_rate)}>{displayValue(mode?.escape_rate)}</td>)}</tr>
                <tr><th>赚损比</th>{modes.map(([name,, mode]) => <td key={name}>{displayValue(mode?.profit_ratio)}</td>)}</tr>
                <tr><th>场次</th>{modes.map(([name,, mode]) => <td key={name}>{displayValue(mode?.matches)}</td>)}</tr>
                <tr><th>时长</th>{modes.map(([name,, mode]) => <td key={name}>{displayValue(mode?.play_hours)}</td>)}</tr>
              </tbody>
              <tbody className={`xtra ${showDetails ? "" : "details-hidden"}`}>
                {DETAIL_FIELDS.map(([label, key]) => <tr key={key}><th>{label}</th>{modes.map(([name,, mode]) => <td key={name}>{displayValue(mode?.[key])}</td>)}</tr>)}
              </tbody>
            </table>
            <button type="button" className="toggle" onClick={() => setShowDetails(!showDetails)}>{showDetails ? "收起 ▴" : "更多数据 ▾"}</button>
            <div className="radars">{overview?.radar && <DeltaRadar radar={overview.radar} caption="总览 五维" />}{ranked?.radar && <DeltaRadar radar={ranked.radar} caption="排位 五维" />}</div>
          </section>
          <RecentMatches recent={data.recent} />
        </div>
        <footer className="dfoot">
          <input aria-label="标签" className="tags-input" value={(draft.tags || []).join(", ")} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} placeholder="标签，逗号分隔" />
          <textarea aria-label="备注" className="note" rows="2" value={draft.note || ""} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="备注" />
          <div className="actions"><button type="button" className="ghost" onClick={onCollapse}>收起</button><button type="button" onClick={() => onSave(draft)}>保存</button><button type="button" className="danger" onClick={() => onDelete(draft)}>删除</button><span className="meta">更新于 {draft.updated_at ? new Date(draft.updated_at).toLocaleString() : "—"}</span></div>
        </footer>
      </section>
    </main>
  );
}
```

- [ ] **步骤 4：实现 `RecentMatches`**

```jsx
function RecentMatches({ recent }) {
  if (!recent || recent.hidden) {
    return <section className="recent"><h3>最近战绩</h3><span className="hidden-badge">对方隐藏了战绩</span></section>;
  }
  const matches = recent.matches || [];
  const wins = matches.filter((match) => match.result === "撤离成功").length;
  const kills = matches.reduce((sum, match) => sum + (Number(match.kills) || 0), 0);
  const winRate = matches.length ? Math.round(wins / matches.length * 100) : 0;

  return (
    <section className="recent">
      <h3>最近战绩</h3>
      <div className="recent-sum">
        <span className="rs">{matches.length} 场</span>
        <span className={`rs ${winRate >= 50 ? "good" : winRate >= 30 ? "mid" : "bad"}`}>撤离 {wins} 场 · {winRate}%</span>
        <span className="rs good">总击杀 {kills}</span>
      </div>
      <div className="match match-head"><span className="m-res">结果</span><span className="m-map">地图</span><span className="m-diff">难度</span><span className="m-kill">击杀</span><span className="m-hafu">带出</span><span className="m-rc">排位分</span><span className="m-time">时间</span></div>
      {matches.map((match, index) => {
        const success = match.result === "撤离成功";
        const location = splitMatchLocation(match.map_time || "");
        const difficultyClass = location.difficulty === "绝密" ? "d-top" : location.difficulty === "机密" ? "d-mid" : "d-low";
        return (
          <div className={`match ${success ? "m-ok" : "m-fail"}`} key={`${match.map_time || "match"}-${index}`}>
            <span className="m-res">{success ? "✔ 撤离" : "✘ 阵亡"}</span>
            <span className="m-map">{displayValue(location.map)}</span>
            <span className={`m-diff ${location.difficulty ? difficultyClass : ""}`}>{location.difficulty}</span>
            <span className="m-kill">{match.kills != null ? <><b>{match.kills}</b> 击杀</> : <i>—</i>}</span>
            <span className="m-hafu">{match.hafu ? <><b>{match.hafu}</b> 哈夫币</> : <i>—</i>}</span>
            <span className="m-rc">{match.rank_change || ""}</span>
            <span className="m-time">{location.time}</span>
          </div>
        );
      })}
    </section>
  );
}
```

- [ ] **步骤 5：运行构建**

运行：

```powershell
npm run build
```

预期：构建通过且没有未定义变量。

---

### 任务 6：编排上传、搜索、保存和删除流程

**文件：**

- 修改：`frontend/src/tools/delta-force/DeltaForcePage.jsx`
- 修改：`frontend/src/tools/delta-force/DeltaForcePage.test.jsx`

- [ ] **步骤 1：重写页面集成测试数据**

使用真实接口形状：

```jsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  URL.createObjectURL = vi.fn((file) => `blob:${file.name}`);
  URL.revokeObjectURL = vi.fn();
});

const result = {
  nickname: "PeRo追风君子",
  home: { nickname: "PeRo追风君子", uid: "45130520309978485133", title: "铜陵猛攻大师", total_matches: 853, total_assets: "515.8M" },
  overview: { kd: ["7.2", "1.2", "1.9"], escape_rate: "35.3%", matches: 853, rank_name: "三角洲巅峰", rank_star: 44, radar: { 战斗: 68, 生存: 73, 合作: 62, 搜索: 72, 财富: 100 } },
  ranked: { kd: [null, "1.3", "2"], escape_rate: "30.7%", matches: 492 },
  recent: { hidden: false, matches: [{ result: "撤离成功", map_time: "航天基地-机密 昨天 22:14", kills: 4 }] },
};
```

测试必须覆盖完整结果、部分结果、空结果、本地搜索、编辑保存和确认删除：

```jsx
it("analyzes screenshots and saves the original dossier locally", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ result, warnings: [] }), { status: 200 })));
  render(<DeltaForcePage />);
  await userEvent.upload(screen.getByLabelText("截图文件"), new File(["image"], "overview.png", { type: "image/png" }));
  await userEvent.click(screen.getByRole("button", { name: "识别并记录" }));
  expect(await screen.findByDisplayValue("PeRo追风君子")).toBeInTheDocument();
  expect(screen.getByText("三角洲巅峰 ★44")).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("delta-stats-records-v1"))).toHaveLength(1);
});

it("searches, edits, saves, and deletes a local dossier", async () => {
  localStorage.setItem("delta-stats-records-v1", JSON.stringify([{ id: "one", nickname: "Player One", uid: "9988", title: "", tags: [], note: "", data: { overview: { kd: ["1", "1", "1.8"] } }, created_at: "2026-07-10T00:00:00Z", updated_at: "2026-07-10T00:00:00Z" }]));
  vi.stubGlobal("confirm", vi.fn(() => true));
  render(<DeltaForcePage />);
  await userEvent.type(screen.getByPlaceholderText("输入昵称或编号（UID），回车查询"), "9988");
  await userEvent.click(screen.getByRole("button", { name: "查 询" }));
  await userEvent.clear(screen.getByLabelText("备注"));
  await userEvent.type(screen.getByLabelText("备注"), "谨慎交战");
  await userEvent.click(screen.getByRole("button", { name: "保存" }));
  expect(JSON.parse(localStorage.getItem("delta-stats-records-v1"))[0].note).toBe("谨慎交战");
  await userEvent.click(screen.getByRole("button", { name: "删除" }));
  expect(JSON.parse(localStorage.getItem("delta-stats-records-v1"))).toEqual([]);
});

it("keeps a partial result and shows its warning", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
    result: { nickname: "Partial Player", overview: { matches: 2 } },
    warnings: ["部分字段未识别"],
  }), { status: 200 })));
  render(<DeltaForcePage />);
  await userEvent.upload(screen.getByLabelText("截图文件"), new File(["image"], "partial.png", { type: "image/png" }));
  await userEvent.click(screen.getByRole("button", { name: "识别并记录" }));
  expect(await screen.findByDisplayValue("Partial Player")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("部分字段未识别");
});

it("does not save an empty recognition result", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
    result: { nickname: null, recent_matches: [] },
    warnings: ["未识别到支持的资料页"],
  }), { status: 200 })));
  render(<DeltaForcePage />);
  await userEvent.upload(screen.getByLabelText("截图文件"), new File(["image"], "empty.png", { type: "image/png" }));
  await userEvent.click(screen.getByRole("button", { name: "识别并记录" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("未识别到支持的资料页");
  expect(localStorage.getItem("delta-stats-records-v1")).toBeNull();
});
```

- [ ] **步骤 2：运行测试确认页面尚未支持这些行为**

运行：

```powershell
npm test -- DeltaForcePage --reporter=basic
```

预期：找不到原版控件和本地档案行为。

- [ ] **步骤 3：实现页面状态编排**

`DeltaForcePage.jsx` 必须：

```jsx
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../api/client";
import DeltaCommandBar from "./DeltaCommandBar";
import DeltaDossier from "./DeltaDossier";
import DeltaRoster from "./DeltaRoster";
import DeltaUploadPanel from "./DeltaUploadPanel";
import { deleteRecord, loadRecords, saveRecords, searchRecords, updateRecord, upsertResult } from "./deltaRecordStore";
import "./delta-force.css";

export default function DeltaForcePage() {
  const [records, setRecords] = useState(() => loadRecords());
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [status, setStatus] = useState(null);
  const visibleRecords = useMemo(() => searchRecords(records, filter), [records, filter]);
  const selectedRecord = records.find((record) => record.id === selectedId) || null;

  const commitRecords = (next) => { setRecords(next); saveRecords(next); };
  const addFiles = (incoming) => {
    const list = Array.from(incoming || []);
    const images = list.filter((file) => file.type.startsWith("image/"));
    setFiles((current) => [...current, ...images]);
    setMessage(images.length === list.length ? null : { error: true, text: "只接受图片文件" });
  };

  useEffect(() => {
    const onPaste = (event) => {
      const pasted = Array.from(event.clipboardData?.items || []).filter((item) => item.kind === "file").map((item) => item.getAsFile()).filter(Boolean);
      if (pasted.length) addFiles(pasted);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const analyze = async () => {
    if (!files.length) { setMessage({ error: true, text: "请先选择、拖入或粘贴图片" }); return; }
    const body = new FormData();
    files.forEach((file) => body.append("images", file));
    setBusy(true);
    setMessage({ error: false, text: "识别中…首次运行会稍慢" });
    try {
      const response = await apiFetch("/api/delta-force/analyze", { method: "POST", body });
      const hasResult = response.result?.nickname || response.result?.home || response.result?.overview || response.result?.ranked || response.result?.recent?.matches?.length;
      if (!hasResult) { setMessage({ error: true, text: response.warnings?.[0] || "未识别到支持的资料页" }); return; }
      const next = upsertResult(records, response.result);
      commitRecords(next);
      setSelectedId(next[0].id);
      setFiles([]);
      setMessage({ error: false, text: response.warnings?.[0] || `已识别并记录：${next[0].nickname}` });
    } catch (error) {
      setMessage({ error: true, text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const runQuery = () => {
    const exact = records.find((record) => record.nickname.toLocaleLowerCase() === query.trim().toLocaleLowerCase() || record.uid === query.trim());
    setFilter(query);
    if (exact) { setSelectedId(exact.id); setStatus({ type: "pill-ok", text: `已打开：${exact.nickname}` }); }
    else setStatus({ type: "pill-warn", text: query.trim() ? `没有精确档案，已筛选“${query.trim()}”` : "请输入昵称或 UID" });
  };

  const saveDraft = (draft) => {
    const next = updateRecord(records, draft.id, { nickname: draft.nickname.trim() || "未命名玩家", tags: draft.tags, note: draft.note, data: draft.data });
    commitRecords(next);
    setStatus({ type: "pill-ok", text: "档案已保存" });
  };

  const removeDraft = (draft) => {
    if (!window.confirm(`删除“${draft.nickname}”的档案？`)) return;
    commitRecords(deleteRecord(records, draft.id));
    setSelectedId(null);
  };

  return <div className="delta-app"><DeltaCommandBar query={query} recordCount={records.length} status={status} onQueryChange={setQuery} onSubmit={runQuery} /><DeltaUploadPanel files={files} busy={busy} message={message} onAddFiles={addFiles} onClear={() => { setFiles([]); setMessage(null); }} onAnalyze={analyze} /><div id="layout"><DeltaRoster records={visibleRecords} selectedId={selectedId} filter={filter} onFilterChange={setFilter} onSelect={setSelectedId} /><DeltaDossier record={selectedRecord} onSave={saveDraft} onDelete={removeDraft} onCollapse={() => setSelectedId(null)} /></div></div>;
}
```

- [ ] **步骤 4：运行 Delta 页面测试**

运行：

```powershell
npm test -- DeltaForcePage --reporter=basic
```

预期：上传、本地保存、搜索、编辑和删除测试通过。

---

### 任务 7：迁移原版样式并删除当前通用样式

**文件：**

- 新建：`frontend/src/tools/delta-force/delta-force.css`
- 修改：`frontend/src/styles.css`

- [ ] **步骤 1：复制原版样式作为唯一视觉基准**

将以下文件内容完整复制：

```text
E:/A Study/Coding/Delta Force/web/styles.css
-> E:/A Study/Coding/pp-tools/frontend/src/tools/delta-force/delta-force.css
```

保留原版变量、颜色、字体、指挥栏、上传区、花名册、档案、对比表、雷达和近期战绩规则。

- [ ] **步骤 2：添加网页路由适配规则**

在 `delta-force.css` 末尾追加：

```css
.delta-app {
  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
}

.delta-app .brand {
  text-decoration: none;
}

.delta-app .row-item {
  width: 100%;
  border-top: 0;
  border-right: 0;
  border-bottom: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}

.delta-app #files {
  color: var(--mut);
}

.delta-app button:focus-visible,
.delta-app a:focus-visible,
.delta-app input:focus-visible,
.delta-app textarea:focus-visible {
  outline: 2px solid var(--grn);
  outline-offset: 2px;
}

.delta-app .radar-grid,
.delta-app .radar-axis {
  fill: none;
  stroke: #262e31;
  stroke-width: 1;
}

.delta-app .radar-data {
  fill: rgba(37, 224, 141, .16);
  stroke: #25e08d;
  stroke-width: 2;
}

.delta-app .radar-dot {
  fill: #25e08d;
}

.delta-app .radar-label {
  fill: #93a0a4;
  font-size: 9px;
}

.delta-app .radar-number {
  fill: #e8edee;
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 760px) {
  #topbar {
    position: static;
    height: auto;
    padding: 14px 16px;
    flex-wrap: wrap;
  }

  #topbar .cmd {
    order: 3;
    flex-basis: 100%;
    max-width: none;
  }

  .top-meta {
    margin-left: auto;
  }

  #upload {
    margin-inline: 16px;
  }

  #layout {
    padding: 16px;
  }

  .strip .si {
    min-width: calc(50% - 26px);
  }

  table.cmp {
    min-width: 560px;
  }

  .sec-cmp {
    overflow-x: auto;
  }
}
```

- [ ] **步骤 3：删除旧 Delta 通用样式**

从 `frontend/src/styles.css` 删除 `.delta-page` 开始至文件末尾所有当前 Delta 专用规则，保留奶茶和后台样式。

- [ ] **步骤 4：运行测试与构建**

运行：

```powershell
npm test -- --reporter=basic
npm run build
```

预期：全部前端测试通过，生产构建成功。

- [ ] **步骤 5：GitHub Desktop 提交检查点**

提交摘要：

```text
feat: restore original delta force interface
```

---

### 任务 8：全量验证和真实浏览器验收

**文件：**

- 验证：`frontend/src/tools/delta-force/*`
- 验证：`backend/tests/*`

- [ ] **步骤 1：运行全部自动检查**

```powershell
cd "E:\A Study\Coding\pp-tools\backend"
.\.venv\Scripts\python.exe -m pytest -q

cd "E:\A Study\Coding\pp-tools\frontend"
npm test -- --reporter=basic
npm run build

cd "E:\A Study\Coding\pp-tools"
.\scripts\check-project.ps1
git diff --check
```

预期：后端、前端、构建、项目检查和差异检查全部通过。

- [ ] **步骤 2：运行仓库痕迹防护检查**

再次运行：

```powershell
.\scripts\check-project.ps1
```

预期：防护检查通过，仓库中没有秘密信息、工具署名或本地临时目录。

- [ ] **步骤 3：启动本地预览**

后端：

```powershell
cd "E:\A Study\Coding\pp-tools\backend"
.\.venv\Scripts\python.exe -m flask --app app:create_app run --host 127.0.0.1 --port 5175 --no-debugger --no-reload
```

前端：

```powershell
cd "E:\A Study\Coding\pp-tools\frontend"
npm run dev
```

打开：

```text
http://127.0.0.1:5176/tools/delta-force
```

- [ ] **步骤 4：桌面端对照原版**

对照 `E:/A Study/Coding/Delta Force/web` 检查：

- 深色背景、绿色强调色和字体层级一致。
- 顶部品牌、查询框、查询按钮和统计位置一致。
- 上传区默认折叠，展开后的布局一致。
- 左侧花名册和右侧档案宽度关系一致。
- KD 对比表、雷达图和近期战绩结构一致。

- [ ] **步骤 5：使用真实样例识别**

选择以下 4 张图片：

```text
E:/A Study/Coding/Delta Force/samples/upload_0_9cc7af44e330f1278b85e668132c0a6d.png
E:/A Study/Coding/Delta Force/samples/upload_1_1f8ef53cc750ac4262cc9e9098f17f0b.png
E:/A Study/Coding/Delta Force/samples/upload_2_462fed1588016bea9dc9c12de9fb8533.png
E:/A Study/Coding/Delta Force/samples/upload_3_64f3a59e4ec6cb7adfb2dbd23239f690.png
```

预期：

- 昵称为 `PeRo追风君子`。
- 段位为 `三角洲巅峰`。
- 总览 KD 为 `7.2 / 1.2 / 1.9`。
- 总场次为 `853`。
- 近期战绩显示 7 条。
- 识别后花名册新增档案，刷新页面后仍存在。

- [ ] **步骤 6：验证本地档案操作**

- 顶部输入昵称或 UID 可以打开档案。
- 左侧筛选可以缩小花名册。
- 修改备注后保存，刷新后内容仍存在。
- 删除需要确认，确认后档案消失。
- 其他浏览器配置文件看不到当前花名册。

- [ ] **步骤 7：验证移动端**

使用 `390 x 844` 视口检查：

- 页面无横向溢出。
- 指挥栏换行但不重叠。
- 花名册位于档案上方。
- KD、段位、撤离率和近期战绩结果可读。

- [ ] **步骤 8：检查浏览器控制台**

预期：没有错误或警告。

- [ ] **步骤 9：最终 GitHub Desktop 提交检查点**

提交摘要：

```text
test: verify restored delta force workflow
```

---

## 完成条件

- 当前通用 Delta 页面完全被原版深色工作台替换。
- 原版指挥栏、上传区、花名册、完整档案、雷达和近期战绩全部存在。
- 本地花名册支持新增或更新、搜索、编辑、保存、删除和刷新恢复。
- 真实截图识别结果可以填充原版档案。
- Delta 样式不会影响工具中心、Beauty Cam、奶茶店和奶茶后台。
- 桌面端与原版视觉结构一致，移动端无横向溢出。
- 所有自动测试、构建和项目检查通过。
