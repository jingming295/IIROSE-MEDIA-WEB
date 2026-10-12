# 输入框 @ 媒体点播与选集交互系统架构设计 (design.md)

## 1. 概述与设计背景

在蔷薇花园（iirose.com）聊天室中，用户常通过输入框发送媒体链接以触发媒体点播。然而原生点播存在以下痛点：
1. **输入泄露与误发送**：在输入框内输入 `@` 媒体链接后按回车，若未被及时拦截，容易作为普通聊天消息误发或在私聊中泄露链接。
2. **多集/歌单交互缺失**：面对网易云歌单/专辑及 B 站多分 P 视频，原有逻辑要么只播放单曲，要么缺乏直观的选集管理。
3. **选集长列表体验差**：当歌单或分 P 数量庞大时（如 50~100 首曲目），原生多选弹窗将「确定」按钮置于列表最底部，用户必须滑动到底端才能完成点播；且曲目仅展示纯文字或默认图标，辨识度低。
4. **弹窗流转闪退**：选集多选点击「确定」后，无法顺利弹出「正序播放 / 乱序播放」的二次选择框。

本设计旨在打造一个**零侵入、防泄露、强交互、平滑流转**的媒体输入拦截与选集点播体系。

---

## 2. 总体架构与数据流转

```mermaid
flowchart TD
    Input[用户在输入框键入 @链接 或回车] --> CheckProxy{插件设置是否启用代理蔷薇@输入}
    CheckProxy -- 否 --> Passthrough[放行至宿站原生逻辑]
    CheckProxy -- 是 --> Intercept[Input-Behavior-Module: 拦截回车并清空输入框]

    Intercept --> Extract[UrlExtractor: 提取 URL 并解析短链重定向]
    Extract --> Route{平台路由判别}

    Route -- 网易云单曲 --> NetEaseMOD[NetEasePlatform: MOD 单曲播放]
    Route -- 网易云歌单/专辑 --> NetEaseSelect[弹出 正序/乱序/选集 选择器]
    Route -- B站视频 ?p=N --> BiliDirect[BilibiliPlatform: 直达播放目标分 P]
    Route -- B站视频多分P --> BiliSelect[弹出 正序/乱序/选集 选择器]
    Route -- 直链嗅探 --> DirectProbe[8 秒超时嗅探: 音频/视频/非媒体]

    DirectProbe -- 超时 --> ShowTimeout[提示探测超时]
    DirectProbe -- 是媒体 --> DirectPlay[构造 MediaCard 发送媒体包]
    DirectProbe -- 非媒体 --> NativePass[回填并放行至原生聊天]

    NetEaseSelect -- 选集 --> MultiSelectUI[选集多选列表: 封面展示 + 12345 顺序序号徽章 + 确定吸底]
    BiliSelect -- 选集 --> MultiSelectUI

    MultiSelectUI -- 点击确定 --> Delay300ms[延迟 300ms 规避宿站 fadeOut]
    Delay300ms --> OrderConfirm[弹出 正序播放 / 乱序播放 确认框]
    OrderConfirm -- 正序播放 --> SendOrderPlay[按用户选取的 12345 顺序分发播放]
    OrderConfirm -- 乱序播放 --> SendShufflePlay[打乱选取结果后分发播放]
```

---

## 3. 核心子系统与关键设计

### 3.1 输入行为劫持与防泄露 (`Input-Behavior-Module.ts`)
- **生命周期挂载**：在插件加载时劫持宿站 `window.Utils.service.moveinputDo`，备份原生函数至 `window.Utils.IMW.backup.moveinputDo`。
- **即时响应与保护**：
  - 监听回车键与发送行为，提取输入框内容。
  - 若以 `@` 开头且携带 HTTP/HTTPS 链接，且设置中开启了代理输入，**同步清空输入框**，阻断向当前房间或私聊频道的原生文本广播。
  - 将提取的链接交付 `InputPlatformAnalysis` 异步管线处理。

