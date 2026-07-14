# 三平方奶茶店小程序源码下载实施计划

> **执行要求：** 按任务顺序实施；每个功能先写失败测试，再写实现。提交和推送由用户在 GitHub Desktop 中完成，执行过程不自动提交。

**目标：** 将三平方奶茶店改为经过脱敏、可导入微信开发者工具、默认支持本地演示的源码下载包，并让工具网站和个人网站提供真实下载入口。

**架构：** 原小程序增加统一运行配置和数据调用入口。`demo` 模式把现有云函数调用映射到本地存储处理器，`cloud` 模式继续调用微信云函数；页面不感知数据来源。独立打包脚本从小程序项目生成脱敏 ZIP，并复制到两个网站的公开下载目录。

**技术栈：** 微信原生小程序、CommonJS、微信本地存储、微信云开发、Node.js 内置测试、Python `zipfile`、React、静态网站。

---

## 文件结构

### `miniprogram-1`

- 新建 `config/runtime.js`：公开运行模式和云环境配置。
- 新建 `utils/data-runtime.js`：统一分发本地演示调用和微信云函数调用。
- 新建 `utils/demo/seed-data.js`：演示账号、商品、门店和初始数据。
- 新建 `utils/demo/store.js`：本地演示数据库读写、初始化和重置。
- 新建 `utils/demo/auth.js`：注册、用户登录和管理员登录。
- 新建 `utils/demo/products.js`：商品读取、保存、删除和状态管理。
- 新建 `utils/demo/orders.js`：创建订单、查询订单、库存扣减和状态流转。
- 新建 `utils/demo/users.js`：购物车、收藏和最近浏览数据。
- 新建 `utils/demo/shop.js`：门店配置和商品售卖状态。
- 新建 `utils/demo/feedback.js`：用户反馈和管理端处理。
- 新建 `utils/demo/account.js`：本地账号资料修改。
- 新建 `utils/demo/index.js`：按云函数名称分发演示请求。
- 新建 `tests/helpers/wx-mock.cjs`：Node 测试使用的微信存储模拟。
- 新建 `tests/demo-runtime.test.cjs`：本地演示核心流程测试。
- 新建 `package.json`：提供零依赖测试命令。
- 修改 `app.js`：按运行模式决定是否初始化云开发。
- 修改 `utils/cloud-*.js`、`utils/media-uploader.js`：统一走数据运行入口。
- 修改 `pages/mine/mine.js`、`pages/mine/mine.wxml`：增加演示数据重置入口。
- 修改 `.gitignore`、`project.config.json`、`README.md`：脱敏和运行说明。

### `pp-tools`

- 新建 `scripts/build_miniprogram_package.py`：生成脱敏 ZIP。
- 新建 `backend/tests/test_miniprogram_package.py`：打包结构与脱敏测试。
- 新建 `frontend/public/downloads/sanpingfang-miniprogram-source.zip`：网站下载文件。
- 修改 `frontend/src/pages/HomePage.jsx`、`HomePage.test.jsx`：改为源码下载卡片。
- 修改 `frontend/src/components/AppLayout.jsx`：奶茶导航返回项目卡。
- 修改 `frontend/src/App.jsx`、`App.test.jsx`：移除奶茶浏览器公开路由。
- 修改中文 spec 和 README：记录交付变化。

### `My`

- 新建 `downloads/sanpingfang-miniprogram-source.zip`：个人网站下载文件。
- 修改 `js/content.js`：奶茶项目使用站内 ZIP 下载地址。

---

## 任务 1：建立小程序运行配置和测试环境

**文件：**

- 新建：`E:/A Study/Coding/miniprogram-1/config/runtime.js`
- 新建：`E:/A Study/Coding/miniprogram-1/package.json`
- 新建：`E:/A Study/Coding/miniprogram-1/tests/helpers/wx-mock.cjs`
- 新建：`E:/A Study/Coding/miniprogram-1/tests/runtime-config.test.cjs`
- 修改：`E:/A Study/Coding/miniprogram-1/app.js`

- [ ] **步骤 1：写运行配置失败测试**

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const runtime = require('../config/runtime');

