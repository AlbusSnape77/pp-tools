# pp-tools Online Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an independent online tool suite with three browser-usable tools: Delta Force Stats, Gesture Beauty Cam, and Sanpingfang Milk Tea.

**Architecture:** Use a React frontend for the product shell and tool pages, plus a Flask backend for recognition, order data, admin access, and production serving. Keep each tool isolated under its own frontend folder and backend route/service files so the suite can grow without turning into one large file.

**Tech Stack:** Vite, React, Vitest, React Testing Library, Python, Flask, pytest, SQLite, Node.js, browser verification.

---

## Scope Note

The design contains three product modules. This is a master implementation plan with phase checkpoints. Each phase must produce a runnable, testable result before moving to the next phase.

## File Responsibility Map

Create:

- `README.md`: local setup, run commands, and product overview.
- `.gitignore`: local artifacts, dependency folders, env files, database files, build output, caches.
- `.env.example`: documented environment variables without real values.
- `backend/app.py`: Flask app factory and local entrypoint.
- `backend/routes/health.py`: health endpoint.
- `backend/routes/delta_force.py`: screenshot analysis API.
- `backend/routes/milk_tea.py`: public milk tea API.
- `backend/routes/admin.py`: admin login and admin milk tea API.
- `backend/services/delta_ocr.py`: recognition service wrapper with a fake recognizer for tests and a future adapter point for the existing recognizer.
- `backend/services/milk_tea_store.py`: SQLite schema, seed data, product, order, and admin operations.
- `backend/services/auth.py`: admin password check and signed token helpers.
- `backend/tests/`: backend pytest coverage.
- `frontend/package.json`: frontend scripts and dependencies.
- `frontend/index.html`: Vite entry.
- `frontend/src/main.jsx`: React bootstrap.
- `frontend/src/App.jsx`: routing shell.
- `frontend/src/api/client.js`: fetch helper.
- `frontend/src/components/`: shared UI components.
- `frontend/src/pages/HomePage.jsx`: tool center.
- `frontend/src/tools/delta-force/`: Delta Force page and result UI.
- `frontend/src/tools/beauty-cam/`: webcam tool page.
- `frontend/src/tools/milk-tea/`: shop and admin pages.
- `frontend/src/styles.css`: global visual system.
- `frontend/src/**/*.test.jsx`: frontend tests.
- `scripts/run-dev.ps1`: local dev runner instructions for Windows.
- `scripts/check-project.ps1`: local structure and forbidden artifact scan.

Modify after first deployment target exists:

- `E:/A Study/Coding/My/js/content.js`: change software buttons from download links to live links.
- `E:/A Study/Coding/My/tests/content.test.js`: assert software entries use live links.

## Execution Rules

- Use test-first changes for behavior.
- Keep commits manual through GitHub Desktop. Each task includes a suggested commit summary, but no command should auto-commit.
- Do not commit real secrets, local databases, uploaded images, dependency folders, or temporary browser files.
- Run the project scan before each manual commit checkpoint.

---

### Task 1: Repository Guardrails And Project Metadata

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `scripts/check-project.ps1`

- [ ] **Step 1: Create root metadata files**

Create `README.md` with:

````markdown
# pp-tools

Independent online tool suite for browser-usable personal tools.

## Tools

- Delta Force Stats: upload screenshots and view a structured stats profile.
- Gesture Beauty Cam: run webcam effects directly in the browser.
- Sanpingfang Milk Tea: browse products, place orders, and manage the shop.

## Local Development

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

## Safety

- Keep secrets in environment variables.
- Do not commit local database files.
- Do not commit uploaded images.
- Review GitHub Desktop diffs before committing.
````

Create `.gitignore` with:

```gitignore
.env
.env.*
!.env.example

node_modules/
dist/
coverage/

__pycache__/
.pytest_cache/
.venv/
*.pyc

backend/data/*.db
backend/data/*.sqlite
backend/data/uploads/

.superpowers/
```

Create `.env.example` with:

```text
FLASK_ENV=development
ADMIN_PASSWORD=change-this-locally
SECRET_KEY=change-this-locally
UPLOAD_MAX_MB=12
```

- [ ] **Step 2: Create the project scan script**

Create `scripts/check-project.ps1` with:

```powershell
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$required = @(
  "README.md",
  ".gitignore",
  ".env.example",
  "docs/superpowers/specs/2026-07-09-pp-tools-online-suite-design.md",
  "docs/superpowers/plans/2026-07-09-pp-tools-online-suite.md"
)

$missing = @()
foreach ($item in $required) {
  $path = Join-Path $root $item
  if (-not (Test-Path -Path $path)) {
    $missing += $item
  }
}

$blockedPaths = @(
  ".env",
  "backend/data/app.db",
  "backend/data/uploads"
)

$presentBlocked = @()
foreach ($item in $blockedPaths) {
  $path = Join-Path $root $item
  if (Test-Path -Path $path) {
    $presentBlocked += $item
  }
}

if ($missing.Count -gt 0) {
  Write-Output "Project check failed. Missing files:"
  $missing | ForEach-Object { Write-Output "- $_" }
  exit 1
}

if ($presentBlocked.Count -gt 0) {
  Write-Output "Project check failed. Local-only files are present:"
  $presentBlocked | ForEach-Object { Write-Output "- $_" }
  exit 1
}

Write-Output "Project check passed."
```

- [ ] **Step 3: Run the guardrail check**

Run:

```powershell
.\scripts\check-project.ps1
```

Expected:

```text
Project check passed.
```

- [ ] **Step 4: Manual commit checkpoint**

In GitHub Desktop, review the diff and commit with:

```text
chore: add project guardrails
```

---

### Task 2: Backend Scaffold And Health Check

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app.py`
- Create: `backend/routes/__init__.py`
- Create: `backend/routes/health.py`
- Create: `backend/tests/test_health.py`

- [ ] **Step 1: Add backend dependencies**

Create `backend/requirements.txt` with:

```text
flask>=3.1
pytest>=8.2
```

- [ ] **Step 2: Write the failing health test**

Create `backend/tests/test_health.py` with:

```python
from app import create_app


def test_health_check_returns_ok():
    app = create_app({"TESTING": True})
    client = app.test_client()

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}
```

- [ ] **Step 3: Run test to verify it fails before implementation**

Run:

```powershell
cd backend
python -m pytest tests/test_health.py -q
```

Expected before implementation:

```text
ModuleNotFoundError
```

- [ ] **Step 4: Implement the backend app factory**

Create `backend/routes/__init__.py` with:

```python
from .health import health_bp


def register_routes(app):
    app.register_blueprint(health_bp)
```

Create `backend/routes/health.py` with:

```python
from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__, url_prefix="/api")


@health_bp.get("/health")
def health_check():
    return jsonify({"status": "ok"})
```

Create `backend/app.py` with:

```python
from flask import Flask

from routes import register_routes


def create_app(config=None):
    app = Flask(__name__)
    app.config.update(config or {})
    register_routes(app)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5175, debug=True)
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```powershell
cd backend
python -m pytest tests/test_health.py -q
```

Expected:

```text
1 passed
```

- [ ] **Step 6: Manual commit checkpoint**

In GitHub Desktop, review the diff and commit with:

```text
feat: add backend health check
```

---

### Task 3: Frontend Scaffold And Product Shell

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/styles.css`
- Create: `frontend/src/pages/HomePage.jsx`
- Create: `frontend/src/test/setup.js`
- Create: `frontend/src/App.test.jsx`

- [ ] **Step 1: Add frontend package metadata**

Create `frontend/package.json` with:

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 5176",
    "build": "vite build",
    "test": "vitest run",
    "preview": "vite preview --host 127.0.0.1 --port 4176"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^24.1.1",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Add Vite and test configuration**

Create `frontend/vite.config.js` with:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
});
```

Create `frontend/src/test/setup.js` with:

