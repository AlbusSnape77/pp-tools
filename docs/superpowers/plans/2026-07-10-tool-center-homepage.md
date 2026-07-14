# 工具中心首页实施计划

> **执行要求：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务执行，并使用复选框跟踪进度。

**目标：** 将临时工具卡片页改造成与个人网站一致的粉青作品长廊，并为三个工具提供真实预览和准确入口。

**架构：** `AppLayout` 只负责公共胶囊导航和站点外壳，`HomePage` 只负责首页内容与工具元数据，`home.css` 只作用于工具站点和首页。Delta 继续使用独立懒加载样式，不进入公共外壳。

**技术栈：** React 18、Vite 5、CSS、Vitest、Testing Library、真实浏览器响应式验收。

---

## 文件结构

- 创建 `frontend/src/pages/home.css`：公共导航、首页背景、作品长廊和响应式样式。
- 创建 `frontend/src/pages/HomePage.test.jsx`：首页结构、入口、图片和状态测试。
- 创建 `frontend/public/images/tools/delta-force.webp`：Delta 真实预览。
- 创建 `frontend/public/images/tools/gesture-cam.webp`：手势相机真实预览。
- 创建 `frontend/public/images/tools/milk-tea.webp`：奶茶项目真实预览。
- 修改 `frontend/src/pages/HomePage.jsx`：中文首屏和三个宽幅作品模块。
- 修改 `frontend/src/components/AppLayout.jsx`：悬浮胶囊导航和个人网站入口。
- 修改 `frontend/src/App.test.jsx`：更新公共导航和首页路由断言。
- 修改 `frontend/src/styles.css`：删除旧首页、旧导航样式，保留奶茶与管理端现有样式。

## 任务 1：用测试锁定新首页结构

**文件：**

- 创建：`frontend/src/pages/HomePage.test.jsx`
- 修改：`frontend/src/App.test.jsx`

- [ ] **步骤 1：创建首页失败测试**

```jsx
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import HomePage from "./HomePage";

afterEach(cleanup);

describe("HomePage", () => {
  it("renders the Chinese tool gallery with real previews", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: "我的在线工具箱" })).toBeInTheDocument();
    const gallery = screen.getByRole("region", { name: "在线工具" });
    const entryLinks = [
      within(gallery).getByRole("link", { name: "进入Delta 战绩分析" }),
      within(gallery).getByRole("link", { name: "进入手势美颜相机" }),
      within(gallery).getByRole("link", { name: "进入三平方奶茶店" }),
    ];
    expect(entryLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/tools/delta-force",
      "/tools/beauty-cam",
      "/tools/milk-tea",
    ]);
    expect(within(gallery).getAllByRole("img")).toHaveLength(3);
    expect(within(gallery).getByText("可直接使用")).toBeInTheDocument();
    expect(within(gallery).getAllByText("建设中")).toHaveLength(2);
  });
});
```

- [ ] **步骤 2：更新应用路由测试中的首页断言**

将 `frontend/src/App.test.jsx` 的第一个测试改为：

```jsx
it("renders the Chinese tool center and shared navigation", () => {
  render(<App />);

  expect(screen.getByRole("heading", { name: "我的在线工具箱" })).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
  expect(within(screen.getByRole("banner")).getByRole("link", { name: "返回个人网站" })).toHaveAttribute(
    "href",
    "https://albussnape77.github.io",
  );
});
```

- [ ] **步骤 3：运行测试并确认失败**

运行：

```powershell
npm test -- HomePage App --reporter=basic
```

工作目录：`frontend`

预期：测试失败，提示找不到“我的在线工具箱”或“主导航”。

- [ ] **步骤 4：GitHub Desktop 检查点**

此时只检查测试 diff，不提交。后续实现变绿后由用户统一提交。

## 任务 2：加入真实工具预览资源

**文件：**

- 创建：`frontend/public/images/tools/delta-force.webp`
- 创建：`frontend/public/images/tools/gesture-cam.webp`
- 创建：`frontend/public/images/tools/milk-tea.webp`

- [ ] **步骤 1：创建工具图片目录**

```powershell
New-Item -ItemType Directory -Force "frontend\public\images\tools"
```

- [ ] **步骤 2：复制三个现有项目预览**

