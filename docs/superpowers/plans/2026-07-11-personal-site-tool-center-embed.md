# 个人网站工具中心嵌入实施计划

> **执行要求：** 实施时必须使用 `executing-plans` 工作流逐项执行。每个任务先写失败测试，再做最小实现并验证。提交和推送仅由用户在 GitHub Desktop 中操作。

**目标：** 把 PP Tools 作为唯一工具源码嵌入个人网站的 `Software` 页面，支持站内 hash 路由、中英日三语、本机 Delta 识别和完整的响应式体验。

**架构：** PP Tools 增加可挂载的 React 嵌入入口和独立构建产物；个人网站继续使用现有静态外壳，通过全局挂载接口加载工具中心。个人网站管理语言与 hash，PP Tools 管理工具内部界面和业务状态；同步脚本只复制固定白名单产物。

**技术栈：** React 18、Vite 5、Vitest、Testing Library、原生 JavaScript、Node.js 内置测试与 HTTP 模块、Python/Flask 后端、GitHub Pages。

---

## 文件结构

### PP Tools 新建文件

- `frontend/src/i18n/messages.js`：三语字典、语言归一化和取值函数。
- `frontend/src/i18n/I18nContext.jsx`：React 语言上下文与 `useI18n()`。
- `frontend/src/i18n/messages.test.js`：语言键一致性和回退测试。
- `frontend/src/embed/routes.js`：嵌入路由白名单与归一化。
- `frontend/src/embed/routes.test.js`：路由测试。
- `frontend/src/embed/EmbeddedToolCenter.jsx`：嵌入模式页面分发器。
- `frontend/src/embed/EmbeddedToolCenter.test.jsx`：嵌入导航和语言更新测试。
- `frontend/src/embed/index.jsx`：`mountToolCenter()` 公共接口。
- `frontend/src/embed/index.test.jsx`：挂载、更新和卸载测试。
- `frontend/src/embed/embed.css`：嵌入容器边界样式。
- `frontend/src/pages/MilkTeaSourcePage.jsx`：奶茶源码说明页。
- `frontend/src/pages/MilkTeaSourcePage.test.jsx`：三语下载页面测试。
- `frontend/vite.embed.config.js`：IIFE 嵌入包构建配置。
- `scripts/sync_personal_site_embed.mjs`：构建产物白名单同步脚本。
- `scripts/sync_personal_site_embed.test.mjs`：同步、清理和校验测试。

### PP Tools 修改文件

- `frontend/package.json`：增加嵌入测试、构建和同步命令。
- `frontend/src/App.jsx`：独立站点使用中文语言提供器，保持现有路由。
- `frontend/src/pages/HomePage.jsx`：工具内容进入语言字典，复用奶茶详情入口。
- `frontend/src/tools/delta-force/*.jsx`：固定文案改用语言上下文，识别地址可配置。
- `frontend/src/tools/beauty-cam/*.jsx`：固定文案改用语言上下文，资源根路径可配置。
- `frontend/src/tools/beauty-cam/useCameraStream.js`：卸载时强制停止媒体轨道。
- `frontend/src/tools/beauty-cam/visionRuntime.js`：模型和 WASM 地址使用资源根路径。
- `frontend/src/pages/home.css`、`frontend/src/styles.css`：嵌入模式和三语文本适配。
- `scripts/check-project.ps1`：增加嵌入构建和同步文件检查。

### 个人网站新建文件

- `js/software-routing.js`：可在浏览器和 Node 测试中复用的 Software hash 解析器。
- `js/tool-embed-loader.js`：可在浏览器和 Node 测试中复用的资源加载与挂载控制器。
- `tests/software-route.test.js`：Software hash 解析测试。
- `tests/tool-embed-loader.test.js`：资源加载、控制器更新和卸载测试。
- `tools/pp-tools/`：同步生成的 JS、CSS、图片、模型、WASM 和奶茶 ZIP。

### 个人网站修改文件

- `index.html`：在 `app.js` 前加载两个 Software 辅助模块。
- `js/app.js`：替换旧 Software 渲染，增加子路由、嵌入加载和生命周期管理。
- `css/style.css`：增加 Software 全宽容器、加载错误和样式隔离规则。
- `local-server.js`：把 Delta 请求代理到 PP Tools 本机后端。
- `tests/local-server.test.js`：代理成功与离线测试。
- `start-site.bat`：提示并使用新的本机联调入口。
- `scripts/check-site.mjs`：检查嵌入产物和奶茶 ZIP。
- `tests/miniprogram-download.test.cjs`：下载地址切换到同步目录。