test('公开源码默认使用本地演示模式', () => {
  assert.equal(runtime.mode, 'demo');
  assert.equal(runtime.cloudEnvId, '');
  assert.equal(runtime.isDemo(), true);
});
```

- [ ] **步骤 2：运行测试并确认失败**

运行：`node --test tests/runtime-config.test.cjs`  
预期：失败，提示找不到 `config/runtime`。

- [ ] **步骤 3：实现公开运行配置**

```javascript
const runtime = {
  mode: 'demo',
  cloudEnvId: ''
};

runtime.isDemo = function isDemo() {
  return runtime.mode === 'demo';
};

runtime.validate = function validate() {
  if (!['demo', 'cloud'].includes(runtime.mode)) {
    throw new Error('运行模式只能是 demo 或 cloud');
  }
  if (runtime.mode === 'cloud' && !String(runtime.cloudEnvId || '').trim()) {
    throw new Error('云开发模式必须配置 cloudEnvId');
  }
};

module.exports = runtime;
```

- [ ] **步骤 4：让应用只在云模式初始化云开发**

`app.js` 顶部引入配置，并将原来的固定环境改为：

```javascript
const runtime = require('./config/runtime');
const storage = require('./utils/storage');

function initializeRuntime() {
  runtime.validate();
  if (runtime.isDemo()) return;
  if (!wx.cloud) throw new Error('当前基础库不支持云开发');
  wx.cloud.init({ env: runtime.cloudEnvId, traceUser: true });
}
```

`onLaunch` 调用 `initializeRuntime()`，不再出现固定云环境 ID。

- [ ] **步骤 5：增加零依赖测试命令**

```json
{
  "private": true,
  "scripts": {
    "test": "node --test tests/*.test.cjs"
  }
}
```

- [ ] **步骤 6：运行测试并确认通过**

运行：`npm test`  
预期：运行配置测试通过。

---

## 任务 2：实现本地演示数据库和初始数据

**文件：**

- 新建：`E:/A Study/Coding/miniprogram-1/utils/demo/seed-data.js`
- 新建：`E:/A Study/Coding/miniprogram-1/utils/demo/store.js`
- 修改：`E:/A Study/Coding/miniprogram-1/tests/helpers/wx-mock.cjs`
- 修改：`E:/A Study/Coding/miniprogram-1/tests/demo-runtime.test.cjs`

- [ ] **步骤 1：写初始化和持久化失败测试**

```javascript
test('首次读取时初始化演示数据库并保持后续修改', () => {
  const first = store.read();
  assert.ok(first.products.length >= 12);
  first.shop.status = 'pause';
  store.write(first);
  assert.equal(store.read().shop.status, 'pause');
});

test('重置后恢复初始商品、账号和门店状态', () => {
  const reset = store.reset();
  assert.equal(reset.shop.status, 'open');
  assert.equal(reset.users[0].username, 'user');
  assert.equal(reset.admins[0].username, 'admin');
});
```

- [ ] **步骤 2：运行测试并确认失败**

运行：`npm test`  
预期：失败，提示找不到 `utils/demo/store`。

- [ ] **步骤 3：建立演示初始数据**

`seed-data.js` 导出 `createSeedData()`，返回全新的对象，字段固定为：

```javascript
{
  version: 1,
  users: [{ id: 'demo-user-1', username: 'user', password: '123456', nickname: '演示用户', role: 'user', enabled: true }],
  admins: [{ id: 'demo-admin-1', username: 'admin', password: 'admin123', nickname: '演示管理员', role: 'admin', enabled: true }],
  products: [],
  orders: [],
  feedback: [],
  userData: { 'demo-user-1': { cartList: [], favoriteList: [], recentViewedList: [] } },
  productStatus: {},
  shop: { storeId: 'default', status: 'open', storeLogo: '', storeCover: '', updatedAt: 0, updatedBy: 'demo' },
  counters: { product: 100, order: 1000, feedback: 100 }
}
```

商品数组复用现有云函数的中文默认商品字段，至少包含 12 款，且每款包含 `id`、`name`、`desc`、`price`、`category`、`tag`、`iconType`、`icon`、`stock`、`enabled` 和 `sortOrder`。

- [ ] **步骤 4：实现本地存储封装**

`store.js` 只负责 `read()`、`write(data)`、`update(mutator)` 和 `reset()`。存储键固定为 `spfDemoDatabaseV1`，每次返回深拷贝，避免页面直接修改数据库对象。

```javascript
const { createSeedData } = require('./seed-data');
const DATABASE_KEY = 'spfDemoDatabaseV1';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function read() {
  const saved = wx.getStorageSync(DATABASE_KEY);
  if (saved && saved.version === 1) return clone(saved);
  return reset();
}