### 3.2 链接提取与直链嗅探管线 (`UrlExtractor.ts` & `InputPlatformAnalysis.ts`)
- **短链重定向穿透**：针对 `b23.tv`、`163cn.tv` 等短链接，通过轻量级 HEAD 请求解析 `location` / `x-final-url` 获取目标落地 URL。
- **单 P 直达识别**：解析 URL 查询参数中的 `?p=N`，命中后跳过选集，直接点播指定分 P。
- **直链媒体探测与超时熔断**：
  - 对非平台链接发起 8 秒超时（`AbortController`）的 HEAD 嗅探；
  - 检查 `Content-Type`（`audio/*`, `video/*`）与直链扩展名（`.mp3`, `.flv`, `.mp4` 等）；
  - 超时则弹出「直链媒体探测超时」用户提示；非媒体链接平滑回填输入框并放行至宿站原生逻辑。

### 3.3 选集弹窗顺序多选与序号徽章体系 (`IIROSEUtils.ts`)
- **设计目标**：
  - 用户多选时，直观展示点击次序（1, 2, 3, 4, 5...）；
  - 取消某项勾选时，剩余项序号自动平滑重排；
  - 确定按钮按用户诉求置于列表最下方，符合从上往下选、选完在末尾确认的直觉；
  - 正序播放严格按照用户选取的 1, 2, 3... 序号顺序逐一下发。
- **动态次序管理 (`selectedQueue`)**：
  - 维护一个响应式选中队列 `selectedQueue: number[]`，记录用户点击选项的先后索引；
  - 点击未选中项：追加到队列末尾，分配最新序号；
  - 再次点击已选项：从队列中移除，其余项自动重新计算 `selectedQueue.indexOf(idx) + 1`，序号无缝前移，始终保持连贯的 1, 2, 3...；
- **视觉呈现**：
  - 选中项整行添加浅蓝背景高亮 `rgba(30, 136, 229, 0.12)`；
  - 右侧原本的复选框槽位替换为直径 28px 的高清晰度 Material 蓝色圆形徽章（`#1e88e5`，白色加粗数字，居中微投影），移动端与桌面端均具备极高辨识度；
  - 未选中项恢复为原生空心复选框 `mdi-checkbox-blank-outline`，清除行高亮；
- **确定按钮吸底固定与有序回调**：
  - **位置策略**：确定按钮保持在列表最下方（原生 DOM 末端），打开列表时自动 `scrollTop = 0` 保证从第一项开始自上而下呈现；
  - **吸底固定原理（Sticky Bottom）**：
    - 针对最末项挂载 `position: sticky; bottom: 0; z-index: 10`；
    - 在包含块高度超出弹窗视口时，根据 CSS Sticky 规范，末项会自动悬停吸附在视口底端，避免用户长距离滑动；
    - 配合 `backdrop-filter: blur(10px)` 与继承面板背景色，杜绝透视重叠；辅以 `border-top: 1px solid rgba(128, 128, 128, 0.25)` 实现悬浮态与曲目滚动区的清爽分隔；
    - 当滚动到达最末项时，按钮无缝平滑停靠在最后一项正下方，绝不遮挡末尾曲目；
  - **有序结果收集**：
    - 确定按钮接管点击事件，依据 `selectedQueue` 的时间线次序提取并映射选中的数据 ID：`const orderedResult = selectedQueue.map(idx => a[idx][0])`；
    - 回调交付的数组即为严格按照用户选取先后排列的集合。
- **业务层播放顺序保证**：
  - **网易云**：在 `finalODSONG` 中针对 NetEase 批量详情 API 不保序的问题，通过 `Map` 按照 `songsID`（即选取顺序）二次排序，确保正序播放严格按用户选取的 1, 2, 3 顺序下发；
  - **B站**：在 `VOD` 中通过 `checkedPages.map(pageNo => pages.find(...))` 保持分 P 有序集合，正序播放直接依序执行。