```powershell
Copy-Item -LiteralPath "E:\A Study\Coding\My\pics\software\delta-force-preview.webp" -Destination "frontend\public\images\tools\delta-force.webp"
Copy-Item -LiteralPath "E:\A Study\Coding\My\pics\software\gesture-cam-preview.webp" -Destination "frontend\public\images\tools\gesture-cam.webp"
Copy-Item -LiteralPath "E:\A Study\Coding\My\pics\software\miniprogram-preview.webp" -Destination "frontend\public\images\tools\milk-tea.webp"
```

- [ ] **步骤 3：核对文件存在且不是空文件**

```powershell
Get-ChildItem "frontend\public\images\tools" | Select-Object Name,Length
```

预期：三个 `.webp` 文件的 `Length` 都大于 10000。

- [ ] **步骤 4：GitHub Desktop 检查点**

确认只出现三个预览文件，不包含原项目的其他图片或临时文件。

## 任务 3：实现公共胶囊导航

**文件：**

- 修改：`frontend/src/components/AppLayout.jsx`
- 测试：`frontend/src/App.test.jsx`

- [ ] **步骤 1：将公共外壳改为语义清晰的站点导航**

用以下内容替换 `AppLayout.jsx`：

```jsx
const NAV_ITEMS = [
  { href: "/", label: "工具首页" },
  { href: "/tools/delta-force", label: "Delta" },
  { href: "/tools/beauty-cam", label: "手势相机" },
  { href: "/tools/milk-tea", label: "奶茶店" },
];

export default function AppLayout({ children }) {
  const pathname = window.location.pathname;

  return (
    <div className="tool-site">
      <header className="site-header">
        <a className="site-brand" href="/" aria-label="PP Tools 工具首页">
          <span aria-hidden="true">✦</span>
          <strong>PP Tools</strong>
        </a>
        <nav className="site-nav" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <a
              className={pathname === item.href ? "is-active" : ""}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <a
          className="personal-site-link"
          href="https://albussnape77.github.io"
          aria-label="返回个人网站"
        >
          返回个人网站
        </a>
      </header>
      {children}
    </div>
  );
}
```

- [ ] **步骤 2：运行应用路由测试**

```powershell
npm test -- App --reporter=basic
```

预期：首页导航断言通过；首页标题断言仍可能失败；Delta 独立路由测试继续通过。

- [ ] **步骤 3：检查 Delta 不包含公共导航**

确认测试仍包含：

```jsx
expect(screen.queryByRole("navigation", { name: "主导航" })).not.toBeInTheDocument();
```

- [ ] **步骤 4：GitHub Desktop 检查点**

建议提交说明：`feat: add shared tool navigation`

提交和推送由用户在 GitHub Desktop 完成，执行者不得自动提交。

## 任务 4：实现作品长廊首页

**文件：**

- 修改：`frontend/src/pages/HomePage.jsx`
- 测试：`frontend/src/pages/HomePage.test.jsx`

- [ ] **步骤 1：替换首页工具数据与页面结构**

用以下内容替换 `HomePage.jsx`：

```jsx
import "./home.css";

const TOOLS = [
  {
    href: "/tools/delta-force",
    eyebrow: "战绩情报工作台",
    title: "Delta 战绩分析",
    description: "上传资料页截图，自动整理玩家数据、KD 对比、五维能力和最近战绩。",
    features: ["截图识别", "玩家档案", "本地花名册"],
    image: "/images/tools/delta-force.webp",
    imageAlt: "Delta 战绩分析玩家档案界面",
    action: "查看战绩",
    status: "可直接使用",
    ready: true,
  },
  {
    href: "/tools/beauty-cam",
    eyebrow: "浏览器实时影像",
    title: "手势美颜相机",
    description: "在浏览器中完成实时美颜、滤镜、手势特效和本地拍照。",
    features: ["实时美颜", "手势控制", "本地拍照"],
    image: "/images/tools/gesture-cam.webp",
    imageAlt: "手势美颜相机实时预览界面",
    action: "打开相机",
    status: "建设中",
    ready: false,
  },
  {
    href: "/tools/milk-tea",
    eyebrow: "在线点单系统",
    title: "三平方奶茶店",
    description: "浏览饮品、自定义甜度和加料，完成购物车、下单与订单查询。",
    features: ["在线点单", "订单查询", "店铺管理"],
    image: "/images/tools/milk-tea.webp",
    imageAlt: "三平方奶茶店商品与点单界面",
    action: "开始点单",
    status: "建设中",
    ready: false,
  },
];

export default function HomePage() {
  return (
    <main className="tool-home">
      <section className="home-hero">
        <div className="hero-spark hero-spark-left" aria-hidden="true">✦</div>
        <div className="hero-spark hero-spark-right" aria-hidden="true">♪</div>
        <p className="home-kicker">PP TOOLS · ONLINE SUITE</p>
        <h1>我的在线工具箱</h1>
        <p>三个完整项目，打开网页即可直接使用。</p>
        <a className="hero-action" href="#tools">浏览全部工具</a>
      </section>

      <section className="tool-gallery" id="tools" aria-label="在线工具">
        {TOOLS.map((tool, index) => (
          <article className={`showcase${index % 2 ? " is-reversed" : ""}`} key={tool.href}>
            <a className="showcase-media" href={tool.href} aria-label={`进入${tool.title}`}>
              <img src={tool.image} alt={tool.imageAlt} />
            </a>
            <div className="showcase-copy">
              <div className="showcase-heading">
                <p>{tool.eyebrow}</p>
                <span className={tool.ready ? "tool-status is-ready" : "tool-status"}>{tool.status}</span>
              </div>
              <h2><a href={tool.href}>{tool.title}</a></h2>
              <p className="showcase-description">{tool.description}</p>
              <ul aria-label={`${tool.title}主要功能`}>
                {tool.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
              <a className="showcase-action" href={tool.href}>{tool.action}<span aria-hidden="true">→</span></a>
            </div>
          </article>
        ))}
      </section>

      <footer className="home-footer">
        <span>PP Tools</span>
        <a href="https://albussnape77.github.io">返回个人网站</a>
      </footer>
    </main>
  );
}
```