```js
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Write the failing shell test**

Create `frontend/src/App.test.jsx` with:

```jsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the tool center and all three tools", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "pp-tools" })).toBeInTheDocument();
    expect(screen.getByText("Delta Force Stats")).toBeInTheDocument();
    expect(screen.getByText("Gesture Beauty Cam")).toBeInTheDocument();
    expect(screen.getByText("Sanpingfang Milk Tea")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Add the Vite entry files**

Create `frontend/index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>pp-tools</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

Create `frontend/src/main.jsx` with:

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Implement the product shell**

Create `frontend/src/pages/HomePage.jsx` with:

```jsx
const tools = [
  {
    href: "/tools/delta-force",
    title: "Delta Force Stats",
    description: "Upload result screenshots and view a structured stats profile.",
  },
  {
    href: "/tools/beauty-cam",
    title: "Gesture Beauty Cam",
    description: "Use webcam beauty effects and gesture controls directly in the browser.",
  },
  {
    href: "/tools/milk-tea",
    title: "Sanpingfang Milk Tea",
    description: "Browse drinks, customize orders, and manage shop operations.",
  },
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Online Tool Suite</p>
        <h1>pp-tools</h1>
        <p className="lede">Three practical tools, rebuilt for direct browser use.</p>
      </section>
      <section className="tool-grid" aria-label="Tools">
        {tools.map((tool) => (
          <a className="tool-card" href={tool.href} key={tool.href}>
            <h2>{tool.title}</h2>
            <p>{tool.description}</p>
            <span>Open tool</span>
          </a>
        ))}
      </section>
    </main>
  );
}
```

Create `frontend/src/App.jsx` with:

```jsx
import HomePage from "./pages/HomePage";

export default function App() {
  return <HomePage />;
}
```

Create `frontend/src/styles.css` with:

```css
:root {
  color: #162033;
  background: #f7f8fb;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
}

a {
  color: inherit;
  text-decoration: none;
}

.shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 56px 0;
}

.hero {
  margin-bottom: 32px;
}

.eyebrow {
  color: #4263eb;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(2.4rem, 7vw, 5.2rem);
  letter-spacing: 0;
}

