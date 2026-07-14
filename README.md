# PP Tools 在线工具套件

PP Tools 是一套个人工具项目，包含统一工具首页、两个可直接在浏览器使用的工具，以及一个可下载并导入微信开发者工具的小程序源码包。

## 已有工具

- Delta 战绩分析：上传战绩截图，整理玩家档案、能力数据和最近战绩。
- 手势美颜相机：在浏览器内完成实时美颜、滤镜、手势特效和本地拍照。
- 三平方茶作：下载完整微信小程序源码，默认使用本地演示数据，可按说明接入自己的云开发环境。

## 小程序源码包

工具首页中的“三平方奶茶店”卡片会下载 `sanpingfang-miniprogram-source.zip`。解压后，将包含 `app.js` 和 `project.config.json` 的根目录导入微信开发者工具即可运行。

公开源码包不包含本机私有项目配置、原项目标识、云环境标识或 Git 历史。重新生成源码包时运行：

```powershell
backend\.venv\Scripts\python.exe scripts\build_miniprogram_package.py `
  --source "E:\A Study\Coding\miniprogram-1" `
  --output "frontend\public\downloads\sanpingfang-miniprogram-source.zip" `
  --copy-to "E:\A Study\Coding\My\downloads\sanpingfang-miniprogram-source.zip"
```

## 首次配置

1. 将 `.env.example` 复制为 `.env`。
2. 修改 `.env` 中的 `ADMIN_PASSWORD`，作为本地服务管理功能的密码。
3. 修改 `.env` 中的 `SECRET_KEY`，建议使用至少 32 位且不容易猜到的随机字符串。
4. 安装后端依赖：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

5. 安装前端依赖：

```powershell
cd frontend
npm install
```

## 日常启动

在项目根目录双击 `start-pp-tools.cmd`，脚本会自动：

1. 读取本机 `.env` 配置；
2. 构建最新前端页面；
3. 检查数据库目录；
4. 启动本地生产服务；
5. 打开 `http://127.0.0.1:5175`。

启动窗口需要保持打开。关闭窗口或按 `Ctrl+C` 即可停止服务。

### Delta Companion

Delta 战绩分析通过本机 `Delta Companion` 完成游戏窗口操作、截图、OCR、档案保存和校准。个人网站在本机进入 Delta 页面时才会按需启动 Companion，不会随网站主页一起启动。

首次使用步骤：

1. 在个人网站打开“Delta 战绩分析”。
2. 如果本机尚未安装，下载 `Delta-Companion.exe` 并放在固定目录；直接运行一次后会为当前 Windows 用户注册 `delta-stats://`。
3. Companion 窗口显示 6 位配对码时，在网页连接面板输入该号码。
4. 打开《三角洲行动》并停留在自动查询支持的起始页面。
5. 输入昵称或 UID，确认 5 秒倒计时后等待任务完成。自动操作期间不要移动鼠标或输入键盘。

查询过程中可以点击“停止任务”，Companion 会在下一个检查点停止并归还鼠标和键盘。网页中的“校准”页面可以获取桌面截图、框选控件并保存备用模板；手动上传截图与自动查询写入同一个玩家数据库。

“撤销配对”会删除当前网站的本机授权。更新时使用新的 `Delta-Companion.exe` 替换旧文件并重新运行即可。卸载时先在 Companion 中移除协议注册，再删除 EXE；玩家数据库位于当前用户的本地应用数据目录，不会随 EXE 一起删除。

未来部署到 HTTPS 域名时，构建命令必须显式加入真实来源：

```powershell
backend\.venv\Scripts\python.exe companion\build_companion.py --allowed-origin https://你的实际域名
```

未写入发布清单的公网来源无法配对或调用本机接口。

## 数据备份

在项目根目录运行：

```powershell
.\scripts\backup-data.ps1
```

备份文件会保存到 `backend/data/backups`，文件名带有时间戳，不会覆盖历史备份。数据库和备份目录都只保存在本机，不会进入仓库。

## 开发模式

后端：

```powershell
cd backend
.\.venv\Scripts\python.exe app.py
```

前端：

```powershell
cd frontend
npm run dev
```

开发地址为 `http://127.0.0.1:5176`，前端接口会转发到 `http://127.0.0.1:5175`。

## 提交前检查

```powershell
.\scripts\check-project.ps1
```

提交和推送继续使用 GitHub Desktop。提交前查看 Changes 和 Diff，确认没有 `.env`、数据库、上传图片或临时文件。