---

### 任务 1：建立三语字典与 React 语言上下文

**文件：**

- 新建：`E:/A Study/Coding/pp-tools/frontend/src/i18n/messages.js`
- 新建：`E:/A Study/Coding/pp-tools/frontend/src/i18n/I18nContext.jsx`
- 新建：`E:/A Study/Coding/pp-tools/frontend/src/i18n/messages.test.js`

- [ ] **步骤 1：编写失败测试**

测试三种语言拥有完全相同的叶子键，未知语言归一化为中文，缺失翻译回退中文：

```javascript
import { describe, expect, it } from "vitest";
import { getMessage, listMessageKeys, normalizeLanguage } from "./messages";

describe("tool messages", () => {
  it("keeps zh en and ja message keys aligned", () => {
    expect(listMessageKeys("en")).toEqual(listMessageKeys("zh"));
    expect(listMessageKeys("ja")).toEqual(listMessageKeys("zh"));
  });

  it("normalizes unsupported languages and falls back to Chinese", () => {
    expect(normalizeLanguage("fr")).toBe("zh");
    expect(getMessage("en", "common.retry")).toBe("Retry");
    expect(getMessage("fr", "common.retry")).toBe("重试");
    expect(getMessage("en", "missing.key")).toBe("missing.key");
  });
});
```

- [ ] **步骤 2：运行测试并确认失败**

运行：

```powershell
cd "E:\A Study\Coding\pp-tools\frontend"
npm test -- --run src/i18n/messages.test.js
```

预期：失败，提示找不到 `src/i18n/messages.js`。

- [ ] **步骤 3：实现语言基础**

`messages.js` 导出固定语言列表、嵌套字典、点路径取值和键列表：

```javascript
export const SUPPORTED_LANGUAGES = ["zh", "en", "ja"];

export const messages = {
  zh: {
    common: { back: "返回工具中心", loading: "正在加载…", retry: "重试", unavailable: "暂时不可用" },
    home: { kicker: "PP TOOLS · ONLINE SUITE", title: "我的在线工具箱", summary: "两个网页工具和一个小程序源码项目。" },
  },
  en: {
    common: { back: "Back to tools", loading: "Loading…", retry: "Retry", unavailable: "Unavailable" },
    home: { kicker: "PP TOOLS · ONLINE SUITE", title: "My Online Toolbox", summary: "Two browser tools and one mini program source project." },
  },
  ja: {
    common: { back: "ツール一覧へ戻る", loading: "読み込み中…", retry: "再試行", unavailable: "現在利用できません" },
    home: { kicker: "PP TOOLS · ONLINE SUITE", title: "オンラインツールボックス", summary: "ブラウザツール2つとミニプログラムのソースプロジェクト。" },
  },
};

export function normalizeLanguage(language) {
  return SUPPORTED_LANGUAGES.includes(language) ? language : "zh";
}

function readPath(source, path) {
  return path.split(".").reduce((value, key) => value && value[key], source);
}

export function getMessage(language, path) {
  const normalized = normalizeLanguage(language);
  return readPath(messages[normalized], path) ?? readPath(messages.zh, path) ?? path;
}

function flatten(source, prefix = "") {
  return Object.entries(source).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object" ? flatten(value, path) : [path];
  });
}

export function listMessageKeys(language) {
  return flatten(messages[normalizeLanguage(language)]).sort();
}
```

`I18nContext.jsx` 提供 `language`、`t(path)` 和运行配置：

```jsx
import { createContext, useContext, useMemo } from "react";
import { getMessage, normalizeLanguage } from "./messages";

const I18nContext = createContext(null);

export function I18nProvider({ language, config = {}, children }) {
  const value = useMemo(() => {
    const normalized = normalizeLanguage(language);
    return { language: normalized, config, t: (path) => getMessage(normalized, path) };
  }, [language, config]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("I18nProvider is required");
  return value;
}
```

随后把设计规格中列出的工具中心、Delta、相机、奶茶和通用固定文案全部加入三种语言；键集合测试必须保持一致。

- [ ] **步骤 4：运行语言测试**

运行：`npm test -- --run src/i18n/messages.test.js`  
预期：全部通过。

- [ ] **步骤 5：GitHub Desktop 检查点**

在 PP Tools Changes 中确认只包含语言基础文件；建议摘要：`feat: add multilingual tool messages`。由用户决定何时提交。