.lede {
  max-width: 640px;
  color: #546179;
  font-size: 1.1rem;
  line-height: 1.7;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.tool-card {
  min-height: 220px;
  border: 1px solid #dfe4ee;
  border-radius: 8px;
  background: #ffffff;
  padding: 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 18px 50px rgba(21, 31, 51, 0.07);
}

.tool-card h2 {
  margin: 0 0 10px;
  font-size: 1.3rem;
}

.tool-card p {
  color: #5d6a82;
  line-height: 1.6;
}

.tool-card span {
  color: #4263eb;
  font-weight: 700;
}

@media (max-width: 780px) {
  .tool-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: Run frontend tests**

Run:

```powershell
cd frontend
npm install
npm test
```

Expected:

```text
1 passed
```

- [ ] **Step 7: Manual commit checkpoint**

In GitHub Desktop, review the diff and commit with:

```text
feat: add frontend product shell
```

---

### Task 4: API Client And Tool Routing

**Files:**
- Create: `frontend/src/api/client.js`
- Create: `frontend/src/components/AppLayout.jsx`
- Create: `frontend/src/tools/delta-force/DeltaForcePage.jsx`
- Create: `frontend/src/tools/beauty-cam/BeautyCamPage.jsx`
- Create: `frontend/src/tools/milk-tea/MilkTeaPage.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/App.test.jsx`

- [ ] **Step 1: Extend tests for direct routes**

Update the Vitest import in `frontend/src/App.test.jsx` to include `afterEach`:

```jsx
import { afterEach, describe, expect, it } from "vitest";
```

Append this reset block to `frontend/src/App.test.jsx`:

```jsx
afterEach(() => {
  window.history.pushState({}, "", "/");
});
```

Append these tests to `frontend/src/App.test.jsx`:

```jsx
it("renders the Delta Force route", () => {
  window.history.pushState({}, "", "/tools/delta-force");

  render(<App />);

  expect(screen.getByRole("heading", { name: "Delta Force Stats" })).toBeInTheDocument();
});

it("renders the Beauty Cam route", () => {
  window.history.pushState({}, "", "/tools/beauty-cam");

  render(<App />);

  expect(screen.getByRole("heading", { name: "Gesture Beauty Cam" })).toBeInTheDocument();
});

it("renders the Milk Tea route", () => {
  window.history.pushState({}, "", "/tools/milk-tea");

  render(<App />);

  expect(screen.getByRole("heading", { name: "Sanpingfang Milk Tea" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Add the API client**

Create `frontend/src/api/client.js` with:

```js
export async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data && data.error ? data.error : `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return data;
}
```

- [ ] **Step 3: Add shared layout and route pages**

Create `frontend/src/components/AppLayout.jsx` with:

```jsx
export default function AppLayout({ children }) {
  return (
    <div>
      <header className="topbar">
        <a href="/" className="brand">pp-tools</a>
        <nav>
          <a href="/tools/delta-force">Delta</a>
          <a href="/tools/beauty-cam">Cam</a>
          <a href="/tools/milk-tea">Milk Tea</a>
        </nav>
      </header>
      {children}
    </div>
  );
}
```

Create `frontend/src/tools/delta-force/DeltaForcePage.jsx` with:

```jsx
export default function DeltaForcePage() {
  return (
    <main className="shell">
      <h1>Delta Force Stats</h1>
      <p className="lede">Upload result screenshots and generate a structured profile.</p>
    </main>
  );
}
```

Create `frontend/src/tools/beauty-cam/BeautyCamPage.jsx` with:

```jsx
export default function BeautyCamPage() {
  return (
    <main className="shell">
      <h1>Gesture Beauty Cam</h1>
      <p className="lede">Camera effects run in your browser after permission is granted.</p>
    </main>
  );
}
```

Create `frontend/src/tools/milk-tea/MilkTeaPage.jsx` with:

```jsx
export default function MilkTeaPage() {
  return (
    <main className="shell">
      <h1>Sanpingfang Milk Tea</h1>
      <p className="lede">Browse drinks, customize an order, and track its status.</p>
    </main>
  );
}
```

- [ ] **Step 4: Replace the single-page app with path routing**

Update `frontend/src/App.jsx` to:

```jsx
import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import BeautyCamPage from "./tools/beauty-cam/BeautyCamPage";
import DeltaForcePage from "./tools/delta-force/DeltaForcePage";
import MilkTeaPage from "./tools/milk-tea/MilkTeaPage";

function routeFor(pathname) {
  if (pathname === "/tools/delta-force") return <DeltaForcePage />;
  if (pathname === "/tools/beauty-cam") return <BeautyCamPage />;
  if (pathname === "/tools/milk-tea") return <MilkTeaPage />;
  return <HomePage />;
}

export default function App() {
  return <AppLayout>{routeFor(window.location.pathname)}</AppLayout>;
}
```

Append this to `frontend/src/styles.css`:

```css
.topbar {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 18px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand {
  font-weight: 800;
}

.topbar nav {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #5d6a82;
  font-weight: 700;
}
```

- [ ] **Step 5: Run frontend tests**

Run:

```powershell
cd frontend
npm test
```

Expected:

```text
4 passed
```

- [ ] **Step 6: Manual commit checkpoint**

In GitHub Desktop, review the diff and commit with:

```text
feat: add tool routes
```

---

### Task 5: Milk Tea SQLite Store

**Files:**
- Create: `backend/services/milk_tea_store.py`
- Create: `backend/tests/test_milk_tea_store.py`

- [ ] **Step 1: Write store tests first**

Create `backend/tests/test_milk_tea_store.py` with:

```python
from services.milk_tea_store import MilkTeaStore


def test_seed_products_are_returned(tmp_path):
    store = MilkTeaStore(tmp_path / "shop.db")
    store.initialize()

    products = store.list_products()

    assert len(products) >= 3
    assert all(product["active"] for product in products)


def test_create_order_returns_lookup_code(tmp_path):
    store = MilkTeaStore(tmp_path / "shop.db")
    store.initialize()
    product = store.list_products()[0]

    order = store.create_order(
      customer_name="Test User",
      items=[
        {
          "product_id": product["id"],
          "name": product["name"],
          "quantity": 2,
          "options": {"sweetness": "50%", "ice": "less"},
          "unit_price": product["price"],
        }
      ],
    )

    assert order["lookup_code"]
    assert order["status"] == "pending"
    assert order["total"] == product["price"] * 2
```

- [ ] **Step 2: Run tests to verify they fail before implementation**

Run:

```powershell
cd backend
python -m pytest tests/test_milk_tea_store.py -q
```

Expected before implementation:

```text
ModuleNotFoundError
```

- [ ] **Step 3: Implement the store**

Create `backend/services/milk_tea_store.py` with:

```python
import json
import sqlite3
import time
from pathlib import Path
from secrets import token_hex


SEED_PRODUCTS = [
    {"name": "Brown Sugar Milk Tea", "category": "Milk Tea", "price": 18, "description": "Brown sugar, fresh milk, and black tea."},
    {"name": "Jasmine Fruit Tea", "category": "Fruit Tea", "price": 16, "description": "Jasmine tea with seasonal fruit."},
    {"name": "Cheese Matcha", "category": "Special", "price": 20, "description": "Matcha latte with a cheese foam top."},
]


class MilkTeaStore:
    def __init__(self, db_path):
        self.db_path = Path(db_path)

    def connect(self):
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def initialize(self):
        with self.connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS products (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  category TEXT NOT NULL,
                  price INTEGER NOT NULL,
                  description TEXT NOT NULL,
                  active INTEGER NOT NULL DEFAULT 1,
                  sort_order INTEGER NOT NULL DEFAULT 0
                );
                CREATE TABLE IF NOT EXISTS orders (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  lookup_code TEXT NOT NULL UNIQUE,
                  customer_name TEXT NOT NULL,
                  status TEXT NOT NULL,
                  total INTEGER NOT NULL,
                  created_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS order_items (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  order_id INTEGER NOT NULL,
                  product_id INTEGER NOT NULL,
                  name TEXT NOT NULL,
                  quantity INTEGER NOT NULL,
                  unit_price INTEGER NOT NULL,
                  options_json TEXT NOT NULL,
                  FOREIGN KEY(order_id) REFERENCES orders(id)
                );
                """
            )
            count = conn.execute("SELECT COUNT(*) AS count FROM products").fetchone()["count"]
            if count == 0:
                for index, product in enumerate(SEED_PRODUCTS):
                    conn.execute(
                        """
                        INSERT INTO products (name, category, price, description, active, sort_order)
                        VALUES (?, ?, ?, ?, 1, ?)
                        """,
                        (product["name"], product["category"], product["price"], product["description"], index),
                    )

    def list_products(self, include_inactive=False):
        query = "SELECT * FROM products"
        params = []
        if not include_inactive:
            query += " WHERE active = 1"
        query += " ORDER BY sort_order ASC, id ASC"
        with self.connect() as conn:
            rows = conn.execute(query, params).fetchall()
        return [self._product(row) for row in rows]

    def get_product(self, product_id):
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
        return self._product(row) if row else None

    def create_order(self, customer_name, items):
        if not customer_name.strip():
            raise ValueError("Customer name is required.")
        if not items:
            raise ValueError("At least one item is required.")

        total = sum(int(item["unit_price"]) * int(item["quantity"]) for item in items)
        lookup_code = token_hex(4).upper()
        created_at = int(time.time())

        with self.connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO orders (lookup_code, customer_name, status, total, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (lookup_code, customer_name.strip(), "pending", total, created_at),
            )
            order_id = cur.lastrowid
            for item in items:
                conn.execute(
                    """
                    INSERT INTO order_items (order_id, product_id, name, quantity, unit_price, options_json)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        order_id,
                        int(item["product_id"]),
                        item["name"],
                        int(item["quantity"]),
                        int(item["unit_price"]),
                        json.dumps(item.get("options", {}), ensure_ascii=True),
                    ),
                )

        return self.get_order_by_lookup(lookup_code)

    def get_order_by_lookup(self, lookup_code):
        with self.connect() as conn:
            order = conn.execute("SELECT * FROM orders WHERE lookup_code = ?", (lookup_code,)).fetchone()
            if not order:
                return None
            items = conn.execute("SELECT * FROM order_items WHERE order_id = ?", (order["id"],)).fetchall()
        return self._order(order, items)

    def list_orders(self):
        with self.connect() as conn:
            orders = conn.execute("SELECT * FROM orders ORDER BY id DESC").fetchall()
            result = []
            for order in orders:
                items = conn.execute("SELECT * FROM order_items WHERE order_id = ?", (order["id"],)).fetchall()
                result.append(self._order(order, items))
        return result

    def update_order_status(self, order_id, status):
        allowed = {"pending", "preparing", "ready", "completed", "cancelled"}
        if status not in allowed:
            raise ValueError("Unsupported order status.")
        with self.connect() as conn:
            conn.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
            order = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
            if not order:
                return None
            items = conn.execute("SELECT * FROM order_items WHERE order_id = ?", (order_id,)).fetchall()
        return self._order(order, items)

    def _product(self, row):
        return {
            "id": row["id"],
            "name": row["name"],
            "category": row["category"],
            "price": row["price"],
            "description": row["description"],
            "active": bool(row["active"]),
            "sort_order": row["sort_order"],
        }

    def _order(self, row, item_rows):
        return {
            "id": row["id"],
            "lookup_code": row["lookup_code"],
            "customer_name": row["customer_name"],
            "status": row["status"],
            "total": row["total"],
            "created_at": row["created_at"],
            "items": [
                {
                    "id": item["id"],
                    "product_id": item["product_id"],
                    "name": item["name"],
                    "quantity": item["quantity"],
                    "unit_price": item["unit_price"],
                    "options": json.loads(item["options_json"]),
                }
                for item in item_rows
            ],
        }
```

- [ ] **Step 4: Run store tests**

Run:

```powershell
cd backend
python -m pytest tests/test_milk_tea_store.py -q
```

Expected:

```text
2 passed
```

- [ ] **Step 5: Manual commit checkpoint**

In GitHub Desktop, review the diff and commit with:

```text
feat: add milk tea store
```

---

### Task 6: Milk Tea Public And Admin API

**Files:**
- Create: `backend/services/auth.py`
- Create: `backend/routes/milk_tea.py`
- Create: `backend/routes/admin.py`
- Create: `backend/tests/test_milk_tea_routes.py`
- Modify: `backend/routes/__init__.py`

- [ ] **Step 1: Write route tests first**

Create `backend/tests/test_milk_tea_routes.py` with:

```python
from app import create_app


def test_public_products_are_returned(tmp_path):
    app = create_app({"TESTING": True, "DB_PATH": tmp_path / "shop.db", "ADMIN_PASSWORD": "secret", "SECRET_KEY": "test"})
    client = app.test_client()

    response = client.get("/api/milk-tea/products")

    assert response.status_code == 200
    assert len(response.get_json()["products"]) >= 3


def test_public_order_can_be_created_and_looked_up(tmp_path):
    app = create_app({"TESTING": True, "DB_PATH": tmp_path / "shop.db", "ADMIN_PASSWORD": "secret", "SECRET_KEY": "test"})
    client = app.test_client()
    product = client.get("/api/milk-tea/products").get_json()["products"][0]

    create_response = client.post(
        "/api/milk-tea/orders",
        json={
            "customer_name": "Ada",
            "items": [
                {
                    "product_id": product["id"],
                    "name": product["name"],
                    "quantity": 1,
                    "unit_price": product["price"],
                    "options": {"sweetness": "50%", "ice": "less"},
                }
            ],
        },
    )

    assert create_response.status_code == 201
    lookup_code = create_response.get_json()["order"]["lookup_code"]
    lookup_response = client.get(f"/api/milk-tea/orders/{lookup_code}")
    assert lookup_response.status_code == 200
    assert lookup_response.get_json()["order"]["customer_name"] == "Ada"


def test_admin_requires_login(tmp_path):
    app = create_app({"TESTING": True, "DB_PATH": tmp_path / "shop.db", "ADMIN_PASSWORD": "secret", "SECRET_KEY": "test"})
    client = app.test_client()

    response = client.get("/api/admin/milk-tea/orders")

    assert response.status_code == 401


def test_admin_can_update_order_status_after_login(tmp_path):
    app = create_app({"TESTING": True, "DB_PATH": tmp_path / "shop.db", "ADMIN_PASSWORD": "secret", "SECRET_KEY": "test"})
    client = app.test_client()
    product = client.get("/api/milk-tea/products").get_json()["products"][0]
    order = client.post(
        "/api/milk-tea/orders",
        json={
            "customer_name": "Ada",
            "items": [{"product_id": product["id"], "name": product["name"], "quantity": 1, "unit_price": product["price"], "options": {}}],
        },
    ).get_json()["order"]
    token = client.post("/api/admin/login", json={"password": "secret"}).get_json()["token"]

    response = client.patch(
        f"/api/admin/milk-tea/orders/{order['id']}/status",
        json={"status": "ready"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.get_json()["order"]["status"] == "ready"
```

- [ ] **Step 2: Run tests to verify route imports fail before implementation**

Run:

```powershell
cd backend
python -m pytest tests/test_milk_tea_routes.py -q
```

Expected before implementation:

```text
404
```

- [ ] **Step 3: Implement auth helper**

Create `backend/services/auth.py` with:

```python
from functools import wraps
from itsdangerous import BadSignature, URLSafeSerializer
from flask import current_app, jsonify, request


def serializer():
    return URLSafeSerializer(current_app.config["SECRET_KEY"], salt="admin-session")


def make_admin_token():
    return serializer().dumps({"role": "admin"})


def verify_admin_token(token):
    try:
        data = serializer().loads(token)
    except BadSignature:
        return False
    return data.get("role") == "admin"


def require_admin(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        prefix = "Bearer "
        if not header.startswith(prefix) or not verify_admin_token(header[len(prefix):]):
            return jsonify({"error": "Admin login is required."}), 401
        return fn(*args, **kwargs)

    return wrapped
```

Add `itsdangerous>=2.2` to `backend/requirements.txt`.

- [ ] **Step 4: Implement public routes**

Create `backend/routes/milk_tea.py` with:

```python
from flask import Blueprint, current_app, jsonify, request

from services.milk_tea_store import MilkTeaStore

milk_tea_bp = Blueprint("milk_tea", __name__, url_prefix="/api/milk-tea")


def store():
    instance = MilkTeaStore(current_app.config["DB_PATH"])
    instance.initialize()
    return instance


@milk_tea_bp.get("/products")
def list_products():
    return jsonify({"products": store().list_products()})


@milk_tea_bp.get("/products/<int:product_id>")
def get_product(product_id):
    product = store().get_product(product_id)
    if not product:
        return jsonify({"error": "Product not found."}), 404
    return jsonify({"product": product})


@milk_tea_bp.post("/orders")
def create_order():
    body = request.get_json(silent=True) or {}
    try:
        order = store().create_order(body.get("customer_name", ""), body.get("items", []))
    except (KeyError, TypeError, ValueError) as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"order": order}), 201


@milk_tea_bp.get("/orders/<lookup_code>")
def get_order(lookup_code):
    order = store().get_order_by_lookup(lookup_code)
    if not order:
        return jsonify({"error": "Order not found."}), 404
    return jsonify({"order": order})
```

- [ ] **Step 5: Implement admin routes**

Create `backend/routes/admin.py` with:

```python
from flask import Blueprint, current_app, jsonify, request

from services.auth import make_admin_token, require_admin
from services.milk_tea_store import MilkTeaStore

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def store():
    instance = MilkTeaStore(current_app.config["DB_PATH"])
    instance.initialize()
    return instance


@admin_bp.post("/login")
def login():
    body = request.get_json(silent=True) or {}
    if body.get("password") != current_app.config["ADMIN_PASSWORD"]:
        return jsonify({"error": "Invalid password."}), 401
    return jsonify({"token": make_admin_token()})


@admin_bp.get("/milk-tea/orders")
@require_admin
def list_orders():
    return jsonify({"orders": store().list_orders()})


@admin_bp.patch("/milk-tea/orders/<int:order_id>/status")
@require_admin
def update_order_status(order_id):
    body = request.get_json(silent=True) or {}
    try:
        order = store().update_order_status(order_id, body.get("status", ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not order:
        return jsonify({"error": "Order not found."}), 404
    return jsonify({"order": order})
```

Update `backend/routes/__init__.py` to:

```python
from .admin import admin_bp
from .health import health_bp
from .milk_tea import milk_tea_bp


def register_routes(app):
    app.register_blueprint(health_bp)
    app.register_blueprint(milk_tea_bp)
    app.register_blueprint(admin_bp)
```

Update `backend/app.py` to configure defaults:

```python
from pathlib import Path
from flask import Flask

from routes import register_routes


def create_app(config=None):
    app = Flask(__name__)
    root = Path(__file__).parent
    app.config.update(
        DB_PATH=root / "data" / "app.db",
        ADMIN_PASSWORD="change-this-locally",
        SECRET_KEY="change-this-locally",
    )
    app.config.update(config or {})
    register_routes(app)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5175, debug=True)
```

- [ ] **Step 6: Run route tests**

Run:

```powershell
cd backend
python -m pytest tests/test_milk_tea_routes.py -q
```

Expected:

```text
4 passed
```

- [ ] **Step 7: Manual commit checkpoint**

In GitHub Desktop, review the diff and commit with:

```text
feat: add milk tea api
```

---

### Task 7: Milk Tea Frontend

**Files:**
- Create: `frontend/src/tools/milk-tea/MilkTeaPage.test.jsx`
- Modify: `frontend/src/tools/milk-tea/MilkTeaPage.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Write frontend tests for the shop flow**

Create `frontend/src/tools/milk-tea/MilkTeaPage.test.jsx` with:

```jsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import MilkTeaPage from "./MilkTeaPage";

const products = [
  { id: 1, name: "Brown Sugar Milk Tea", category: "Milk Tea", price: 18, description: "Brown sugar.", active: true },
];

describe("MilkTeaPage", () => {
  it("loads products and creates an order", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ products }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ order: { lookup_code: "ABCD1234", status: "pending", total: 18 } }) });

    render(<MilkTeaPage />);

    await screen.findByText("Brown Sugar Milk Tea");
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    await userEvent.type(screen.getByLabelText("Name"), "Ada");
    await userEvent.click(screen.getByRole("button", { name: "Place order" }));

    await waitFor(() => {
      expect(screen.getByText("Order ABCD1234")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Implement the milk tea page**

Replace `frontend/src/tools/milk-tea/MilkTeaPage.jsx` with:

```jsx
import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";

export default function MilkTeaPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch("/api/milk-tea/products")
      .then((data) => setProducts(data.products))
      .catch((error) => setMessage(error.message));
  }, []);

  const addToCart = (product) => {
    setCart((items) => [...items, { ...product, quantity: 1, options: { sweetness: "50%", ice: "less" } }]);
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const placeOrder = async () => {
    try {
      const data = await apiFetch("/api/milk-tea/orders", {
        method: "POST",
        body: JSON.stringify({
          customer_name: customerName,
          items: cart.map((item) => ({
            product_id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            options: item.options,
          })),
        }),
      });
      setMessage(`Order ${data.order.lookup_code}`);
      setCart([]);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <main className="shell">
      <h1>Sanpingfang Milk Tea</h1>
      <p className="lede">Browse drinks, customize an order, and track its status.</p>
      {message && <p className="notice">{message}</p>}
      <section className="shop-layout">
        <div className="product-list">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <p className="eyebrow">{product.category}</p>
              <h2>{product.name}</h2>
              <p>{product.description}</p>
              <strong>${product.price}</strong>
              <button type="button" onClick={() => addToCart(product)}>Add to cart</button>
            </article>
          ))}
        </div>
        <aside className="cart-panel">
          <h2>Cart</h2>
          {cart.length === 0 ? <p>No items yet.</p> : cart.map((item, index) => <p key={`${item.id}-${index}`}>{item.name} x {item.quantity}</p>)}
          <p>Total: ${total}</p>
          <label>
            Name
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
          </label>
          <button type="button" disabled={!cart.length || !customerName} onClick={placeOrder}>Place order</button>
        </aside>
      </section>
    </main>
  );
}
```

Append to `frontend/src/styles.css`:

```css
.notice {
  border: 1px solid #b7c7ff;
  border-radius: 8px;
  background: #edf2ff;
  padding: 12px 14px;
}

.shop-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
}

.product-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.product-card,
.cart-panel {
  border: 1px solid #dfe4ee;
  border-radius: 8px;
  background: white;
  padding: 18px;
}

button,
input {
  font: inherit;
}

button {
  border: 0;
  border-radius: 8px;
  background: #4263eb;
  color: white;
  cursor: pointer;
  padding: 10px 14px;
  font-weight: 700;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

label {
  display: grid;
  gap: 6px;
  color: #546179;
  font-weight: 700;
}

input {
  border: 1px solid #cfd6e4;
  border-radius: 8px;
  padding: 10px;
}

@media (max-width: 880px) {
  .shop-layout,
  .product-list {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Run milk tea frontend test**

Run:

```powershell
cd frontend
npm test -- MilkTeaPage
```

Expected:

```text
1 passed
```

- [ ] **Step 4: Manual commit checkpoint**

In GitHub Desktop, review the diff and commit with:

```text
feat: add milk tea frontend
```

---

### Task 8: Milk Tea Admin Surface

**Files:**
- Modify: `backend/services/milk_tea_store.py`
- Modify: `backend/routes/admin.py`
- Create: `backend/tests/test_milk_tea_admin_routes.py`
- Create: `frontend/src/tools/milk-tea/AdminMilkTeaPage.jsx`
- Create: `frontend/src/tools/milk-tea/AdminMilkTeaPage.test.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Write admin route tests**

Create `backend/tests/test_milk_tea_admin_routes.py` with:

```python
from app import create_app


def login(client):
    return client.post("/api/admin/login", json={"password": "secret"}).get_json()["token"]


def test_admin_can_create_product_and_read_summary(tmp_path):
    app = create_app({"TESTING": True, "DB_PATH": tmp_path / "shop.db", "ADMIN_PASSWORD": "secret", "SECRET_KEY": "test"})
    client = app.test_client()
    token = login(client)

    create = client.post(
        "/api/admin/milk-tea/products",
        json={"name": "Taro Milk", "category": "Milk Tea", "price": 19, "description": "Taro and milk."},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert create.status_code == 201
    products = client.get("/api/admin/milk-tea/products", headers={"Authorization": f"Bearer {token}"})
    assert any(product["name"] == "Taro Milk" for product in products.get_json()["products"])
    summary = client.get("/api/admin/milk-tea/summary", headers={"Authorization": f"Bearer {token}"})
    assert summary.status_code == 200
    assert "order_count" in summary.get_json()["summary"]
```

- [ ] **Step 2: Run admin tests to verify missing endpoints fail**

Run:

```powershell
cd backend
python -m pytest tests/test_milk_tea_admin_routes.py -q
```

Expected before implementation:

```text
404
```

- [ ] **Step 3: Add store methods**

Add these methods inside `MilkTeaStore` in `backend/services/milk_tea_store.py`:

```python
    def save_product(self, payload, product_id=None):
        name = (payload.get("name") or "").strip()
        category = (payload.get("category") or "").strip()
        description = (payload.get("description") or "").strip()
        price = int(payload.get("price") or 0)
        if not name or not category or not description or price <= 0:
            raise ValueError("Name, category, description, and positive price are required.")
        with self.connect() as conn:
            if product_id:
                conn.execute(
                    """
                    UPDATE products
                    SET name = ?, category = ?, price = ?, description = ?
                    WHERE id = ?
                    """,
                    (name, category, price, description, product_id),
                )
            else:
                sort_order = conn.execute("SELECT COUNT(*) AS count FROM products").fetchone()["count"]
                cur = conn.execute(
                    """
                    INSERT INTO products (name, category, price, description, active, sort_order)
                    VALUES (?, ?, ?, ?, 1, ?)
                    """,
                    (name, category, price, description, sort_order),
                )
                product_id = cur.lastrowid
        return self.get_product(product_id)

    def update_product_status(self, product_id, active):
        with self.connect() as conn:
            conn.execute("UPDATE products SET active = ? WHERE id = ?", (1 if active else 0, product_id))
        return self.get_product(product_id)

    def sales_summary(self):
        with self.connect() as conn:
            row = conn.execute(
                """
                SELECT COUNT(*) AS order_count, COALESCE(SUM(total), 0) AS revenue
                FROM orders
                """
            ).fetchone()
        return {"order_count": row["order_count"], "revenue": row["revenue"]}
```

- [ ] **Step 4: Add admin endpoints**

Append to `backend/routes/admin.py`:

```python
@admin_bp.get("/milk-tea/products")
@require_admin
def admin_products():
    return jsonify({"products": store().list_products(include_inactive=True)})


@admin_bp.post("/milk-tea/products")
@require_admin
def admin_create_product():
    body = request.get_json(silent=True) or {}
    try:
        product = store().save_product(body)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"product": product}), 201


@admin_bp.put("/milk-tea/products/<int:product_id>")
@require_admin
def admin_update_product(product_id):
    body = request.get_json(silent=True) or {}
    try:
        product = store().save_product(body, product_id=product_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not product:
        return jsonify({"error": "Product not found."}), 404
    return jsonify({"product": product})


@admin_bp.patch("/milk-tea/products/<int:product_id>/status")
@require_admin
def admin_update_product_status(product_id):
    body = request.get_json(silent=True) or {}
    product = store().update_product_status(product_id, bool(body.get("active")))
    if not product:
        return jsonify({"error": "Product not found."}), 404
    return jsonify({"product": product})


@admin_bp.get("/milk-tea/summary")
@require_admin
def admin_summary():
    return jsonify({"summary": store().sales_summary()})
```

- [ ] **Step 5: Run admin backend tests**

Run:

```powershell
cd backend
python -m pytest tests/test_milk_tea_admin_routes.py -q
```

Expected:

```text
1 passed
```

- [ ] **Step 6: Write admin frontend test**

Create `frontend/src/tools/milk-tea/AdminMilkTeaPage.test.jsx` with:

```jsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AdminMilkTeaPage from "./AdminMilkTeaPage";

describe("AdminMilkTeaPage", () => {
  it("logs in and displays the summary", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ token: "token" }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ summary: { order_count: 2, revenue: 36 } }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ orders: [] }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ products: [] }) });

    render(<AdminMilkTeaPage />);
    await userEvent.type(screen.getByLabelText("Admin password"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Orders: 2")).toBeInTheDocument();
    expect(screen.getByText("Revenue: $36")).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Implement admin page**

Create `frontend/src/tools/milk-tea/AdminMilkTeaPage.jsx` with:

```jsx
import { useState } from "react";
import { apiFetch } from "../../api/client";

export default function AdminMilkTeaPage() {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState({ name: "", category: "", price: "", description: "" });
  const [message, setMessage] = useState("");

  const loadAdminData = async (nextToken) => {
    const headers = { Authorization: `Bearer ${nextToken}` };
    const [summaryData, orderData, productData] = await Promise.all([
      apiFetch("/api/admin/milk-tea/summary", { headers }),
      apiFetch("/api/admin/milk-tea/orders", { headers }),
      apiFetch("/api/admin/milk-tea/products", { headers }),
    ]);
    setSummary(summaryData.summary);
    setOrders(orderData.orders);
    setProducts(productData.products);
  };

  const login = async () => {
    try {
      const data = await apiFetch("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setToken(data.token);
      await loadAdminData(data.token);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const saveProduct = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await apiFetch("/api/admin/milk-tea/products", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...productForm, price: Number(productForm.price) }),
      });
      setProductForm({ name: "", category: "", price: "", description: "" });
      await loadAdminData(token);
      setMessage("Product saved.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await apiFetch(`/api/admin/milk-tea/orders/${orderId}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      });
      await loadAdminData(token);
      setMessage("Order updated.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!token) {
    return (
      <main className="shell">
        <h1>Milk Tea Admin</h1>
        {message && <p className="notice">{message}</p>}
        <label>
          Admin password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button type="button" onClick={login}>Log in</button>
      </main>
    );
  }

  return (
    <main className="shell">
      <h1>Milk Tea Admin</h1>
      {message && <p className="notice">{message}</p>}
      {summary && (
        <section className="stats-grid">
          <p><span>Orders</span><strong>{`Orders: ${summary.order_count}`}</strong></p>
          <p><span>Revenue</span><strong>{`Revenue: $${summary.revenue}`}</strong></p>
        </section>
      )}
      <section className="shop-layout">
        <div>
          <h2>Orders</h2>
          {orders.length ? orders.map((order) => (
            <article className="product-card" key={order.id}>
              <p>{order.lookup_code} - {order.status}</p>
              <button type="button" onClick={() => updateOrderStatus(order.id, "ready")}>Mark ready</button>
              <button type="button" onClick={() => updateOrderStatus(order.id, "completed")}>Mark completed</button>
            </article>
          )) : <p>No orders yet.</p>}
        </div>
        <aside>
          <h2>Products</h2>
          <label>
            Product name
            <input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            Category
            <input value={productForm.category} onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))} />
          </label>
          <label>
            Price
            <input value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} />
          </label>
          <label>
            Description
            <input value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <button type="button" onClick={saveProduct}>Create product</button>
          {products.length ? products.map((product) => <p key={product.id}>{product.name}</p>) : <p>No products loaded.</p>}
        </aside>
      </section>
    </main>
  );
}
```

- [ ] **Step 8: Add admin route**

Update `frontend/src/App.jsx` imports and routing:

```jsx
import AdminMilkTeaPage from "./tools/milk-tea/AdminMilkTeaPage";
```

Add this branch inside `routeFor`:

```jsx
if (pathname === "/admin/milk-tea") return <AdminMilkTeaPage />;
```

- [ ] **Step 9: Browser verify admin actions**

Open:

```text
http://127.0.0.1:5176/admin/milk-tea
```

Expected:

- Admin login accepts the configured local password.
- The summary cards render.
- Creating a product adds it to the product list.
- Updating an order to ready or completed changes the order status.

- [ ] **Step 10: Run admin frontend test**

Run:

```powershell
cd frontend
npm test -- AdminMilkTeaPage
```

Expected:

```text
1 passed
```

- [ ] **Step 11: Manual commit checkpoint**

In GitHub Desktop, review the diff and commit with:

```text
feat: add milk tea admin surface
```

---

### Task 9: Delta Force Analyze API

**Files:**
- Create: `backend/services/delta_ocr.py`
- Create: `backend/routes/delta_force.py`
- Create: `backend/tests/test_delta_force_routes.py`
- Modify: `backend/routes/__init__.py`

- [ ] **Step 1: Write analyze endpoint tests**

Create `backend/tests/test_delta_force_routes.py` with:

```python
import io