function write(data) {
  const next = clone(data);
  wx.setStorageSync(DATABASE_KEY, next);
  return clone(next);
}

function update(mutator) {
  const current = read();
  const result = mutator(current) || current;
  return write(result);
}

function reset() {
  return write(createSeedData());
}

module.exports = { DATABASE_KEY, read, write, update, reset };
```

- [ ] **步骤 5：运行测试并确认通过**

运行：`npm test`  
预期：初始化、持久化和重置测试通过。

---

## 任务 3：实现演示账号、用户数据和商品处理器

**文件：**

- 新建：`E:/A Study/Coding/miniprogram-1/utils/demo/auth.js`
- 新建：`E:/A Study/Coding/miniprogram-1/utils/demo/users.js`
- 新建：`E:/A Study/Coding/miniprogram-1/utils/demo/products.js`
- 修改：`E:/A Study/Coding/miniprogram-1/tests/demo-runtime.test.cjs`

- [ ] **步骤 1：写登录、用户数据和商品失败测试**

```javascript
test('演示用户和管理员可以登录', async () => {
  assert.equal((await auth.userLogin({ username: 'user', password: '123456' })).authInfo.role, 'user');
  assert.equal((await auth.adminEntry({ username: 'admin', password: 'admin123' })).authInfo.role, 'admin');
});