---

### 任务 2：建立嵌入路由模型和页面分发器

**文件：**

- 新建：`frontend/src/embed/routes.js`
- 新建：`frontend/src/embed/routes.test.js`
- 新建：`frontend/src/embed/EmbeddedToolCenter.jsx`
- 新建：`frontend/src/embed/EmbeddedToolCenter.test.jsx`

- [ ] **步骤 1：编写路由失败测试**

```javascript
import { describe, expect, it } from "vitest";
import { normalizeToolRoute } from "./routes";

it("normalizes supported and unknown tool routes", () => {
  expect(normalizeToolRoute("home")).toBe("home");
  expect(normalizeToolRoute("delta-force")).toBe("delta-force");
  expect(normalizeToolRoute("beauty-cam")).toBe("beauty-cam");
  expect(normalizeToolRoute("milk-tea")).toBe("milk-tea");
  expect(normalizeToolRoute("unknown")).toBe("home");
});
```

- [ ] **步骤 2：运行并确认失败**

运行：`npm test -- --run src/embed/routes.test.js`  
预期：失败，提示模块不存在。

- [ ] **步骤 3：实现固定路由表**

```javascript
export const TOOL_ROUTES = ["home", "delta-force", "beauty-cam", "milk-tea"];

export function normalizeToolRoute(route) {
  return TOOL_ROUTES.includes(route) ? route : "home";
}
```

- [ ] **步骤 4：编写页面分发失败测试**

渲染 `EmbeddedToolCenter`，验证未知路由回到工具中心，点击 Delta 后调用 `onNavigate("delta-force")`，语言变化后标题更新。

```jsx
const { rerender } = render(
  <EmbeddedToolCenter language="zh" route="home" onNavigate={onNavigate} />,
);
expect(screen.getByRole("heading", { name: "我的在线工具箱" })).toBeInTheDocument();
await user.click(screen.getByRole("link", { name: "查看战绩" }));
expect(onNavigate).toHaveBeenCalledWith("delta-force");
rerender(<EmbeddedToolCenter language="en" route="home" onNavigate={onNavigate} />);
expect(screen.getByRole("heading", { name: "My Online Toolbox" })).toBeInTheDocument();
```

- [ ] **步骤 5：实现分发器**

`EmbeddedToolCenter` 使用 `I18nProvider` 包裹页面，根据归一化路由渲染 Home、Delta、BeautyCam 或 MilkTeaSource。所有详情页顶部加入调用 `onNavigate("home")` 的返回按钮。

- [ ] **步骤 6：运行嵌入路由测试**

运行：`npm test -- --run src/embed/routes.test.js src/embed/EmbeddedToolCenter.test.jsx`  
预期：全部通过。

- [ ] **步骤 7：GitHub Desktop 检查点**

建议摘要：`feat: add embedded tool routing`。

---

### 任务 3：把工具中心和奶茶源码页接入三语系统

**文件：**

- 修改：`frontend/src/pages/HomePage.jsx`
- 修改：`frontend/src/pages/HomePage.test.jsx`
- 新建：`frontend/src/pages/MilkTeaSourcePage.jsx`
- 新建：`frontend/src/pages/MilkTeaSourcePage.test.jsx`

- [ ] **步骤 1：扩展失败测试**

为 HomePage 增加英文和日文渲染测试；工具卡点击使用 `onNavigate`，奶茶卡进入详情而不是立即下载。为奶茶详情验证三语标题、导入说明和固定下载文件名。

```jsx
render(<I18nProvider language="en"><HomePage onNavigate={onNavigate} /></I18nProvider>);
expect(screen.getByText("My Online Toolbox")).toBeInTheDocument();
await user.click(screen.getByRole("link", { name: "View stats" }));
expect(onNavigate).toHaveBeenCalledWith("delta-force");

render(<I18nProvider language="ja"><MilkTeaSourcePage assetBaseUrl="/tools/pp-tools" /></I18nProvider>);
expect(screen.getByRole("link", { name: /ソースをダウンロード/ })).toHaveAttribute(
  "href",
  "/tools/pp-tools/downloads/sanpingfang-miniprogram-source.zip",
);
```

- [ ] **步骤 2：运行并确认失败**

运行：`npm test -- --run src/pages/HomePage.test.jsx src/pages/MilkTeaSourcePage.test.jsx`  
预期：旧 HomePage 不接受嵌入导航，奶茶源码页不存在。

