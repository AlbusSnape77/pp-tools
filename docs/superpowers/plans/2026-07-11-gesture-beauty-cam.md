# 手势美颜相机实施计划

**目标：** 将现有单页相机迁移为可维护的浏览器工具，完成相机授权、美颜滤镜、手势特效、拍照保存、状态反馈和资源释放闭环。

**架构：** 页面只负责编排状态和组件；媒体流、关键点检测、画布渲染与手势粒子分别放在独立模块。运行文件和模型固定版本并保存在 `public/vision`，视频帧仅在当前浏览器处理，不发送到后端。

**技术栈：** React 18、Canvas 2D、MediaDevices、`@mediapipe/tasks-vision 0.10.35`、Vitest、Testing Library。

---

## 文件结构

- `frontend/src/tools/beauty-cam/BeautyCamPage.jsx`：页面状态和组件编排。
- `frontend/src/tools/beauty-cam/CameraStage.jsx`：视频、画布、空状态和运行状态。
- `frontend/src/tools/beauty-cam/BeautyControls.jsx`：美颜参数、滤镜、相机和拍照操作。
- `frontend/src/tools/beauty-cam/CapturePreview.jsx`：照片预览、重拍和本地保存。
- `frontend/src/tools/beauty-cam/useCameraStream.js`：媒体流生命周期与设备切换。
- `frontend/src/tools/beauty-cam/visionRuntime.js`：人脸和手部关键点检测。
- `frontend/src/tools/beauty-cam/beautyRenderer.js`：画布调色、磨皮、脸部处理和腮红。
- `frontend/src/tools/beauty-cam/gestureEffects.js`：手势判断和粒子状态。
- `frontend/src/tools/beauty-cam/beauty-cam.css`：全屏相机界面与响应式布局。
- `frontend/public/vision/`：固定版本运行文件和模型。

### 任务一：建立可测试的页面状态

- [ ] 在 `BeautyCamPage.test.jsx` 写入启动、拒绝授权、关闭相机、参数更新、拍照和重拍测试。
- [ ] 运行 `npm test -- BeautyCamPage --reporter=basic`，确认旧占位页不能满足测试。
- [ ] 把页面状态限定为 `idle`、`starting`、`running`、`error` 和 `captured`。
- [ ] 错误信息使用中文，并提供“重新检测”操作。

### 任务二：实现媒体流生命周期

- [ ] 在 `useCameraStream.test.js` 模拟 `getUserMedia` 和媒体轨道。
- [ ] 验证启动约束包含视频、不包含音频，停止时调用每条轨道的 `stop()`。
- [ ] 验证页面卸载、关闭相机和切换设备都会先释放旧媒体流。
- [ ] 实现 `startCamera(facingMode)`、`stopCamera()` 和 `switchCamera()`。

### 任务三：固定视觉检测资源

- [ ] 安装固定依赖 `npm install @mediapipe/tasks-vision@0.10.35`。
- [ ] 将依赖中的运行文件复制到 `public/vision/wasm`。
- [ ] 将 `face_landmarker.task` 和 `hand_landmarker.task` 下载到 `public/vision/models`。
- [ ] 实现 `createVisionRuntime()`，使用 `VIDEO` 模式、单人脸和最多两只手。
- [ ] 检测频率限制为约 15 帧每秒，渲染继续使用浏览器动画帧。
- [ ] `close()` 必须关闭两个检测器并清空结果。

### 任务四：迁移美颜渲染

- [ ] 为参数边界、滤镜定义和画布尺寸写单元测试。
- [ ] 参数范围统一为 `0-100`，默认值为磨皮 48、美白 32、瘦脸 40、大眼 30、红润 28。
- [ ] 滤镜提供原图、奶油、蜜桃、初恋和樱花五档。
- [ ] 视频先镜像绘制到离屏画布，再执行调色、柔化、局部脸部处理和红润叠加。
- [ ] 按住“查看原图”时跳过美颜处理，但保留相机画面。

### 任务五：迁移手势特效

- [ ] 为张开手掌、捏合和双手同时张开写边界测试。
- [ ] 张开手掌触发彩色粒子，捏合触发闪光，双手张开触发爱心。
- [ ] 粒子总数设置上限，离开画布或生命结束后立即移除。
- [ ] 没有检测结果时仍正常渲染视频，不显示错误。

### 任务六：完成拍照闭环

- [ ] 点击拍照后从最终画布生成 PNG 数据地址。
- [ ] `CapturePreview` 显示照片，并提供“重新拍摄”和“保存图片”。
- [ ] 保存文件名使用 `beauty-cam-YYYYMMDD-HHmmss.png`。
- [ ] 预览期间暂停检测，重拍后恢复。

### 任务七：完成相机界面

- [ ] `CameraStage` 使用大面积 16:9 画面，未启动时显示明确的“开启相机”主操作。
- [ ] `BeautyControls` 在桌面端固定于左侧，在手机端变为底部可滚动面板。
- [ ] 所有按钮不小于 40 像素，控制面板可收起。
- [ ] 显示相机状态、检测状态和当前帧率。
- [ ] 更新首页相机状态为“可直接使用”。

### 任务八：验证完成度

- [ ] 运行 `npm test -- --reporter=basic`，所有测试通过。
- [ ] 运行 `npm run build`，生产构建成功。
- [ ] 运行 `git diff --check`，没有空白错误。
- [ ] 在真实浏览器验证 1440×900 和 390×844，无横向溢出或控件重叠。
- [ ] 验证授权成功、授权拒绝、参数变化、前后镜头切换、手势反馈、拍照、重拍、保存和关闭相机。
- [ ] 确认页面离开后摄像头指示灯关闭，控制台无未处理错误。

## 验收标准

1. 用户必须主动点击后才申请摄像头权限。
2. 摄像头画面和照片只在本地浏览器处理。
3. 五项美颜、五种滤镜、三类手势反馈和拍照闭环全部可用。
4. 拒绝权限、找不到设备和模型加载失败都有中文恢复提示。
5. 自动测试、生产构建以及桌面和手机真实浏览器验收全部通过。
