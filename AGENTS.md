<!-- bmad:context -->
<!-- Verified 2026-10-09 against 46bcd89. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## IIROSE-MEDIA-WEB

注入 https://iirose.com/（蔷薇花园）聊天站的媒体点播插件。Preact + TypeScript + Vite 库模式，产出单文件 UMD `dist/bundle.js`（CSS 由 JS 注入）。无测试、无 lint，`npm run build` 即全部自动验证。

## Policy

- 包管理只用 npm（`package-lock.json` 为准）；`yarn.lock` 已废弃，不要更新它。
- 提交直接进 main，不开分支。
- 运行时验证需要 iirose.com 测试账号：凭据存放于本机 `.secrets/`（已 git-ignore，绝不入库）；该目录不存在时向维护者索取。凭据绝不写进代码、文档或提交。

## Where things are

- 入口：`src/main.ts`，**运行在 `messages.html` iframe 上下文**（`#mainContainer` 在 iframe 内，顶层文档只有 `#mainFrame`）；油猴调试 `@match https://iirose.com/messages.html` + `@require file://` 指向本地 `dist/bundle.js`。
- 运行时验证流程已固化为本机 skill：`.opencode/skills/iirose-plugin-verify/`（agent 工具链不入库；登录、进房、注入、验证的完整步骤）。
- UI：`src/page/`（Preact 组件树）。
- 新增音乐平台需同步三处：`src/platforms/`（平台类）、`src/Api/`（API 客户端）、`src/settings/`（平台设置），类型放 `src/types/`。
- 宿站交互（WebSocket 媒体、消息）：`src/iirose_func/`。
- 出网请求走 `src/environment/Environment.ts` 选定的阿里云 CORS 代理（ipinfo.io 判 CN/Global）；改 API 层时注意 fetch 是否需要过代理。
- `src/app.css` 只放 Tailwind 无法表达的东西：@keyframes、mdi 图标 `::before` content（反斜杠不能进 class 名）、JS 切换的状态类（`ShowIIROSE_MEDIA_CONTAINER`）、宿站元素选择器、通配过渡；其余样式一律写进组件的 Tailwind 类，**不要新增 SCSS**。

## Running and verifying

- `npm run dev` 是 `vite build --watch`，不是开发服务器——本插件没有可独立运行的应用。
- 运行时验证流程：构建 → 浏览器打开 iirose.com 加载 bundle → 每次改完刷新页面检查；桌面 alt+S、移动端双指下滑呼出 UI。
- 调试在热推列表随机选房间；部分房间不支持艾特音乐，这是房间差异不是插件 bug。

## Conventions that differ from defaults

- `react`/`react-dom` 由 tsconfig paths 映射到 `preact/compat`——直接 import 'react' 即可，不要安装真正的 react 包。
- 样式统一 Tailwind v4 任意值类（如 `max-[490px]:hidden`、`[grid-auto-rows:max-content]`）；点歌卡片网格行必须保持 `max-content` 自适应，否则按钮会被 `overflow:hidden` 裁掉（曾出过此 bug）。

## Known pitfalls

- `vite.config.ts` 的库入口写的是 `src/main.js`，实际文件是 `src/main.ts`（构建能正常解析）；重命名入口时两处要一起改。
- 首次注入会弹插件自己的用户协议（宿站 `#syncAlertHolder`），挡住一切交互——先点它的「确定」。
- 宿站输入框（`#syncPromptHolder` 等）是 jQuery 体系：合成 DOM 事件无效，自动化必须用真实键盘事件（Playwright `type()`/`press()`）。
- GD Studio API（music-api.gdstudio.xyz）按 IP 限流：连续几次 `types=url` 请求即触发、恢复窗口 >10 分钟，且限流时返回 **HTTP 200 + `{"url":"","br":-1}`**——判失败必须检查 `data.url` 是否为空，不能只看 HTTP 状态码。
- 宿站弹窗关闭后残留全屏遮罩（`#syncHolderOutside` 不自清理、`#syncHolder` 常显），会拦截真实鼠标点击——自动化点击页内元素前先移除/隐藏它们。

<!-- /bmad:context -->