- [ ] **步骤 3：实现工具中心数据工厂**

把工具标题、说明、状态、功能标签和按钮改为语言键；HomePage 接收 `onNavigate` 和 `embedded`。独立站点 `embedded=false` 时继续生成现有 `/tools/...` 地址，嵌入模式调用 `onNavigate`。

- [ ] **步骤 4：实现奶茶源码详情页**

页面包含项目图、原生小程序、本地演示、云模式可选、导入步骤和下载按钮。下载地址通过安全的 `joinAssetUrl(assetBaseUrl, "downloads/sanpingfang-miniprogram-source.zip")` 生成，禁止 `..` 路径。

- [ ] **步骤 5：运行页面测试和现有 App 测试**

运行：`npm test -- --run src/pages/HomePage.test.jsx src/pages/MilkTeaSourcePage.test.jsx src/App.test.jsx`  
预期：全部通过，独立站点旧路由仍正常。

- [ ] **步骤 6：GitHub Desktop 检查点**

建议摘要：`feat: add multilingual tool gallery`。

---

### 任务 4：改造 Delta 三语文案和可配置后端

**文件：**

- 修改：`frontend/src/tools/delta-force/DeltaForcePage.jsx`
- 修改：`frontend/src/tools/delta-force/DeltaCommandBar.jsx`
- 修改：`frontend/src/tools/delta-force/DeltaDossier.jsx`
- 修改：`frontend/src/tools/delta-force/DeltaRoster.jsx`
- 修改：`frontend/src/tools/delta-force/DeltaUploadPanel.jsx`
- 修改：`frontend/src/tools/delta-force/DeltaForcePage.test.jsx`
- 修改：`frontend/src/api/client.js`
- 修改：`frontend/src/api/client.test.js`

- [ ] **步骤 1：编写 API 地址失败测试**

```javascript
expect(buildApiUrl("http://127.0.0.1:5175", "/api/delta-force/analyze"))
  .toBe("http://127.0.0.1:5175/api/delta-force/analyze");
expect(buildApiUrl("", "/api/health")).toBe("/api/health");
```

页面测试模拟 `fetch` 抛出 `TypeError`，验证英文状态显示 `Local recognition service is offline`，文件仍保留在上传列表。

- [ ] **步骤 2：运行并确认失败**

运行：`npm test -- --run src/api/client.test.js src/tools/delta-force/DeltaForcePage.test.jsx`。

- [ ] **步骤 3：实现 URL 构造和离线分类**

`buildApiUrl(base, path)` 去除 base 尾部斜杠并保证 path 以 `/` 开头。`DeltaForcePage` 从 `useI18n().config.apiBaseUrl` 读取地址，网络错误映射到 `delta.errors.offline`，HTTP 错误继续显示服务端消息。

- [ ] **步骤 4：替换 Delta 固定文案**

五个组件全部使用 `t()`，覆盖上传、拖入、粘贴、筛选、档案、删除、识别状态、空状态和按钮。状态数据只保存稳定代码，例如 `idle/run/ok/warn/err`，渲染时再翻译，确保切换语言后已有状态同步变化。

- [ ] **步骤 5：运行 Delta 全部测试**

运行：`npm test -- --run src/api/client.test.js src/tools/delta-force`  
预期：现有记录存储、视图模型和页面测试全部通过。

- [ ] **步骤 6：GitHub Desktop 检查点**

建议摘要：`feat: localize embedded stats tool`。

---

### 任务 5：改造手势相机三语文案、资源路径和卸载生命周期

**文件：**

- 修改：`frontend/src/tools/beauty-cam/BeautyCamPage.jsx`
- 修改：`frontend/src/tools/beauty-cam/BeautyControls.jsx`
- 修改：`frontend/src/tools/beauty-cam/CameraStage.jsx`
- 修改：`frontend/src/tools/beauty-cam/CapturePreview.jsx`
- 修改：`frontend/src/tools/beauty-cam/useCameraStream.js`
- 修改：`frontend/src/tools/beauty-cam/useCameraStream.test.jsx`
- 修改：`frontend/src/tools/beauty-cam/visionRuntime.js`
- 修改：`frontend/src/tools/beauty-cam/BeautyCamPage.test.jsx`

- [ ] **步骤 1：编写卸载与资源路径失败测试**

```jsx
const stop = vi.fn();
navigator.mediaDevices.getUserMedia.mockResolvedValue({ getTracks: () => [{ stop }] });
const { unmount } = render(<BeautyCamPage />);
await user.click(screen.getByRole("button", { name: "启动相机" }));
unmount();
expect(stop).toHaveBeenCalledTimes(1);
```