from app import create_app


def test_delta_analyze_rejects_missing_files(tmp_path):
    app = create_app({"TESTING": True, "DB_PATH": tmp_path / "shop.db"})
    client = app.test_client()

    response = client.post("/api/delta-force/analyze")

    assert response.status_code == 400
    assert response.get_json()["error"] == "At least one screenshot is required."


def test_delta_analyze_returns_structured_result(tmp_path):
    app = create_app({"TESTING": True, "DB_PATH": tmp_path / "shop.db"})
    client = app.test_client()

    response = client.post(
        "/api/delta-force/analyze",
        data={"images": [(io.BytesIO(b"fake image bytes"), "sample.png", "image/png")]},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["result"]["nickname"] == "Sample Player"
    assert body["result"]["overview"]["kd"][2] == "1.80"
    assert body["warnings"] == []
```

- [ ] **Step 2: Run tests to verify endpoint fails before implementation**

Run:

```powershell
cd backend
python -m pytest tests/test_delta_force_routes.py -q
```

Expected before implementation:

```text
404
```

- [ ] **Step 3: Implement the recognition service wrapper**

Create `backend/services/delta_ocr.py` with:

```python
class DeltaRecognizer:
    def analyze(self, files):
        if not files:
            raise ValueError("At least one screenshot is required.")
        return {
            "nickname": "Sample Player",
            "rank": {"name": "Gold", "stars": 3},
            "overview": {
                "kd": ["1.20", "1.50", "1.80"],
                "escape_rate": "42%",
                "matches": "128",
                "play_hours": "76",
            },
            "ranked": {
                "kd": ["1.10", "1.40", "1.70"],
                "escape_rate": "39%",
            },
            "radar": {
                "combat": 72,
                "survival": 68,
                "support": 60,
                "search": 74,
                "wealth": 58,
            },
            "recent_matches": [],
        }
```

- [ ] **Step 4: Implement the route**

Create `backend/routes/delta_force.py` with:

```python
from flask import Blueprint, jsonify, request

from services.delta_ocr import DeltaRecognizer

delta_force_bp = Blueprint("delta_force", __name__, url_prefix="/api/delta-force")


@delta_force_bp.post("/analyze")
def analyze():
    files = request.files.getlist("images")
    if not files:
        return jsonify({"error": "At least one screenshot is required."}), 400
    unsupported = [file.filename for file in files if not file.mimetype.startswith("image/")]
    if unsupported:
        return jsonify({"error": "Only image uploads are supported."}), 400
    try:
        result = DeltaRecognizer().analyze(files)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"result": result, "warnings": []})