test('商品支持读取、新增、编辑和停售', async () => {
  const initial = await products.listProducts();
  const created = await products.upsertProduct({ product: { name: '测试饮品', desc: '测试描述', price: 15, category: '果茶', stock: 8 } });
  assert.equal(created.product.name, '测试饮品');
  await products.updateStatus({ productId: created.product.id, status: 'paused' });
  assert.equal((await products.listStatus()).list.find(item => item.productId === created.product.id).status, 'paused');
  assert.ok(initial.list.length >= 12);
});
```

- [ ] **步骤 2：运行测试并确认失败**

运行：`npm test`  
预期：失败，提示演示处理器不存在。

- [ ] **步骤 3：实现认证规则**

`auth.js` 实现 `userRegister`、`userLogin` 和 `adminEntry`。用户名去除首尾空格；普通用户密码至少 6 位；重复用户名拒绝注册；返回字段与现有 `userAuth` 云函数一致。

- [ ] **步骤 4：实现用户数据规则**

`users.js` 实现 `getUserData({ userId })` 和 `updateUserData({ userId, data })`，只允许更新 `cartList`、`favoriteList` 和 `recentViewedList`，每项不是数组时保存为空数组。

- [ ] **步骤 5：实现商品规则**

`products.js` 实现：

- `listProducts()`：返回启用商品并按 `sortOrder` 排序；
- `getProduct({ id })`：找不到时抛出“商品不存在”；
- `upsertProduct({ product })`：校验名称、分类、描述、正数价格和非负库存；
- `deleteProduct({ id })`：从商品与状态表中删除；
- `listStatus()`：返回 `{ productId, status, updatedAt, updatedBy }` 数组；
- `updateStatus({ productId, status })`：只允许 `on`、`paused`、`soldout`。

- [ ] **步骤 6：运行测试并确认通过**

运行：`npm test`  
预期：认证、用户数据和商品测试通过。

---

## 任务 4：实现演示订单、门店、反馈和账号处理器

**文件：**

- 新建：`E:/A Study/Coding/miniprogram-1/utils/demo/orders.js`
- 新建：`E:/A Study/Coding/miniprogram-1/utils/demo/shop.js`
- 新建：`E:/A Study/Coding/miniprogram-1/utils/demo/feedback.js`
- 新建：`E:/A Study/Coding/miniprogram-1/utils/demo/account.js`
- 修改：`E:/A Study/Coding/miniprogram-1/tests/demo-runtime.test.cjs`

- [ ] **步骤 1：写完整订单闭环失败测试**

```javascript
test('下单扣减库存，管理员更新状态，用户可以查询', async () => {
  const before = (await products.getProduct({ id: 1 })).product.stock;
  const created = await orders.createOrder({
    userId: 'demo-user-1',
    order: { totalPrice: 16, payablePrice: 16, items: [{ id: 1, name: '珍珠奶茶', price: 16, quantity: 1 }] }
  });
  assert.equal((await products.getProduct({ id: 1 })).product.stock, before - 1);
  await orders.updateStatus({ action: 'adminUpdateById', orderId: created.order.id, status: '制作中' });
  const mine = await orders.listOrders({ scope: 'mine', userId: 'demo-user-1' });
  assert.equal(mine.list[0].status, '制作中');
});
```

- [ ] **步骤 2：运行测试并确认失败**

运行：`npm test`  
预期：失败，提示订单处理器不存在。

- [ ] **步骤 3：实现订单一致性规则**

`orders.js` 在一次 `store.update` 中校验门店状态、商品启用状态、手动售卖状态和库存，然后扣减库存并创建订单。订单字段保持现有页面使用的 `id`、`userId`、`orderNo`、`pickupCode`、`createTime`、`status`、`totalPrice`、`payablePrice`、`items`、`verifyStatus` 和预约字段。

取消订单时只允许用户取消自己的未完成订单，并按照订单商品恢复库存一次。管理员核销取餐码后把订单设为 `已完成` 和 `已核销`。

- [ ] **步骤 4：实现门店和反馈规则**

`shop.js` 实现门店读取、门店更新、商品状态读取和商品状态更新。`feedback.js` 实现用户反馈创建、按用户或全部查询、管理端标记已处理。

- [ ] **步骤 5：实现账号修改规则**

`account.js` 根据当前 `authInfo.role` 查找用户或管理员，验证当前密码后更新昵称、用户名、头像或新密码，返回更新后的 `authInfo`。

- [ ] **步骤 6：运行测试并确认通过**

运行：`npm test`  
预期：订单、库存、门店、反馈和账号测试通过。

---

## 任务 5：建立统一数据调用入口并接入现有页面

**文件：**

- 新建：`E:/A Study/Coding/miniprogram-1/utils/demo/index.js`
- 新建：`E:/A Study/Coding/miniprogram-1/utils/data-runtime.js`
- 修改：`E:/A Study/Coding/miniprogram-1/utils/cloud-auth.js`
- 修改：`E:/A Study/Coding/miniprogram-1/utils/cloud-product.js`
- 修改：`E:/A Study/Coding/miniprogram-1/utils/cloud-order.js`
- 修改：`E:/A Study/Coding/miniprogram-1/utils/cloud-user.js`
- 修改：`E:/A Study/Coding/miniprogram-1/utils/cloud-shop.js`
- 修改：`E:/A Study/Coding/miniprogram-1/utils/cloud-feedback.js`
- 修改：`E:/A Study/Coding/miniprogram-1/utils/cloud-account.js`
- 修改：`E:/A Study/Coding/miniprogram-1/utils/cloud-file.js`
- 修改：`E:/A Study/Coding/miniprogram-1/utils/media-uploader.js`

- [ ] **步骤 1：写统一分发失败测试**

```javascript
test('demo 模式不会调用 wx.cloud', async () => {
  wx.cloud.callFunction = () => { throw new Error('不应调用云函数'); };
  const result = await runtime.callFunction('productList');
  assert.ok(result.list.length >= 12);
});