为 `visionRuntime` 验证 `/tools/pp-tools/vision` 能生成模型和 WASM 的完整地址。

- [ ] **步骤 2：运行并确认失败**

运行：`npm test -- --run src/tools/beauty-cam/useCameraStream.test.jsx src/tools/beauty-cam/BeautyCamPage.test.jsx`。

- [ ] **步骤 3：实现明确的媒体清理**

`useCameraStream` 的 effect cleanup 遍历 `stream.getTracks()` 并调用 `stop()`，清空 video `srcObject`，取消仍在等待的启动请求。重复卸载不得重复停止同一轨道。

- [ ] **步骤 4：实现资源根路径**

`visionRuntime` 接收 `assetBaseUrl`，通过 URL 拼接函数生成：

```javascript
const visionBase = `${assetBaseUrl.replace(/\/$/, "")}/vision`;
const wasmBase = `${visionBase}/wasm`;
const faceModel = `${visionBase}/models/face_landmarker.task`;
const handModel = `${visionBase}/models/hand_landmarker.task`;
```

- [ ] **步骤 5：替换相机固定文案**

四个组件使用 `t()`，区分权限拒绝、设备缺失、模型失败和运行中断。滤镜、强度、手势、拍照、重拍和保存等控件具有三语可访问名称。

- [ ] **步骤 6：运行相机全部测试**

运行：`npm test -- --run src/tools/beauty-cam`  
预期：全部通过。

- [ ] **步骤 7：GitHub Desktop 检查点**

建议摘要：`feat: localize and isolate camera runtime`。

---

### 任务 6：实现公共挂载接口和嵌入构建

**文件：**

- 新建：`frontend/src/embed/index.jsx`
- 新建：`frontend/src/embed/index.test.jsx`
- 新建：`frontend/src/embed/embed.css`
- 新建：`frontend/vite.embed.config.js`
- 修改：`frontend/package.json`

- [ ] **步骤 1：编写挂载生命周期失败测试**

```jsx
const controller = mountToolCenter(container, {
  language: "zh",
  route: "home",
  assetBaseUrl: "/tools/pp-tools",
  apiBaseUrl: "",
  onNavigate,
});
expect(container).toHaveTextContent("我的在线工具箱");
controller.update({ language: "en", route: "home" });
expect(container).toHaveTextContent("My Online Toolbox");
controller.unmount();
expect(container).toBeEmptyDOMElement();
```

另测同一容器二次挂载先卸载旧根节点，不生成重复 React root。

- [ ] **步骤 2：运行并确认失败**

运行：`npm test -- --run src/embed/index.test.jsx`。

- [ ] **步骤 3：实现挂载控制器**

使用 `WeakMap<Element, Controller>` 保存容器状态。`update()` 合并新配置并重新 render；`unmount()` 调用 React root 的 `unmount()` 并删除 WeakMap 条目。入口只导出 `mountToolCenter`。

- [ ] **步骤 4：配置 IIFE 构建**

`vite.embed.config.js` 使用 library 模式：

```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist-embed",
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, "src/embed/index.jsx"),
      name: "PPToolsEmbed",
      formats: ["iife"],
      fileName: () => "pp-tools-embed.js",
    },
    rollupOptions: {
      output: { assetFileNames: (asset) => asset.name?.endsWith(".css") ? "pp-tools-embed.css" : "assets/[name][extname]" },
    },
  },
});
```

`package.json` 增加：

```json
"build:embed": "vite build --config vite.embed.config.js"
```

- [ ] **步骤 5：运行测试和嵌入构建**

运行：

```powershell
npm test -- --run src/embed
npm run build:embed
```

预期：`dist-embed/pp-tools-embed.js` 和 `dist-embed/pp-tools-embed.css` 存在，构建退出码为 0。

- [ ] **步骤 6：运行独立站点回归**

运行：`npm test` 和 `npm run build`  
预期：现有独立站点测试和生产构建全部通过。

- [ ] **步骤 7：GitHub Desktop 检查点**

建议摘要：`feat: add personal site embed build`。

---

### 任务 7：实现白名单同步脚本

**文件：**

- 新建：`scripts/sync_personal_site_embed.mjs`
- 新建：`scripts/sync_personal_site_embed.test.mjs`
- 修改：`frontend/package.json`