- [ ] **步骤 2：运行首页测试并确认结构通过**

```powershell
npm test -- HomePage --reporter=basic
```

预期：`1 passed`。

- [ ] **步骤 3：运行应用测试防止路由回归**

```powershell
npm test -- App --reporter=basic
```

预期：`4 passed`。

- [ ] **步骤 4：GitHub Desktop 检查点**

建议提交说明：`feat: build tool showcase homepage`

## 任务 5：迁移个人网站风格并隔离样式

**文件：**

- 创建：`frontend/src/pages/home.css`
- 修改：`frontend/src/styles.css`

- [ ] **步骤 1：删除旧首页和旧导航样式**

从 `frontend/src/styles.css` 删除以下首页专属旧选择器及其媒体查询规则：

```css
.hero
.eyebrow
.tool-grid
.tool-card
.topbar
.brand
.topbar nav
```

不要删除 `.shell`、`.lede`、`.milk-tea-page`、`.admin-page` 及其后续规则；前两者仍被相机和奶茶页面共用。

- [ ] **步骤 2：创建独立首页样式**

创建 `frontend/src/pages/home.css`：

```css
.tool-site {
  --site-pink: #ff8fb4;
  --site-pink-deep: #e96592;
  --site-cyan: #6fc9d8;
  --site-lavender: #b9ace8;
  --site-ink: #594650;
  --site-muted: #927e89;
  --site-cream: #fffafd;
  --site-line: #f1d8e4;
  min-height: 100vh;
  color: var(--site-ink);
  background: linear-gradient(180deg, #eaf8fc 0%, #f9eff8 48%, #ffe9f2 100%);
  font-family: "Arial Rounded MT Bold", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  overflow: hidden;
}

.site-header {
  position: sticky;
  z-index: 30;
  top: 18px;
  width: min(1180px, calc(100% - 32px));
  min-height: 58px;
  margin: 0 auto;
  padding: 8px 10px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 999px;
  background: rgba(255, 250, 253, 0.88);
  box-shadow: 0 10px 28px rgba(218, 112, 157, 0.17), inset 0 0 0 1px var(--site-line);
  backdrop-filter: blur(16px);
}

.site-brand,
.site-nav,
.personal-site-link {
  display: flex;
  align-items: center;
}

.site-brand {
  gap: 8px;
  padding: 8px 12px;
  color: var(--site-pink-deep);
}

.site-brand span {
  color: var(--site-cyan);
}

.site-nav {
  min-width: 0;
  justify-content: center;
  gap: 4px;
}

.site-nav a,
.personal-site-link {
  border-radius: 999px;
  padding: 9px 14px;
  color: var(--site-muted);
  font-size: 0.9rem;
  font-weight: 700;
  white-space: nowrap;
}

.site-nav a:hover,
.site-nav a.is-active,
.personal-site-link:hover {
  color: var(--site-pink-deep);
  background: #fff;
}

.personal-site-link {
  border: 1px solid var(--site-line);
}

.tool-home {
  position: relative;
}

.tool-home::before,
.tool-home::after {
  content: "";
  position: fixed;
  z-index: 0;
  width: 180px;
  height: 70px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 68px 8px 0 -8px rgba(255, 255, 255, 0.58), -54px 12px 0 -12px rgba(255, 255, 255, 0.58);
  pointer-events: none;
}

.tool-home::before {
  top: 18%;
  left: -80px;
}

.tool-home::after {
  right: -70px;
  top: 58%;
}

.home-hero,
.tool-gallery,
.home-footer {
  position: relative;
  z-index: 1;
  width: min(1120px, calc(100% - 32px));
  margin-inline: auto;
}

.home-hero {
  min-height: 620px;
  padding: 150px 24px 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.home-kicker {
  margin: 0 0 14px;
  color: var(--site-cyan);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.home-hero h1 {
  margin: 0;
  max-width: 820px;
  color: var(--site-pink-deep);
  font-size: clamp(3.4rem, 8vw, 6.6rem);
  line-height: 1.04;
  text-shadow: 0 4px 0 #fff, 0 12px 26px rgba(225, 120, 165, 0.24);
}

.home-hero > p:not(.home-kicker) {
  margin: 22px 0 0;
  color: var(--site-muted);
  font-size: 1.12rem;
  font-weight: 700;
}

.hero-action,
.showcase-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 999px;
  background: var(--site-pink);
  color: #fff;
  font-weight: 800;
  box-shadow: 0 8px 0 var(--site-pink-deep), 0 14px 26px rgba(225, 120, 165, 0.22);
}

.hero-action {
  margin-top: 34px;
  padding: 13px 24px;
}

.hero-action:hover,
.showcase-action:hover {
  transform: translateY(-2px);
}

.hero-spark {
  position: absolute;
  color: var(--site-cyan);
  font-size: 2rem;
  animation: home-float 3.2s ease-in-out infinite;
}

.hero-spark-left {
  left: 12%;
  top: 32%;
}

.hero-spark-right {
  right: 13%;
  top: 24%;
  color: var(--site-lavender);
  animation-delay: -1.4s;
}

.tool-gallery {
  display: grid;
  gap: 34px;
  padding-bottom: 90px;
}

.showcase {
  min-height: 390px;
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(330px, 0.82fr);
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.92);
  border-radius: 24px;
  background: rgba(255, 250, 253, 0.88);
  box-shadow: 0 18px 44px rgba(210, 110, 160, 0.19), inset 0 0 0 1px var(--site-line);
}

.showcase.is-reversed {
  grid-template-columns: minmax(330px, 0.82fr) minmax(0, 1.18fr);
}

.showcase.is-reversed .showcase-media {
  order: 2;
}

.showcase-media {
  min-width: 0;
  overflow: hidden;
  background: #f5edf2;
}

.showcase-media img {
  width: 100%;
  height: 100%;
  min-height: 390px;
  display: block;
  object-fit: cover;
  transition: transform 0.45s ease;
}

.showcase:hover .showcase-media img {
  transform: scale(1.025);
}

.showcase-copy {
  padding: 44px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.showcase-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.showcase-heading p {
  margin: 0;
  color: var(--site-cyan);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.09em;
}

.tool-status {
  border-radius: 999px;
  background: #f4eef5;
  color: var(--site-muted);
  padding: 5px 10px;
  font-size: 0.72rem;
  font-weight: 800;
}

.tool-status.is-ready {
  background: #e2f7f2;
  color: #24836e;
}

.showcase h2 {
  margin: 18px 0 0;
  font-size: clamp(2rem, 3.2vw, 3.1rem);
  line-height: 1.15;
}

.showcase-description {
  margin: 18px 0 0;
  color: var(--site-muted);
  line-height: 1.8;
}

.showcase ul {
  margin: 22px 0 26px;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
}

.showcase li {
  border: 1px solid var(--site-line);
  border-radius: 999px;
  background: #fff;
  padding: 6px 11px;
  color: var(--site-muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.showcase-action {
  width: fit-content;
  padding: 11px 18px;
}

.home-footer {
  padding: 26px 0 42px;
  display: flex;
  justify-content: space-between;
  border-top: 1px solid rgba(239, 108, 151, 0.2);
  color: var(--site-muted);
  font-size: 0.86rem;
  font-weight: 700;
}

@keyframes home-float {
  0%, 100% { transform: translateY(0) rotate(-6deg); }
  50% { transform: translateY(-12px) rotate(6deg); }
}

@media (max-width: 880px) {
  .site-header {
    grid-template-columns: auto minmax(0, 1fr);
    border-radius: 22px;
  }

  .site-nav {
    justify-content: flex-start;
    overflow-x: auto;
  }

  .personal-site-link {
    display: none;
  }

  .home-hero {
    min-height: 540px;
    padding-top: 120px;
  }

  .showcase,
  .showcase.is-reversed {
    grid-template-columns: 1fr;
  }

  .showcase.is-reversed .showcase-media {
    order: 0;
  }

  .showcase-media img {
    min-height: 0;
    aspect-ratio: 16 / 9;
  }
}

@media (max-width: 560px) {
  .site-header {
    top: 8px;
    width: calc(100% - 16px);
    padding: 6px;
    gap: 4px;
  }

  .site-brand {
    padding-inline: 8px;
  }

  .site-nav a {
    padding: 8px 10px;
    font-size: 0.8rem;
  }

  .home-hero,
  .tool-gallery,
  .home-footer {
    width: calc(100% - 24px);
  }

  .home-hero {
    min-height: 500px;
    padding-inline: 8px;
  }

  .home-hero h1 {
    font-size: clamp(3rem, 16vw, 4.5rem);
  }

  .hero-spark-left {
    left: 4%;
  }

  .hero-spark-right {
    right: 5%;
  }

  .tool-gallery {
    gap: 20px;
  }

  .showcase {
    min-height: 0;
    border-radius: 18px;
  }

  .showcase-copy {
    padding: 28px 22px 30px;
  }

  .showcase-heading {
    align-items: flex-start;
  }

  .showcase h2 {
    font-size: 2rem;
  }

  .home-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-spark,
  .showcase-media img {
    animation: none;
    transition: none;
  }

  .hero-action:hover,
  .showcase-action:hover,
  .showcase:hover .showcase-media img {
    transform: none;
  }
}
```