test('未知演示调用返回明确错误', async () => {
  await assert.rejects(() => runtime.callFunction('unknownFunction'), /不支持的演示操作/);
});
```

- [ ] **步骤 2：运行测试并确认失败**

运行：`npm test`  
预期：失败，提示 `data-runtime` 不存在。

- [ ] **步骤 3：实现演示调用名称映射**

`utils/demo/index.js` 使用明确映射，不使用动态执行：

```javascript
const handlers = {
  userAuth: data => auth.handle(data),
  productList: () => products.listProducts(),
  productGet: data => products.getProduct(data),
  productUpsert: data => products.upsertProduct(data),
  productDelete: data => products.deleteProduct(data),
  orderList: data => orders.listOrders(data),
  orderCreate: data => orders.createOrder(data),
  orderUpdateStatus: data => orders.updateStatus(data),
  userDataGet: data => users.getUserData(data),
  userDataUpdate: data => users.updateUserData(data),
  shopConfigGet: () => shop.getConfig(),
  shopConfigUpdate: data => shop.updateConfig(data),
  productStatusList: () => products.listStatus(),
  productStatusUpdate: data => products.updateStatus(data),
  feedbackList: data => feedback.list(data),
  feedbackCreate: data => feedback.create(data),
  feedbackUpdateStatus: data => feedback.updateStatus(data),
  accountUpdate: data => account.update(data),
  openid: () => ({ success: true, openid: 'demo-openid' })
};
```

- [ ] **步骤 4：实现云与本地统一调用**

`data-runtime.js` 的 `callFunction(name, data)` 在演示模式调用上方映射，在云模式调用 `wx.cloud.callFunction`。两种模式都把 `{ success: false, message }` 转成 `Error`，因此现有页面错误处理保持不变。

- [ ] **步骤 5：替换重复的云函数封装**

七个 `cloud-*.js` 文件中的私有 `callCloud` 统一改为：

```javascript
const dataRuntime = require('./data-runtime');

function callCloud(name, data = {}) {
  return dataRuntime.callFunction(name, data);
}
```

保持各文件现有导出方法名和页面调用方式不变。

- [ ] **步骤 6：处理演示模式图片**

`cloud-file.js` 在演示模式直接返回本地路径、HTTP 地址、emoji 或空字符串，不请求临时云链接。`media-uploader.js` 在演示模式把选择到的临时文件路径作为 `fileID` 返回；云模式继续上传云存储。

- [ ] **步骤 7：运行全部小程序测试**

运行：`npm test`  
预期：全部通过，且测试中 `wx.cloud.callFunction` 调用次数为 0。

---

## 任务 6：增加演示数据重置与云模式配置保护

**文件：**

- 修改：`E:/A Study/Coding/miniprogram-1/pages/mine/mine.js`
- 修改：`E:/A Study/Coding/miniprogram-1/pages/mine/mine.wxml`
- 修改：`E:/A Study/Coding/miniprogram-1/pages/mine/mine.wxss`
- 修改：`E:/A Study/Coding/miniprogram-1/README.md`
- 修改：`E:/A Study/Coding/miniprogram-1/.gitignore`
- 修改：`E:/A Study/Coding/miniprogram-1/project.config.json`

- [ ] **步骤 1：写重置保护测试**

测试 `runtime.isDemo()` 为 `false` 时不暴露重置动作；演示模式确认后调用 `store.reset()`，并清除 `authInfo` 后跳转登录页。

- [ ] **步骤 2：增加“重置演示数据”入口**

只在 `runtime.isDemo()` 时显示该入口。点击后使用 `wx.showModal` 提示“商品、订单、账号修改和门店设置会恢复初始值”，只有 `res.confirm` 为真才重置。

- [ ] **步骤 3：脱敏项目配置**

将 `project.config.json` 的 `appid` 改为 `touristappid`，将 `project.private.config.json` 加入 `.gitignore`。本机私有配置保留在磁盘，但发布包和 GitHub 不包含它。

- [ ] **步骤 4：重写中文 README 运行步骤**

README 明确说明：解压、导入目录、使用测试号或自己的 AppID、演示账号、重置方法、切换 `demo`/`cloud`、创建云环境、部署云函数和创建数据库集合。

- [ ] **步骤 5：扫描固定环境标识**

运行：

```powershell
rg -n "wx[0-9a-fA-F]{16}|cloud[0-9]+-[A-Za-z0-9-]+" . -g "!project.private.config.json" -g "!.git/**"
```

预期：无结果。固定环境候选值从 `cloud-file.js` 和相关云函数中删除，云函数只使用 `cloud.DYNAMIC_CURRENT_ENV`。

- [ ] **步骤 6：运行小程序测试**

运行：`npm test`  
预期：全部通过。

---

## 任务 7：实现可重复的脱敏打包脚本

**文件：**

- 新建：`E:/A Study/Coding/pp-tools/scripts/build_miniprogram_package.py`
- 新建：`E:/A Study/Coding/pp-tools/backend/tests/test_miniprogram_package.py`
- 生成：`E:/A Study/Coding/pp-tools/frontend/public/downloads/sanpingfang-miniprogram-source.zip`
- 生成：`E:/A Study/Coding/My/downloads/sanpingfang-miniprogram-source.zip`

- [ ] **步骤 1：写打包失败测试**

```python
def test_archive_contains_project_root_and_excludes_private_files(tmp_path):
    archive = build_package(source_fixture(tmp_path), tmp_path / "source.zip")
    with ZipFile(archive) as package:
        names = set(package.namelist())
        assert "app.js" in names
        assert "app.json" in names
        assert "project.config.json" in names
        assert "project.private.config.json" not in names
        assert not any(name.startswith(".git/") for name in names)


