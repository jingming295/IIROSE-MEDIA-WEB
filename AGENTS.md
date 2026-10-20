<!-- bmad:context -->
<!-- Verified 2026-10-12 against fe3e381. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

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
- 样式统一 Tailwind v4 任意值类（如 `max-[768px]:hidden`、`[grid-auto-rows:max-content]`）；移动端响应式断点统一使用 `max-[768px]`；点歌卡片网格行必须保持 `max-content` 自适应，否则按钮会被 `overflow:hidden` 裁掉（曾出过此 bug）。
- 图标一律自包含方案：元素加 id + `src/app.css` 写 `#id::before { content:"\F0xxx"; font-family:"md" }`；**不要借用宿站 `mdi-*` 类**（宿站样式表里未必有该类规则，且没有 `font-family:"md"` 兜底会渲染成无字形——关于图标曾因此消失）。
- 顶栏布局与触控目标约定：
  - Row 1（主导航项）：移动端高 44px（`min-h-[44px]`），按钮 44×44px 紧密相连无 gap，纯图标 24px（符合 Apple HIG 44pt 规范）；
  - Row 2（操作与分页）：移动端高 48px（`min-h-[48px]`），上一页/下一页按钮放大为 48×44px 触控药丸（`rounded-lg`，双钮占宽 25.6%，箭头 22px），视图切换与搜索按钮为 44×44px，搜索框靠右紧邻分页（由左侧视图切换按钮 `mr-auto` 撑满空隙，禁止父级 `justify-between` 导致居中）；
  - Row 3（选平台组件）：移动端高 40px（`h-10`），保持紧凑相连的长方形选项卡形态（无 gap），图标 26px，文字 13px，禁止切为带间隙的圆形胶囊；
  - Row 4（子分类标签）：移动端高 36px（`h-[36px]`），内边距 `px-3.5`，文字 12px 防误触。

## Known pitfalls

- `vite.config.ts` 的库入口写的是 `src/main.js`，实际文件是 `src/main.ts`（构建能正常解析）；重命名入口时两处要一起改。
- 网易云新增/修改端点必须走 `SendFetch.neteaseRequest`（节点切换、5s 超时、失败提示的唯一入口）；照 B 站写法自己拼 `${this.cors}` 会叠成双层代理前缀，并把失败退化成静默空列表。风控码（`-462/-460/460`）、HTTP 433 与超时各自归类，重试过程静默、全节点失败才提示一次；批量端点（逐曲歌词）失败按同因 10 秒窗口去重，否则一次点播会刷出上百条提示。
- 首次注入会弹插件自己的用户协议（宿站 `#syncAlertHolder`），挡住一切交互——先点它的「确定」。
- 宿站输入框（`#syncPromptHolder` 等）是 jQuery 体系：合成 DOM 事件无效，自动化必须用真实键盘事件（Playwright `type()`/`press()`）。
- GD Studio API（music-api.gdstudio.xyz）按 IP 限流：连续几次 `types=url` 请求即触发、恢复窗口 >10 分钟，且限流时返回 **HTTP 200 + `{"url":"","br":-1}`**——判失败必须检查 `data.url` 是否为空，不能只看 HTTP 状态码。
- 宿站弹窗关闭后残留全屏遮罩（`#syncHolderOutside` 不自清理、`#syncHolder` 常显），会拦截真实鼠标点击——自动化点击页内元素前先移除/隐藏它们。
- 宿站 `messages.html` iframe 存在 1.13~1.19 倍视口缩放：物理宽度 390px 对应 iframe 465px，412px+ 对应 470px~512px；移动端响应式断点必须使用 `max-[768px]`，禁止单一依赖 `max-[490px]`（否则大屏手机会回退桌面布局并导致文字折行）。
- 宿站 `buildSelect2` 多弹窗流转与 fadeOut 冲突：选项/多选确定点击后，宿站**先同步执行业务回调，紧随其后立即触发 `fadeOut(speed250, () => selectHolderBox.empty())`**！若在回调内同步唤起下一个 `buildSelect2`（如选集后打开正序/乱序确认框），刚生成的新弹窗会被宿站后续的 `fadeOut` 瞬间清空销毁。**跨弹窗流转必须包裹在 `setTimeout(() => { ... }, 300)` 中**，待前置 250ms 淡出动画完全结束且 DOM 清空后再行淡入。
- 宿站 `buildSelect2` 多选无序收集与顺序选择扩展：宿站原生多选点击确定时，遍历已缓存的 jQuery 集合 `m`（索引 `0` 到 `u-1`），**会彻底丢失用户的点击先后次序**。实现「按点选顺序（12345）播放」必须在微任务中接管选项与确定按钮的 `onclick`，用响应式队列动态追踪点击时间线并渲染序号徽章；同时确定按钮按使用习惯保留在列表最下方原生末端；在业务层（如网易云批量详情接口及 B 站分 P 数组）必须依此有序数组二次重排，防止接口返回的乱序覆盖用户的选取顺序。
- 输入框 `@` 链接拦截防泄露：拦截必须在 `moveinputDo` 最前端**同步清空输入框并中断原生发送**，再进入异步 URL 重定向与直链嗅探；不可在异步期间保留输入内容，否则用户连按回车或异常放行会导致链接以私聊或公聊文字误发。
- 混合内容安全与封面 HTTPS 升级：宿站运行在 HTTPS 上下文，第三方 API（如网易云）返回的封面常为 `http://` 形式，会触发浏览器 Mixed Content 拦截导致图片破损；渲染封面必须先做 `src.replace(/^http:\/\//, 'https://')` 安全升级，并挂载 `onerror` 平滑回退到自包含矢量图标。

<!-- /bmad:context -->


## BMAD 流程约定

- **defer 一项能力必须同轮改契约**：把某条能力推迟、降级或标为非目标时，必须在同一轮内同步改写 `_bmad-output/specs/**` 下的 SPEC 与 companion（例如 `sync-protocol.md`），写清「未实现 / 非目标 / 计划轮次」。只在代码或 deferred-work 里记一句，会让下一轮复盘把「文档已承诺、代码未实现」重新判成缺陷（见 `spec-favorites-cloud-sync` 第 2 轮复盘 R2-2/R2-8）。