- [ ] **步骤 3：运行全部前端测试**

```powershell
npm test -- --reporter=basic
```

预期：所有测试通过。

- [ ] **步骤 4：生产构建**

```powershell
npm run build
```

预期：Vite 构建成功，`dist` 中包含首页 CSS 和三个预览资源。

- [ ] **步骤 5：GitHub Desktop 检查点**

建议提交说明：`style: redesign tool center homepage`

## 任务 6：真实浏览器验收

**文件：**

- 验证：`frontend/src/pages/HomePage.jsx`
- 验证：`frontend/src/pages/home.css`

- [ ] **步骤 1：启动开发服务并打开首页**

访问：

```text
http://127.0.0.1:5176/
```

预期：显示粉青背景、悬浮胶囊导航、首屏标题和三段作品长廊。

- [ ] **步骤 2：桌面端验收**

视口：`1440×900`

检查：

- 首屏底部能看到第一段工具模块；
- 三个预览图清晰且对应正确项目；
- 左右交替顺序正确；
- 导航保持可用；
- 三个入口进入正确路由；
- 控制台无错误；
- `document.documentElement.scrollWidth === document.documentElement.clientWidth`。

- [ ] **步骤 3：手机端验收**

视口：`390×844`

检查：

- 导航可横向滚动但页面本身不横向溢出；
- 每个工具变成图片在上、介绍在下；
- 标题、状态和按钮不截断；
- 三个入口可点击；
- 页面滚动流畅且没有布局跳动。

- [ ] **步骤 4：减少动态效果验收**

模拟 `prefers-reduced-motion: reduce`，确认漂浮和图片缩放停止，内容与入口保持可用。

- [ ] **步骤 5：最终质量检查**

```powershell
git diff --check
$blocked = @(('cl'+'aude'), ('anth'+'ropic'), ('co'+'pilot'), ('g'+'pt'), ('co-authored'+'-by'), ('generated'+' with'), ('\.cl'+'aude'), ('sk'+'-[A-Za-z0-9_-]{10,}')) -join '|'
rg -n -i --hidden --glob '!frontend/node_modules/**' --glob '!frontend/dist/**' --glob '!backend/.venv/**' --glob '!.git/**' $blocked .
```

预期：`git diff --check` 无错误；痕迹和密钥扫描无匹配。

- [ ] **步骤 6：用户提交**

由用户在 GitHub Desktop 查看最终 diff，提交说明：

```text
feat: 重做在线工具中心首页
```

执行者不得自动提交或推送。
