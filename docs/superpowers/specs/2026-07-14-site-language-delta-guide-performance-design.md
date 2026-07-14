# 网站中文默认、Delta 引导与性能优化规格

日期：2026-07-14  
版本：1.0  
状态：已通过  
结论：有条件可行

## 中文

### 1. 背景与问题

网站首次访问默认英文；Delta 缺少明确返回入口和首次使用引导；个人网站动画及美颜相机存在不必要的每帧负担，影响流畅度。

### 2. 目标

- 首次访问默认中文，同时保留用户主动选择的语言。
- 让首次使用者能够返回工具中心，并按简洁引导完成 Delta 查询准备。
- 减少无效后台工作，让网站动画和相机尽量利用设备可用刷新率。

### 3. 非目标

- 不重做网站整体 UI、Delta 查询逻辑或 Companion 自动操作流程。
- 不修改 OCR、档案数据、通信协议、存储结构或权限范围。
- 不承诺所有设备固定达到 60、120 或 144 FPS。

### 4. 用户与使用场景

- 新访客打开网站时直接看到中文内容。
- 用户进入 Delta 后完成启动、配对、游戏准备和查询，并能一键返回。
- 用户在桌面端或移动端浏览网站、使用摄像头时获得稳定且响应及时的画面。

### 5. 范围与边界

- **仓库边界**：`pp-tools` 维护 Delta、美颜相机和嵌入源码；`My` 维护网站语言、背景动画和嵌入接入。禁止直接修改 `My/tools/pp-tools` 中的生成文件。
- **语言边界**：仅把无效或缺失语言记录的回退值改为中文；有效的英文或日文选择不重置。
- **Delta 边界**：只修改返回入口、引导文案和相关布局，不改变查询结果及自动操作行为。
- **性能边界**：只优化网站背景/粒子动画与相机采集、渲染、识别调度，不移除核心效果。
- **数据边界**：不新增上传，不迁移数据，不改变本地数据所有权。

### 6. 功能需求

- **FR-1 默认语言**：无有效记录时使用中文，并同步正确的页面语言标记。
- **FR-2 Delta 返回**：详情页顶部提供明确、可键盘操作的“返回工具中心”按钮。
- **FR-3 Delta 引导**：引导覆盖启动 Companion、配对、准备游戏、查询、操作期间勿动鼠标键盘及手动上传备用方式；连接完成后可折叠。
- **FR-4 网站性能**：页面隐藏或进入沉浸式工具详情时暂停无用背景循环；恢复页面时正常继续。
- **FR-5 相机性能**：请求设备支持的较高帧率；渲染与识别解耦，负载过高时降低识别频率而不中断画面。

### 7. 交互流程

1. 首次打开网站，默认显示中文；语言切换后保存选择。
2. 进入 Delta，先看到返回按钮及当前连接状态对应的下一步提示。
3. 完成连接后输入昵称或 UID；自动操作期间显示明确提醒；失败时显示手动上传入口。
4. 进入相机后按设备能力启动画面，性能不足时自动降级识别频率。

### 8. 技术方案

- `My`：调整语言回退与 `html lang`；为动画增加可见性和页面模式控制；减少粒子数量、画布像素比和重复样式写入。
- `pp-tools`：为 Delta 增加显式导航回调和状态化折叠引导；读取摄像头能力并设置约束；按画面帧与处理耗时调度识别。
- 先补回归测试，再修改实现；构建 `pp-tools` 后通过现有同步脚本更新 `My`。

### 9. 数据、接口与安全

- 不变更现有接口、配对令牌、Origin 校验、本机通信或玩家数据。
- 语言偏好仍只保存在浏览器本地；相机画面仍只在本地处理。
- 不记录摄像头画面、性能样本或用户查询内容。

### 10. 异常处理与降级

- 语言记录无效时回退中文，不阻断页面加载。
- Delta 未连接时引导用户启动、下载、配对或重试；查询失败时保留手动入口。
- 高帧率约束不受支持时回退到浏览器默认设置；识别过载时降低识别频率，渲染继续运行。
- 页面隐藏时暂停动画和相机处理，恢复可见后安全继续。

### 11. 非功能要求