- [ ] **步骤 1：编写同步失败测试**

在临时目录创建旧文件、嵌入 JS/CSS、图片、vision 目录和 ZIP。执行 `syncEmbed()` 后验证旧文件消失、白名单文件存在、非白名单私有文件未复制、ZIP 哈希一致。

```javascript
assert.equal(await exists(path.join(target, "old.js")), false);
assert.equal(await exists(path.join(target, "pp-tools-embed.js")), true);
assert.equal(await exists(path.join(target, "private.txt")), false);
assert.equal(await sha256(sourceZip), await sha256(targetZip));
```

- [ ] **步骤 2：运行并确认失败**

运行：`node --test scripts/sync_personal_site_embed.test.mjs`  
预期：失败，提示同步模块不存在。

- [ ] **步骤 3：实现安全同步**

脚本接收 `--site-root`，解析绝对路径并确认目标严格位于 `<site-root>/tools/pp-tools`。白名单只允许：

- `pp-tools-embed.js`
- `pp-tools-embed.css`
- `images/tools/**`
- `vision/models/**`
- `vision/wasm/**`
- `downloads/sanpingfang-miniprogram-source.zip`

清理前再次校验目标边界；缺少任一必需文件立即失败。输出复制文件数、总字节数和 ZIP SHA-256。

- [ ] **步骤 4：增加命令**

在 `frontend/package.json` 增加：

```json
"sync:personal-site": "npm run build:embed && node ../scripts/sync_personal_site_embed.mjs --site-root ../../My"
```

- [ ] **步骤 5：运行测试和真实同步**

运行：

```powershell
node --test scripts/sync_personal_site_embed.test.mjs
cd frontend
npm run sync:personal-site
```

预期：测试通过，个人网站 `tools/pp-tools` 生成完整产物，两个奶茶 ZIP 哈希一致。

- [ ] **步骤 6：GitHub Desktop 检查点**

PP Tools 建议摘要：`build: add personal site embed sync`。个人网站只检查生成目录，暂不单独提交。

---

### 任务 8：改造个人网站 hash 路由和嵌入加载器

**文件：**

- 新建：`E:/A Study/Coding/My/js/software-routing.js`
- 新建：`E:/A Study/Coding/My/js/tool-embed-loader.js`
- 修改：`E:/A Study/Coding/My/index.html`
- 修改：`E:/A Study/Coding/My/js/app.js`
- 新建：`E:/A Study/Coding/My/tests/software-route.test.js`
- 新建：`E:/A Study/Coding/My/tests/tool-embed-loader.test.js`

- [ ] **步骤 1：编写路由模块失败测试**

`software-routing.js` 使用浏览器全局与 CommonJS 双出口，测试其公共函数：

```javascript
assert.deepEqual(parseSiteHash("#software/delta-force"), { view: "software", toolRoute: "delta-force" });
assert.deepEqual(parseSiteHash("#software/unknown"), { view: "software", toolRoute: "home" });
assert.deepEqual(parseSiteHash("#diary"), { view: "diary", toolRoute: "home" });
assert.equal(toSoftwareHash("beauty-cam"), "#software/beauty-cam");
```

- [ ] **步骤 2：运行并确认失败**

运行：`node --test tests/software-route.test.js tests/tool-embed-loader.test.js`。

- [ ] **步骤 3：实现路由解析**

`software-routing.js` 使用 IIFE 工厂，浏览器端暴露 `window.SoftwareRouting`，Node 端设置 `module.exports`。它导出 `parseSiteHash()`、`toSoftwareHash()` 和路由白名单。`app.js` 的 `switchView()` 只接收主视图，不把 `#software/delta-force` 误判为未知页面。hashchange 时先解析，再切换主视图并更新嵌入控制器。顶部“软件”按钮始终进入 `#software`。

- [ ] **步骤 4：实现资源加载器**

`tool-embed-loader.js` 同样使用浏览器全局与 CommonJS 双出口，浏览器端暴露 `window.ToolEmbedLoader`。加载器只创建一次：

```javascript
const EMBED_BASE = "tools/pp-tools";
const EMBED_SCRIPT = `${EMBED_BASE}/pp-tools-embed.js`;
const EMBED_STYLE = `${EMBED_BASE}/pp-tools-embed.css`;
```

先插入 CSS，再加载 JS；成功后检查 `window.PPToolsEmbed.mountToolCenter`。加载失败显示当前语言错误和重试按钮。并发调用共享同一个 Promise，避免重复 script。