```

Update `backend/routes/__init__.py` to:

```python
from .admin import admin_bp
from .delta_force import delta_force_bp
from .health import health_bp
from .milk_tea import milk_tea_bp


def register_routes(app):
    app.register_blueprint(health_bp)
    app.register_blueprint(milk_tea_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(delta_force_bp)
```

- [ ] **Step 5: Run endpoint tests**

Run:

```powershell
cd backend
python -m pytest tests/test_delta_force_routes.py -q
```

Expected:

```text
2 passed
```

- [ ] **Step 6: Manual commit checkpoint**

In GitHub Desktop, review the diff and commit with:

```text
feat: add delta force analyze api
```

---

### Task 10: Delta Force Frontend

**Files:**
- Create: `frontend/src/tools/delta-force/DeltaForcePage.test.jsx`
- Modify: `frontend/src/tools/delta-force/DeltaForcePage.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Write upload page test**

Create `frontend/src/tools/delta-force/DeltaForcePage.test.jsx` with:

```jsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DeltaForcePage from "./DeltaForcePage";

describe("DeltaForcePage", () => {
  it("uploads an image and renders the stats result", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        result: {
          nickname: "Sample Player",
          overview: { kd: ["1.20", "1.50", "1.80"], escape_rate: "42%" },
          rank: { name: "Gold", stars: 3 },
          radar: { combat: 72, survival: 68 }
        },
        warnings: []
      }),
    });

    render(<DeltaForcePage />);
    const file = new File(["content"], "sample.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Screenshots"), file);
    await userEvent.click(screen.getByRole("button", { name: "Analyze screenshots" }));

    await waitFor(() => {
      expect(screen.getByText("Sample Player")).toBeInTheDocument();
      expect(screen.getByText("1.80")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Implement upload and result UI**

Replace `frontend/src/tools/delta-force/DeltaForcePage.jsx` with:

```jsx
import { useState } from "react";
import { apiFetch } from "../../api/client";

export default function DeltaForcePage() {
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");

  const analyze = async () => {
    const form = new FormData();
    files.forEach((file) => form.append("images", file));
    try {
      setMessage("Analyzing screenshots...");
      const data = await apiFetch("/api/delta-force/analyze", { method: "POST", body: form });
      setResult(data.result);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const kd = result?.overview?.kd?.[2];

  return (
    <main className="shell">
      <h1>Delta Force Stats</h1>
      <p className="lede">Upload result screenshots and generate a structured profile.</p>
      <section className="upload-panel">
        <label>
          Screenshots
          <input
            aria-label="Screenshots"
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files || []))}
          />
        </label>
        <p>{files.length} selected</p>
        <button type="button" disabled={!files.length} onClick={analyze}>Analyze screenshots</button>
      </section>
      {message && <p className="notice">{message}</p>}
      {result && (
        <section className="result-panel">
          <h2>{result.nickname || "Unknown player"}</h2>
          <div className="stats-grid">
            <p><span>Rank</span><strong>{result.rank?.name || "Unknown"}</strong></p>
            <p><span>Absolute KD</span><strong>{kd || "Unknown"}</strong></p>
            <p><span>Escape rate</span><strong>{result.overview?.escape_rate || "Unknown"}</strong></p>
          </div>
        </section>
      )}
    </main>
  );
}
```

Append to `frontend/src/styles.css`:

```css
.upload-panel,
.result-panel {
  border: 1px solid #dfe4ee;
  border-radius: 8px;
  background: white;
  padding: 18px;
  margin-top: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.stats-grid p {
  border: 1px solid #e8edf5;
  border-radius: 8px;
  padding: 14px;
}

.stats-grid span {
  color: #66738a;
  display: block;
  margin-bottom: 8px;
}

.stats-grid strong {
  font-size: 1.4rem;
}

@media (max-width: 760px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Run Delta frontend test**

Run:

```powershell
cd frontend
npm test -- DeltaForcePage
```

Expected:

```text
1 passed
```

- [ ] **Step 4: Manual commit checkpoint**

In GitHub Desktop, review the diff and commit with:

```text
feat: add delta force frontend
```

---

### Task 11: Delta Force Recognition Adapter

**Files:**
- Create: `backend/services/delta_core/__init__.py`
- Create by copying existing source: `backend/services/delta_core/classify.py`
- Create by copying existing source: `backend/services/delta_core/imgio.py`
- Create by copying existing source: `backend/services/delta_core/lookup.py`
- Create by copying existing source: `backend/services/delta_core/ocr.py`
- Create by copying existing source: `backend/services/delta_core/parse.py`
- Modify: `backend/services/delta_ocr.py`
- Modify: `backend/requirements.txt`
- Create: `backend/tests/test_delta_force_adapter.py`

- [ ] **Step 1: Copy the existing recognition modules**

Copy these files from the existing desktop project:

```text
E:/A Study/Coding/Delta Force/dfstats/classify.py -> backend/services/delta_core/classify.py
E:/A Study/Coding/Delta Force/dfstats/imgio.py -> backend/services/delta_core/imgio.py
E:/A Study/Coding/Delta Force/dfstats/lookup.py -> backend/services/delta_core/lookup.py
E:/A Study/Coding/Delta Force/dfstats/ocr.py -> backend/services/delta_core/ocr.py
E:/A Study/Coding/Delta Force/dfstats/parse.py -> backend/services/delta_core/parse.py
```

Create `backend/services/delta_core/__init__.py` with:

```python
"""Delta Force screenshot recognition core."""
```

- [ ] **Step 2: Add recognition dependencies**

Append to `backend/requirements.txt`:

```text
rapidocr-onnxruntime>=1.2
opencv-python>=4.10
numpy>=1.26
```

- [ ] **Step 3: Write adapter cleanup test**

Create `backend/tests/test_delta_force_adapter.py` with:

```python
from pathlib import Path

from services.delta_ocr import DeltaRecognizer


class Upload:
    filename = "sample.png"
    mimetype = "image/png"

    def save(self, path):
        Path(path).write_bytes(b"fake image bytes")


def test_delta_adapter_saves_uploads_and_removes_temp_files(tmp_path):
    seen_paths = []

    def fake_record_builder(paths):
        seen_paths.extend(paths)
        assert all(Path(path).exists() for path in paths)
        return {"nickname": "Parsed Player", "overview": {"kd": ["1.0", "1.2", "1.8"]}}

    recognizer = DeltaRecognizer(upload_dir=tmp_path, record_builder=fake_record_builder)

    result = recognizer.analyze([Upload()])

    assert result["nickname"] == "Parsed Player"
    assert seen_paths
    assert list(tmp_path.iterdir()) == []
```

- [ ] **Step 4: Replace sample recognizer with adapter**

Replace `backend/services/delta_ocr.py` with:

```python
import time
from pathlib import Path

from services.delta_core.lookup import build_record


class DeltaRecognizer:
    def __init__(self, upload_dir=None, record_builder=build_record):
        self.upload_dir = Path(upload_dir or Path(__file__).parents[1] / "data" / "uploads" / "delta-force")
        self.record_builder = record_builder

    def analyze(self, files):
        if not files:
            raise ValueError("At least one screenshot is required.")
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        saved_paths = []
        stamp = str(int(time.time() * 1000))
        try:
            for index, upload in enumerate(files):
                suffix = Path(upload.filename or "screenshot.png").suffix or ".png"
                path = self.upload_dir / f"{stamp}_{index}{suffix}"
                upload.save(path)
                saved_paths.append(str(path))
            return self.record_builder(saved_paths)
        finally:
            for path in saved_paths:
                try:
                    Path(path).unlink()
                except OSError:
                    pass
```

- [ ] **Step 5: Keep the route test deterministic**

Replace `test_delta_analyze_returns_structured_result` in `backend/tests/test_delta_force_routes.py` with:

```python
def test_delta_analyze_returns_structured_result(monkeypatch, tmp_path):
    class FakeRecognizer:
        def analyze(self, files):
            return {
                "nickname": "Sample Player",
                "overview": {"kd": ["1.20", "1.50", "1.80"]},
            }

    monkeypatch.setattr("routes.delta_force.DeltaRecognizer", FakeRecognizer)
    app = create_app({"TESTING": True, "DB_PATH": tmp_path / "shop.db"})
    client = app.test_client()

    response = client.post(
        "/api/delta-force/analyze",
        data={"images": [(io.BytesIO(b"fake image bytes"), "sample.png", "image/png")]},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["result"]["nickname"] == "Sample Player"
    assert body["result"]["overview"]["kd"][2] == "1.80"
    assert body["warnings"] == []
```

- [ ] **Step 6: Run adapter tests**

Run:

```powershell
cd backend
python -m pytest tests/test_delta_force_adapter.py tests/test_delta_force_routes.py -q
```

Expected:

```text
all tests passed
```

- [ ] **Step 7: Manual recognition check**

Run the backend locally and upload real Delta Force screenshots from the browser page:

```text
http://127.0.0.1:5176/tools/delta-force
```

Expected:

- Screenshots are accepted.
- The server returns parsed fields when the screenshots match supported screens.
- Temporary upload files are deleted after the request.
- If parsing fails, the page shows a clear error or partial result.

- [ ] **Step 8: Manual commit checkpoint**

In GitHub Desktop, review the diff and commit with:

```text
feat: connect delta force recognition core
```

---

### Task 12: Gesture Beauty Cam Frontend

**Files:**
- Create: `frontend/src/tools/beauty-cam/BeautyCamPage.test.jsx`
- Modify: `frontend/src/tools/beauty-cam/BeautyCamPage.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Write camera state test**

Create `frontend/src/tools/beauty-cam/BeautyCamPage.test.jsx` with:

```jsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import BeautyCamPage from "./BeautyCamPage";

describe("BeautyCamPage", () => {
  it("renders controls and toggles camera state", async () => {
    render(<BeautyCamPage />);

    expect(screen.getByRole("heading", { name: "Gesture Beauty Cam" })).toBeInTheDocument();
    expect(screen.getByLabelText("Skin")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Turn camera off" }));
    expect(screen.getByText("Camera is off")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement first React version**

Replace `frontend/src/tools/beauty-cam/BeautyCamPage.jsx` with:

```jsx
import { useState } from "react";

const sliders = [
  ["skin", "Skin", 48],
  ["white", "Brighten", 32],
  ["slim", "Slim", 40],
  ["eye", "Eyes", 30],
  ["blush", "Blush", 28],
];

export default function BeautyCamPage() {
  const [cameraOn, setCameraOn] = useState(true);
  const [values, setValues] = useState(Object.fromEntries(sliders.map(([key, , value]) => [key, value])));

  return (
    <main className="beauty-page">
      <section className="beauty-stage">
        <canvas className="beauty-canvas" aria-label="Camera preview" />
        {!cameraOn && <div className="camera-off">Camera is off</div>}
      </section>
      <aside className="beauty-panel">
        <h1>Gesture Beauty Cam</h1>
        <p>Camera effects run in your browser after permission is granted.</p>
        {sliders.map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              aria-label={label}
              type="range"
              min="0"
              max="100"
              value={values[key]}
              onChange={(event) => setValues((current) => ({ ...current, [key]: Number(event.target.value) }))}
            />
          </label>
        ))}
        <button type="button" onClick={() => setCameraOn((current) => !current)}>
          {cameraOn ? "Turn camera off" : "Turn camera on"}
        </button>
      </aside>
    </main>
  );
}
```

Append to `frontend/src/styles.css`:

```css
.beauty-page {
  min-height: calc(100vh - 72px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  padding: 18px;
}

.beauty-stage {
  position: relative;
  min-height: 560px;
  overflow: hidden;
  border-radius: 8px;
  background: linear-gradient(135deg, #fff0f5, #eef5ff);
}

.beauty-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.camera-off {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #6a7385;
  font-weight: 800;
}

.beauty-panel {
  border: 1px solid #dfe4ee;
  border-radius: 8px;
  background: white;
  padding: 18px;
  display: grid;
  gap: 14px;
  align-content: start;
}

@media (max-width: 860px) {
  .beauty-page {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Run Beauty Cam frontend test**

Run:

```powershell
cd frontend
npm test -- BeautyCamPage
```

Expected:

```text
1 passed
```

- [ ] **Step 4: Port the existing camera logic**

Move the canvas processing logic from `E:/A Study/Coding/手势交互demo/beauty.html` into focused modules under:

```text
frontend/src/tools/beauty-cam/cameraEngine.js
frontend/src/tools/beauty-cam/particles.js
frontend/src/tools/beauty-cam/filters.js
```

Keep the React page responsible for state and UI. Keep drawing and camera operations inside the engine modules.

- [ ] **Step 5: Browser verification**

Run:

```powershell
cd frontend
npm run dev
```

Open:

```text
http://127.0.0.1:5176/tools/beauty-cam
```

Expected:

- The page loads.
- Camera permission prompt appears when engine integration is complete.
- Blocking camera access shows a visible message.
- The camera frame is not uploaded to the backend.

- [ ] **Step 6: Manual commit checkpoint**

In GitHub Desktop, review the diff and commit with:

```text
feat: add beauty cam frontend
```

---

### Task 13: Production Serving And Local Run Scripts

**Files:**
- Create: `scripts/run-dev.ps1`
- Modify: `backend/app.py`
- Create: `backend/tests/test_static_serving.py`
- Modify: `README.md`

- [ ] **Step 1: Write static serving test**

Create `backend/tests/test_static_serving.py` with:

```python
from pathlib import Path

from app import create_app


def test_frontend_build_is_served_when_dist_exists(tmp_path):
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<div id='root'></div>", encoding="utf-8")

    app = create_app({"TESTING": True, "FRONTEND_DIST": dist, "DB_PATH": tmp_path / "shop.db"})
    client = app.test_client()

    response = client.get("/")

    assert response.status_code == 200
    assert b"root" in response.data
```

- [ ] **Step 2: Add production static serving**

Update `backend/app.py` to:

```python
from pathlib import Path
from flask import Flask, send_from_directory

from routes import register_routes


def create_app(config=None):
    root = Path(__file__).parent
    app = Flask(__name__, static_folder=None)
    app.config.update(
        DB_PATH=root / "data" / "app.db",
        ADMIN_PASSWORD="change-this-locally",
        SECRET_KEY="change-this-locally",
        FRONTEND_DIST=root.parent / "frontend" / "dist",
    )
    app.config.update(config or {})
    register_routes(app)
    register_frontend(app)
    return app


def register_frontend(app):
    @app.get("/")
    def index():
        return send_from_directory(app.config["FRONTEND_DIST"], "index.html")

    @app.get("/<path:path>")
    def frontend_path(path):
        dist = Path(app.config["FRONTEND_DIST"])
        candidate = dist / path
        if candidate.is_file():
            return send_from_directory(dist, path)
        return send_from_directory(dist, "index.html")


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5175, debug=True)
```

- [ ] **Step 3: Add local run helper**

Create `scripts/run-dev.ps1` with:

```powershell
Write-Output "Terminal 1:"
Write-Output "cd backend"
Write-Output ".\.venv\Scripts\Activate.ps1"
Write-Output "python app.py"
Write-Output ""
Write-Output "Terminal 2:"
Write-Output "cd frontend"
Write-Output "npm run dev"
Write-Output ""
Write-Output "Open http://127.0.0.1:5176"
```

- [ ] **Step 4: Run backend tests**

Run:

```powershell
cd backend
python -m pytest -q
```

Expected:

```text
all tests passed
```

- [ ] **Step 5: Run frontend tests**

Run:

```powershell
cd frontend
npm test
```

Expected:

```text
all tests passed
```

- [ ] **Step 6: Manual commit checkpoint**

In GitHub Desktop, review the diff and commit with:

```text
chore: add local run workflow
```

---

### Task 14: Browser Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Start backend**

Run in one terminal:

```powershell
cd E:\A Study\Coding\pp-tools\backend
.\.venv\Scripts\Activate.ps1
python app.py
```

Expected:

```text
Running on http://127.0.0.1:5175
```

- [ ] **Step 2: Start frontend**

Run in another terminal:

```powershell
cd E:\A Study\Coding\pp-tools\frontend
npm run dev
```

Expected:

```text
Local: http://127.0.0.1:5176/
```

- [ ] **Step 3: Verify product center**

Open:

```text
http://127.0.0.1:5176/
```

Expected:

- Three cards are visible.
- Each card opens its tool page.
- Layout does not overlap at desktop width or mobile width.

- [ ] **Step 4: Verify milk tea flow**

Open:

```text
http://127.0.0.1:5176/tools/milk-tea
```

Expected:

- Products load from the backend.
- Add one item to cart.
- Enter a name.
- Submit order.
- A lookup code appears.

- [ ] **Step 5: Verify Delta Force flow**

Open:

```text
http://127.0.0.1:5176/tools/delta-force
```

Expected:

- Empty upload cannot analyze.
- Selecting an image enables the analyze button.
- The page renders either a structured result or a clear error.

- [ ] **Step 6: Verify Beauty Cam flow**

Open:

```text
http://127.0.0.1:5176/tools/beauty-cam
```

Expected:

- Controls render.
- Camera permission behavior is visible.
- Turning the camera off updates the page state.

- [ ] **Step 7: Document verified local status**

Append to `README.md`:

```markdown
## Local Verification

Verified flows:

- Product center opens all three tool pages.
- Milk Tea can create an order locally.
- Delta Force handles image selection and result state.
- Beauty Cam renders controls and camera state.
```

- [ ] **Step 8: Manual commit checkpoint**

In GitHub Desktop, review the diff and commit with:

```text
docs: record local verification
```

---

### Task 15: Homepage Link Update

**Files:**
- Modify after `pp-tools` has a real URL: `E:/A Study/Coding/My/js/content.js`
- Modify after `pp-tools` has a real URL: `E:/A Study/Coding/My/tests/content.test.js`

- [ ] **Step 1: Add tests in the homepage project**

In `E:/A Study/Coding/My/tests/content.test.js`, add a test that asserts each software entry has a live link:

```js
test("software entries prefer online links", () => {
  const software = CONTENT.software || [];

  assert.equal(software.length >= 3, true);
  for (const item of software) {
    assert.equal(typeof item.live, "string");
    assert.match(item.live, /^https?:\/\//);
  }
});
```

- [ ] **Step 2: Update homepage content**

In `E:/A Study/Coding/My/js/content.js`, replace download-first behavior by adding live URLs once production URLs exist:

```js
"live": "https://your-pp-tools-domain.example/tools/delta-force"
```

Use the same pattern for:

```text
/tools/beauty-cam
/tools/milk-tea
```

- [ ] **Step 3: Run homepage tests**

Run:

```powershell
cd E:\A Study\Coding\My
node --test
```

Expected:

```text
all tests passed
```

- [ ] **Step 4: Browser verify homepage**

Run the existing homepage server and verify:

```text
Software cards show online usage buttons.
Each button opens the matching pp-tools page.
No button requires a local download.
```

- [ ] **Step 5: Manual commit checkpoint**

In GitHub Desktop, review the diff in the homepage project and commit with:

```text
content: link software to online tools
```

---

## Final Validation

- [ ] Run backend tests:

```powershell
cd E:\A Study\Coding\pp-tools\backend
python -m pytest -q
```

- [ ] Run frontend tests:

```powershell
cd E:\A Study\Coding\pp-tools\frontend
npm test
```

- [ ] Run project guardrail scan:

```powershell
cd E:\A Study\Coding\pp-tools
.\scripts\check-project.ps1
```

- [ ] Review GitHub Desktop diff before every commit.

- [ ] Confirm no real secrets, local databases, uploads, dependency folders, or build output are staged.

- [ ] Confirm each tool page has a browser verification result.

## Suggested Execution Order

1. Task 1 through Task 4: project foundation.
2. Task 5 through Task 8: milk tea product and admin loop.
3. Task 9 through Task 11: Delta Force upload, result UI, and recognition adapter.
4. Task 12: Beauty Cam migration.
5. Task 13 through Task 14: local product integration and browser verification.
6. Task 15: homepage link update after the online suite has a stable URL.