- **性能**：不设置人为低帧率上限；避免隐藏页面和工具详情中的无效后台循环。
- **可访问性**：返回按钮使用语义化按钮、可聚焦并有清晰标签；引导状态可被辅助技术读取。
- **国际化**：新增界面文案继续支持中文、英文、日文；网站默认值仅改为中文。
- **兼容性**：重点验证 Windows Chrome/Edge、桌面与移动布局；摄像头遵循浏览器安全限制。

### 12. 依赖与假设

- 沿用现有 Companion、站内路由、语言系统、相机模型及嵌入同步脚本。
- 实际帧率取决于显示器、摄像头、浏览器、权限和设备性能。
- 实机相机验证需要可用摄像头和浏览器授权。

### 13. 测试与验证

- 单元测试：语言回退、返回回调、引导状态、相机约束和降级调度。
- 集成检查：`pp-tools` 构建、嵌入同步、`My` 网站检查及生成文件一致性。
- 浏览器验证：首次语言、语言持久化、Delta 导航与引导、页面隐藏/恢复、桌面和移动布局。
- 性能验证：记录优化前后帧间隔、长任务和相机显示帧率；只报告真实测量结果。

### 14. 验收标准

- **AC-1**：清除语言记录后首次访问显示中文；手动切换后刷新仍保留选择。
- **AC-2**：Delta 可一键返回，且引导足以完成连接和查询准备。
- **AC-3**：隐藏页面和沉浸式工具详情不再持续运行无用背景动画。
- **AC-4**：相机优先使用较高可用帧率，负载不足时平稳降级且不崩溃。
- **AC-5**：相关测试、构建、同步检查及桌面/移动真实浏览器验证通过。

### 15. 发布与回滚

- 发布顺序：测试源码、构建 `pp-tools`、同步到 `My`、验证两个仓库差异，再由用户提交和推送。
- 回滚方式：还原源码改动后重新构建并同步；不删除语言偏好、玩家档案或其他用户数据。

### 16. 风险与缓解

- **视觉变化**：使用截图对比，确保原有风格不变。
- **识别延迟或发热**：根据处理耗时自适应节流，不强制逐帧识别。
- **设备差异**：能力检测失败时安全回退，并明确实际帧率不作统一保证。

### 17. 交付物

- 两个仓库的源码与测试改动、更新后的嵌入构建文件、验证结果和提交说明。
- 不包含仓库提交、远程推送、域名部署或 Companion 新版本发布。

### 18. 待确认项

- 本规格通过后进入实施计划；当前无其他阻塞决策。

## English

### 1. Background and Problem

The website defaults to English on first visit. Delta lacks an explicit back action and first-use guidance. Website animation and beauty-camera processing also perform unnecessary per-frame work.

### 2. Goals

- Default first visits to Chinese while preserving an explicit language choice.
- Let first-time users return to the tool center and prepare a Delta lookup through concise guidance.
- Reduce unnecessary background work so animation and camera rendering can use available device refresh rates.

### 3. Non-Goals

- No redesign of the overall website UI, Delta lookup logic, or Companion automation.
- No changes to OCR, profile data, communication protocols, storage schemas, or permission scope.
- No guarantee of fixed 60, 120, or 144 FPS on every device.

### 4. Users and Scenarios

- A new visitor sees Chinese content immediately.
- A Delta user completes launch, pairing, game preparation, and lookup, then returns in one action.
- Desktop and mobile users receive stable, responsive website and camera rendering.

### 5. Scope and Boundaries

- **Repository boundary**: `pp-tools` owns Delta, beauty-camera, and embed source; `My` owns website language, background animation, and embed integration. Generated files under `My/tools/pp-tools` must not be edited directly.
- **Language boundary**: Only a missing or invalid saved language falls back to Chinese. Valid English or Japanese choices remain unchanged.
- **Delta boundary**: Only the back action, guidance copy, and related layout may change. Lookup results and automation behavior remain unchanged.
- **Performance boundary**: Only website background/particle animation and camera capture, rendering, and detection scheduling are optimized. Core effects remain.
- **Data boundary**: No new uploads, data migration, or change in local data ownership.

### 6. Functional Requirements