### 3.4 弹窗流转防闪退机制 (`NetEasePlatform.ts` & `BilibiliPlatform.ts`)
- **冲突根因**：
  - 宿站点击选择器项时，执行逻辑为：
    ```javascript
    s && s(o, i); // 1. 先同步执行业务回调
    Probe.keepSelectOpen || (d.This.stop().fadeOut(speed250, function() {
        d.selectHolderBox.empty(); // 2. 动画结束后清空容器
    }));
    ```
  - 若在回调 `s` 内**同步**调用下一个 `buildSelect2`，刚 `fadeIn` 的新弹窗会立即被紧随其后的 `fadeOut(250)` 与 `empty()` 销毁。
- **流转时序设计**：
  - 凡是二级选择框（选集多选确定后的「正序播放 / 乱序播放」确认框），均包裹在 `setTimeout(() => { ... }, 300)` 中。
  - 确保前置弹窗的 250ms 淡出动画完全结束、容器完成 `empty()` 清空后，再无缝淡入二级确认弹窗。
  - B 站三选一主弹窗点击「选集点播」时，同样附加 300ms 延时保护。

### 3.5 选集封面高清渲染与自适应降级 (`IIROSEUtils.generatePicHtml`)
- **视觉规格**：
  - 容器尺寸：76×76px（居中位于宿站 100×100px 图标槽内，留白 12px）。
  - 圆角：`border-radius: 8px !important`。
  - 适配：`object-fit: cover`。
  - 背景：微灰暗底 `rgba(0, 0, 0, 0.2)`。
- **安全与降级规范**：
  - **HTTPS 强制升级**：为避免 HTTPS 站点加载 HTTP 资源触发 Mixed Content 拦截，封面地址统一执行 `src.replace(/^http:\/\//, 'https://')`。
  - **优雅降级**：图片元素附加 `onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='block';"`，在网络失败或地址失效时自动平滑展示居中的矢量音符/视频图标。

---

## 4. 平台适配详情

| 平台 | 触发场景 | 封面提取来源 | 多选确认后流转 |
| :--- | :--- | :--- | :--- |
| **网易云歌单** | 输入歌单 URL 或卡片点击播放 | 单曲 `al.picUrl` > 歌单 `coverImgUrl` | 1首直接播；多首弹正序/乱序确认框 |
| **网易云专辑** | 输入专辑 URL 或卡片点击播放 | 专辑 `album.picUrl` > 单曲 `al.picUrl` | 1首直接播；多首弹正序/乱序确认框 |
| **B站多 P 视频** | 输入多分 P BV 链接或卡片点击播放 | 分 P `first_frame` > 视频主封面 `pic` | 1集直接播；多集弹正序/乱序确认框 |
| **B站单 P 链接** | 输入带 `?p=N` 链接 | 分 P 对应封面 | 跳过选集，直接播放对应分 P |
| **直链媒体** | 输入直链音频/视频 URL | 插件默认封面（直链播放） | 嗅探成功直接下发媒体卡片 |

---

## 5. 验证标准

1. 输入框键入网易云歌单链接并按回车：输入框立即清空，不触发任何公屏或私聊文字发送。
2. 弹出选项后点击「选集播放」：进入多选列表，每首曲目左侧清晰展示对应专辑/分 P 封面，加载失败时显示图标兜底。
3. 进入选集列表后，每点选一项目右侧动态呈现 1, 2, 3, 4, 5... 顺序序号徽章与行高亮；取消勾选时后续序号自动重排；「确定」按钮在最下方吸底固定悬浮（长列表时浮于弹窗底部随时可点，滚到底部平滑停靠，短列表自然排在末尾）。
4. 勾选多首曲目并点击「确定」后：前一弹窗平滑淡出，随后顺畅弹出「正序播放 / 乱序播放」选择框；选择「正序播放」时严格按照用户选取的 1 -> 2 -> 3 顺序播放，选择「乱序播放」时随机打乱后播放。