`index.html` 在 `js/app.js` 前按顺序加载 `js/software-routing.js` 和 `js/tool-embed-loader.js`，正式页面不依赖 Node 模块加载器。

- [ ] **步骤 5：实现控制器生命周期**

首次进入 Software 时调用 `window.PPToolsEmbed.mountToolCenter(container, options)` 保存控制器；已有控制器时更新：

```javascript
controller.update({
  language: lang,
  route: toolRoute,
  assetBaseUrl: EMBED_BASE,
  apiBaseUrl: "",
  onNavigate: (route) => { location.hash = toSoftwareHash(route); },
});
```

离开 Software 时调用 `controller.unmount()`。`setLang()` 重新渲染外壳后必须重新挂载当前工具，不丢失 hash。

- [ ] **步骤 6：移除旧 Software 交互**

删除旧卡片、预览弹窗、`openSoftwarePreview()`、`closeSoftwarePreview()` 和对应点击监听。`CONTENT.software` 暂时保留，避免把内容清理与功能改造混在同一次变更；页面不再读取它。

- [ ] **步骤 7：运行个人网站路由与加载器测试**

运行：`node --test tests/software-route.test.js tests/tool-embed-loader.test.js`  
预期：全部通过。

- [ ] **步骤 8：GitHub Desktop 检查点**

个人网站建议摘要：`feat: embed tool center in software view`。

---

### 任务 9：为个人网站本机服务增加 Delta 代理

**文件：**

- 修改：`E:/A Study/Coding/My/local-server.js`
- 修改：`E:/A Study/Coding/My/tests/local-server.test.js`
- 修改：`E:/A Study/Coding/My/start-site.bat`

- [ ] **步骤 1：编写代理失败测试**

启动临时上游服务和个人网站服务，请求 `/api/delta-force/analyze`，验证方法、请求体和响应状态被透传。关闭上游后再次请求，验证返回 503 JSON：

```javascript
assert.equal(response.status, 503);
assert.deepEqual(await response.json(), { error: "Local recognition service is offline." });
```

- [ ] **步骤 2：运行并确认失败**

运行：`node --test tests/local-server.test.js`  
预期：当前服务器把请求交给日记 API 并返回错误。

- [ ] **步骤 3：实现限定路径代理**

只代理 `/api/delta-force/` 和 `/api/health`，目标来自 `PP_TOOLS_API_ORIGIN`，默认 `http://127.0.0.1:5175`。使用 Node `http.request` 流式转发方法、请求头和请求体；移除 `host` 头。连接失败返回 503，不影响日记 API。

- [ ] **步骤 4：调整前端配置**

个人网站嵌入配置的 `apiBaseUrl` 保持空字符串，使 Delta 使用同源 `/api/...`，由本机服务器代理。未来公网部署时只替换配置值。

- [ ] **步骤 5：更新启动提示**

`start-site.bat` 先提示“Delta 截图识别需要 PP Tools 本机后端运行”，再启动个人网站。暂不自动关闭或接管用户已有的后端进程。

- [ ] **步骤 6：运行本机服务测试**

运行：`node --test tests/local-server.test.js`  
预期：日记读写测试和 Delta 代理测试全部通过。

- [ ] **步骤 7：GitHub Desktop 检查点**

建议摘要：`feat: proxy local stats recognition`。

---

### 任务 10：完成样式隔离与响应式布局

**文件：**

- 新建：`frontend/src/embed/embed.css`
- 修改：`frontend/src/pages/home.css`
- 修改：`frontend/src/styles.css`
- 修改：`E:/A Study/Coding/My/css/style.css`

- [ ] **步骤 1：增加样式结构断言**

在嵌入组件测试验证根节点有 `pp-tools-embed`，独立 App 根节点仍有 `tool-site`。个人网站测试验证 Software 激活时增加 `software-embedded` 类，其他视图移除该类。

- [ ] **步骤 2：运行并确认失败**

运行 PP Tools 嵌入测试和个人网站加载器测试，确认类名断言失败。

- [ ] **步骤 3：实现命名空间**

嵌入样式全部以 `.pp-tools-embed` 为根；不能使用无前缀的 `h1`、`button`、`main` 或 `a` 选择器。颜色变量定义在嵌入根节点，避免覆盖个人网站变量。

- [ ] **步骤 4：实现个人网站容器规则**

`#view-software.software-embedded` 放宽到工具内容宽度，移除旧卡片专用间距，并保留顶部导航安全区。加载、失败和重试状态使用个人网站现有颜色与圆角。