def test_archive_rejects_private_identifiers(tmp_path):
    source = source_fixture(tmp_path)
    (source / "app.js").write_text("cloud1-private", encoding="utf-8")
    with pytest.raises(ValueError, match="敏感标识"):
        build_package(source, tmp_path / "source.zip")
```

- [ ] **步骤 2：运行测试并确认失败**

运行：`backend\.venv\Scripts\python.exe -m pytest backend/tests/test_miniprogram_package.py -q`  
预期：失败，提示找不到打包模块。

- [ ] **步骤 3：实现固定白名单打包**

脚本只复制根文件 `app.js`、`app.json`、`app.wxss`、`sitemap.json`、`project.config.json`、`README.md`、`package.json`，以及目录 `cloudfunctions`、`components`、`config`、`ec-canvas`、`pages`、`styles`、`tabbar`、`utils`。

拒绝扩展名为 `.log`、`.db`、`.sqlite` 的文件，拒绝 `node_modules`、`.git`、`project.private.config.json`。ZIP 使用临时文件生成，全部检查通过后再原子替换目标文件。

- [ ] **步骤 4：实现内容扫描和校验值**

扫描文本文件中的 AppID 模式 `wx[0-9a-fA-F]{16}`、云环境模式 `cloud[0-9]+-[A-Za-z0-9-]+`、`project.private.config.json` 和 Windows 绝对路径。生成完成后输出文件数、字节数和 SHA-256。

- [ ] **步骤 5：运行打包测试并生成两个网站文件**

运行：

```powershell
backend\.venv\Scripts\python.exe scripts\build_miniprogram_package.py `
  --source "E:\A Study\Coding\miniprogram-1" `
  --output "frontend\public\downloads\sanpingfang-miniprogram-source.zip" `
  --copy-to "E:\A Study\Coding\My\downloads\sanpingfang-miniprogram-source.zip"
```

预期：两个 ZIP 的 SHA-256 完全一致，且脚本退出码为 0。

---

## 任务 8：把 PP Tools 奶茶入口改为源码下载

**文件：**

- 修改：`E:/A Study/Coding/pp-tools/frontend/src/pages/HomePage.test.jsx`
- 修改：`E:/A Study/Coding/pp-tools/frontend/src/pages/HomePage.jsx`
- 修改：`E:/A Study/Coding/pp-tools/frontend/src/components/AppLayout.jsx`
- 修改：`E:/A Study/Coding/pp-tools/frontend/src/App.test.jsx`
- 修改：`E:/A Study/Coding/pp-tools/frontend/src/App.jsx`

- [ ] **步骤 1：写下载入口失败测试**

```javascript
const download = within(gallery).getByRole('link', { name: '下载三平方奶茶店小程序源码' });
expect(download).toHaveAttribute('href', '/downloads/sanpingfang-miniprogram-source.zip');
expect(download).toHaveAttribute('download', 'sanpingfang-miniprogram-source.zip');
expect(within(gallery).getByText('源码可下载')).toBeInTheDocument();
expect(screen.queryByRole('link', { name: '奶茶店' })).not.toHaveAttribute('href', '/tools/milk-tea');
```

- [ ] **步骤 2：运行测试并确认失败**

运行：`npm test -- --run src/pages/HomePage.test.jsx src/App.test.jsx`  
预期：失败，当前入口仍是 `/tools/milk-tea`。

- [ ] **步骤 3：实现下载型工具卡**

奶茶工具数据改为：

```javascript
{
  href: "/downloads/sanpingfang-miniprogram-source.zip",
  download: "sanpingfang-miniprogram-source.zip",
  eyebrow: "微信原生小程序",
  title: "三平方奶茶店",
  description: "下载完整源码，使用微信开发者工具导入；内置本地演示模式。",
  features: ["原生小程序", "本地演示", "云开发可选"],
  action: "下载小程序源码",
  status: "源码可下载",
  ready: true
}
```