- **FR-1 Default language**: Use Chinese when no valid preference exists and set the correct document language.
- **FR-2 Delta back action**: Provide an explicit keyboard-accessible “Back to tools” button at the top of the detail page.
- **FR-3 Delta guidance**: Cover Companion launch, pairing, game preparation, lookup, no mouse or keyboard input during automation, and manual-upload fallback; allow collapse after connection.
- **FR-4 Website performance**: Pause unnecessary background loops when hidden or inside an immersive tool detail, then resume safely.
- **FR-5 Camera performance**: Request a higher supported frame rate; decouple rendering from detection and reduce detection frequency under load without interrupting video.

### 7. Interaction Flow

1. A first visit opens in Chinese; changing the language saves the choice.
2. Delta shows a back button and the next action for the current connection state.
3. After connection, the user enters a nickname or UID; automation shows a clear no-input warning; failures retain the manual fallback.
4. The camera starts using device capabilities and automatically lowers detection frequency when needed.

### 8. Technical Approach

- `My`: Update language fallback and `html lang`; control animation by visibility and page mode; reduce particle count, canvas pixel ratio, and repeated style writes.
- `pp-tools`: Add an explicit Delta navigation callback and state-aware collapsible guide; inspect camera capabilities and apply constraints; schedule detection from frame timing and processing cost.
- Add regression tests first, then implement; build `pp-tools` and update `My` through the existing sync script.

### 9. Data, APIs, and Security

- Existing APIs, pairing tokens, Origin validation, local communication, and player data remain unchanged.
- Language preferences remain browser-local, and camera frames remain locally processed.
- Camera frames, performance samples, and lookup content are not recorded.

### 10. Errors and Fallbacks

- Invalid language data falls back to Chinese without blocking page load.
- When Delta is disconnected, guide the user to launch, download, pair, or retry; retain manual upload after lookup failure.
- Unsupported high-frame-rate constraints fall back to browser defaults; overloaded detection slows down while rendering continues.
- Hidden pages pause animation and camera processing, then resume safely when visible.

### 11. Non-Functional Requirements

- **Performance**: No artificial low frame-rate cap and no unnecessary hidden-page or tool-detail loops.
- **Accessibility**: The back action is semantic, focusable, clearly labelled, and guidance state is exposed to assistive technology.
- **Internationalization**: New interface copy supports Chinese, English, and Japanese; only the website default changes to Chinese.
- **Compatibility**: Prioritize Windows Chrome/Edge plus desktop and mobile layouts; camera behavior follows browser security restrictions.

### 12. Dependencies and Assumptions

- Reuse the current Companion, site routing, language system, camera models, and embed sync script.
- Actual frame rate depends on the display, camera, browser, permissions, and device performance.
- Live camera verification requires available hardware and browser permission.

### 13. Testing and Verification

- Unit tests cover language fallback, back callback, guide states, camera constraints, and adaptive scheduling.
- Integration checks cover the `pp-tools` build, embed sync, `My` site checks, and generated-file consistency.
- Browser checks cover first-use language, persistence, Delta navigation and guidance, visibility resume, and desktop/mobile layout.
- Performance checks compare frame intervals, long tasks, and displayed camera FPS before and after; only measured results are reported.

### 14. Acceptance Criteria

- **AC-1**: A visit without saved language data opens in Chinese; manual selection survives reload.
- **AC-2**: Delta returns in one action, and the guide is sufficient for connection and lookup preparation.
- **AC-3**: Hidden pages and immersive tool details no longer run unnecessary background animation.
- **AC-4**: The camera prefers a higher available frame rate and degrades smoothly without crashing.
- **AC-5**: Relevant tests, builds, sync checks, and real-browser desktop/mobile verification pass.

### 15. Release and Rollback

- Release order: test source, build `pp-tools`, sync to `My`, verify both repository diffs, then let the user commit and push.
- Rollback by reverting source changes, rebuilding, and syncing again; do not delete language preferences, player profiles, or other user data.

### 16. Risks and Mitigations

- **Visual change**: Use screenshot comparison to preserve the current visual style.
- **Detection latency or heat**: Adapt throttling to processing time instead of forcing per-frame detection.
- **Device variance**: Fall back safely when capability detection fails and avoid a universal FPS guarantee.

### 17. Deliverables

- Source and test changes in both repositories, refreshed embed build files, verification results, and commit guidance.
- Repository commits, remote pushes, domain deployment, and a new Companion release are excluded.

### 18. Open Items

- Implementation planning starts after this specification is approved; no other blocking decisions remain.