- [ ] **步骤 5：实现桌面与手机布局**

在 880 和 560 像素断点下切换单列、调整 hero 高度、标题字号、内容内边距和工具按钮。详情页固定工具栏不得与个人网站顶部导航重叠。

- [ ] **步骤 6：运行全部前端测试与构建**

运行：

```powershell
cd "E:\A Study\Coding\pp-tools\frontend"
npm test
npm run build
npm run build:embed

cd "E:\A Study\Coding\My"
node --test tests/*.test.js tests/*.test.cjs
```

预期：全部通过。

- [ ] **步骤 7：GitHub Desktop 检查点**

PP Tools 建议摘要：`style: support embedded tool center`。个人网站建议摘要：`style: integrate software tool center`。

---

### 任务 11：更新检查脚本并完成真实验收

**文件：**

- 修改：`scripts/check-project.ps1`
- 修改：`E:/A Study/Coding/My/scripts/check-site.mjs`
- 修改：`E:/A Study/Coding/My/tests/miniprogram-download.test.cjs`
- 修改：`docs/superpowers/specs/2026-07-11-personal-site-tool-center-embed-design.md`

- [ ] **步骤 1：扩展项目检查**

PP Tools 检查脚本验证嵌入配置、同步脚本和 dist 必需文件。个人网站检查脚本验证：

```javascript
const requiredEmbedPaths = [
  "tools/pp-tools/pp-tools-embed.js",
  "tools/pp-tools/pp-tools-embed.css",
  "tools/pp-tools/images/tools/delta-force.webp",
  "tools/pp-tools/vision/models/face_landmarker.task",
  "tools/pp-tools/vision/models/hand_landmarker.task",
  "tools/pp-tools/downloads/sanpingfang-miniprogram-source.zip",
];
```

奶茶下载测试改为新路径，并比较两个 ZIP SHA-256。

- [ ] **步骤 2：执行完整自动检查**

运行：

```powershell
cd "E:\A Study\Coding\pp-tools"
backend\.venv\Scripts\python.exe -m pytest -q
cd frontend
npm test
npm run build
npm run sync:personal-site
cd ..
& .\scripts\check-project.ps1

cd "E:\A Study\Coding\My"
node --test tests/*.test.js tests/*.test.cjs
node scripts\check-site.mjs
```

预期：所有命令退出码为 0，两个 ZIP 校验值一致。

- [ ] **步骤 3：本机 Delta 正常状态验收**

启动 PP Tools 后端和个人网站，打开 `#software/delta-force`，上传有效截图，确认识别结果进入本地档案。切换中、英、日三语，确认固定文案更新且识别数据不变。

- [ ] **步骤 4：本机 Delta 离线状态验收**

停止 PP Tools 后端但保持个人网站服务，重新识别，确认显示当前语言的离线提示、已选文件仍存在、历史档案仍可浏览。

- [ ] **步骤 5：相机生命周期验收**

打开 `#software/beauty-cam`，允许摄像头并确认预览非空；切换到 `#software`、日记和主页，确认浏览器摄像头占用标识消失。再次进入相机可以重新启动。另验证拒绝权限后的三语错误和重试。

- [ ] **步骤 6：浏览器桌面和手机验收**

在 1440×900 与 390×844 下依次验证：

- 主页、软件、日记、关于四个主导航。
- 工具中心、Delta、相机、奶茶四个 Software 路由。
- 浏览器前进、后退和刷新。
- 中、英、日切换。
- 顶部导航遮挡、横向溢出、按钮裁切和长文本换行。
- 奶茶 ZIP 下载文件名和解压有效性。

- [ ] **步骤 7：格式与敏感信息检查**

三个仓库分别运行 `git diff --check`。扫描固定 AppID、云环境 ID、长格式密钥和私有项目配置；确认嵌入产物不包含本机绝对路径或编辑器临时配置目录。

- [ ] **步骤 8：更新规格状态**

全部验收通过后，把 spec 中 `状态：待审阅` 改为 `状态：已完成`，并记录最终嵌入产物和奶茶 ZIP 校验值。

- [ ] **步骤 9：由用户完成最终提交**

在 GitHub Desktop 中分别检查两个仓库。建议提交摘要：

- PP Tools：`feat: add embeddable multilingual tool center`
- 个人网站：`feat: integrate online tool center`

由用户决定提交和推送时间，执行过程不自动操作远端仓库。