渲染链接时把 `download` 属性和无障碍名称 `下载三平方奶茶店小程序源码` 写入按钮。图片只打开预览或定位卡片，不冒充在线运行入口。

- [ ] **步骤 4：移除公开奶茶浏览器路由**

`App.jsx` 不再导入 `MilkTeaPage` 和 `AdminMilkTeaPage`。访问旧路径时回到工具首页。公共导航中的奶茶项改为 `/#tools`，标签改为“奶茶源码”。现有未引用页面文件暂不删除，避免把路由切换和历史代码清理混成同一风险步骤。

- [ ] **步骤 5：运行前端测试和构建**

运行：`npm test` 和 `npm run build`  
预期：全部测试通过，构建产物包含下载 ZIP。

---

## 任务 9：更新个人网站的奶茶源码下载

**文件：**

- 修改：`E:/A Study/Coding/My/js/content.js`
- 验证：`E:/A Study/Coding/My/js/app.js`
- 生成：`E:/A Study/Coding/My/downloads/sanpingfang-miniprogram-source.zip`

- [ ] **步骤 1：更新三语项目说明和下载地址**

奶茶项目 `download` 改为：

```javascript
"download": "downloads/sanpingfang-miniprogram-source.zip"
```

中文说明明确“下载后使用微信开发者工具导入，默认本地演示，不连接作者云环境”；英文和日文表达相同事实。`source` 继续链接源码仓库。

- [ ] **步骤 2：验证相对链接使用下载属性**

确认 `js/app.js` 的 `linkAttrs` 对非 HTTP 地址返回 `download`。不新增弹窗、不改软件卡现有 UI。

- [ ] **步骤 3：真实浏览器验证个人网站**

打开本地个人网站软件页，点击奶茶项目“下载”，确认浏览器下载文件名为 `sanpingfang-miniprogram-source.zip`，ZIP 可以解压。

---

## 任务 10：完成全量验收和文档收口

**文件：**

- 修改：`E:/A Study/Coding/pp-tools/docs/superpowers/specs/2026-07-11-miniprogram-download-package-design.md`
- 修改：`E:/A Study/Coding/pp-tools/README.md`
- 修改：`E:/A Study/Coding/pp-tools/scripts/check-project.ps1`

- [ ] **步骤 1：运行三个项目的自动检查**

```powershell
cd "E:\A Study\Coding\miniprogram-1"
npm test

cd "E:\A Study\Coding\pp-tools"
backend\.venv\Scripts\python.exe -m pytest -q
cd frontend
npm test
npm run build
```

预期：全部通过。

- [ ] **步骤 2：检查 ZIP 内容和脱敏结果**

解压到临时目录，确认根目录直接出现 `app.js` 和 `project.config.json`；扫描原 AppID、原云环境 ID、`.git`、私有项目配置和绝对路径，预期无结果。

- [ ] **步骤 3：使用微信开发者工具验收**

导入解压目录，依次验证：编译、用户登录、商品筛选、商品详情、购物车、下单、订单查询、管理员登录、订单状态更新、商品启停、关闭后重新打开数据仍存在、重置演示数据恢复初始状态。

- [ ] **步骤 4：使用真实浏览器验收两个下载入口**

在 1440×900 和 390×844 下检查 PP Tools 卡片；在个人网站软件页检查下载按钮。两个入口下载的 ZIP 校验值必须一致，页面不得出现横向溢出或旧的“在线点单”表述。

- [ ] **步骤 5：更新状态并执行仓库检查**

spec 状态从“待审阅”改为“已完成”。`check-project.ps1` 增加 ZIP 存在、私有配置未进入 `pp-tools`、下载链接正确的检查。运行 `git diff --check`，并分别查看 `miniprogram-1`、`pp-tools`、`My` 的 GitHub Desktop Changes。

- [ ] **步骤 6：由用户分仓库提交**

建议在 GitHub Desktop 中分别提交：

- `miniprogram-1`：`feat: add portable demo runtime`
- `pp-tools`：`feat: publish miniprogram source download`
- `My`：`feat: add miniprogram source download`

执行过程不自动提交或推送。
