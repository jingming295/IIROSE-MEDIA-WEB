# 电台点播「重载后无声」真机排查报告

- 日期：2026-10-19
- 环境：Ubuntu 24.04 + Playwright Chromium；iirose.com 真实站点；账号「铭铭280」；房间「时光小苑」
- 被测构建：`npm run build` 产物 `dist/bundle.js`（282.81 kB），按 skill `iirose-plugin-verify` 注入 `messages.html`
- 涉及代码：`src/platforms/RadioPlatform.ts`、`src/iirose_func/Socket/Media/index.ts`、`src/settings/radioSettings/RadioSettings.ts`

## 1. 结论

**主因在宿站（iirose）的「媒体恢复」逻辑，不在电台服务端。插件放大了问题。**

宿站玩家插件发出的媒体卡属于普通点播媒体，重进房间/重载页面时宿站会走 `shareMedia()` 恢复：

1. 恢复时**不会自动 `play()`**（除非用户先产生一次交互）；
2. 拿到 `canplay` 后立刻执行 `this.currentTime = 已经过去的秒数`（实测栈来自 `messages.html` 内联 `objTmp.oncanplay`）。

直播流（listen.moe / vocaloid.radioca.st）是**不可 seek** 的连续流。对一个刚建立、时间轴从 0 开始的直播流 seek 到「已过去 N 秒」，浏览器只能从 0 开始把这条流"快进"消费到 N 秒，期间无声。N 就是电台已经播了多久。

实测数据完全吻合：

| 现象                        | 数据                                                                         |
| --------------------------- | ---------------------------------------------------------------------------- |
| 重载后 seek 目标            | 553 s（电台已播 553 s）                                                      |
| seek 后元素状态             | `readyState` 4 → 1，`networkState` 2，无 `canplay`                           |
| 恢复播放的 `play()` 调用    | 无（重载后 90 s 内日志为空）                                                 |
| 用户交互后宿站补发 `play()` | 有（3 次），但**首个可播数据在 550 s 后**才到 —— 与 seek 目标 553 s 线性吻合 |
| 结论                        | 静音时长 ≈ 电台已播放时长；收音机开得越久，重载后静音越久                    |

因此用户描述的「刚开始点正常，重载/重新加入就没声音，有时候听不到」是必然行为，不是偶发网络抖动。

## 2. 复现步骤（可重复）

1. 登录 → 进任意音乐房（本次：时光小苑）。
2. 注入 `dist/bundle.js`，Alt+S 打开面板 → 音乐 → 无线电广播 → 点 Listen.moe「播放」。
3. 确认正常：`#shareMediaObjAudio.src = https://listen.moe/stream?format=mp3&ext=.mp3`，`paused=false`，`currentTime` 递增。
4. 刷新页面（宿站自动恢复房间）或退出重进。
5. 观察：媒体卡和计时条（如 `9:13 / 12:00:00`）都在，但**没有任何声音**；`#shareMediaObjAudio.paused === true`，`readyState === 1`。

## 3. 关键证据

### 3.1 宿站恢复路径的 `currentTime` 赋值（决定性）

在页面加载前注入 `currentTime` setter 埋点，重载后捕获：

```
set-ct  id=shareMediaObjAudio  val=553
stack: at HTMLAudioElement.set [as currentTime]
       at objTmp.oncanplay (eval at <anonymous> (https://iirose.com/messages.html:1:1))
```

事件序列（重载后）：

```
suspend      ct=0    rs=1 ns=1
loadedmetadata ct=0  rs=1
canplay      ct=0    rs=4
set-ct       ct=553  rs=4     ← 宿站在 canplay 里 seek 到「已过去 553 秒」
suspend      ct=553  rs=1 ns=1 ← 缓冲被清空，之后再无 canplay
```

同一份 90 秒观察窗口内 `HTMLMediaElement.prototype.play` **零次调用**。

### 3.2 用户交互后的「假播放」

用户在页面内点一下（产生 user activation）后，宿站补发 `play()`：

```
play-call shareMediaObjAudio act=true
… gap …
canplay ct=553 rs=3   (550 s 之后)
playing ct=553.8
```

即：`paused=false`、进度条在动，但 550 秒内**没有任何可播放数据**——正是"看着在播、就是没声"。

### 3.3 直接对流做 seek 的对照实验（绕开宿站）

新建裸 `Audio()`，先播放，再执行 `currentTime = 120`（等价宿站行为）：

**listen.moe**

```
loadedmetadata dt=238ms  ct=0
canplay        dt=243ms  rs=4   ← 不 seek 时 0.24 s 即可播
playing        dt=243ms
currentTime=120 →
seeking  ct=120  rs=1
waiting  ct=120  rs=1   ← 10 s 内再未恢复
```

**vocaloid.radioca.st**

```
loadedmetadata dt=5733ms ct=0
canplay        dt=5737ms rs=3
playing        dt=5737ms
currentTime=120 →
seeking  dt=6023ms ct=120 rs=1
waiting  dt=6023ms ct=120 rs=1   ← 之后 30+ 次 progress，仍未 canplay
```

结论：两个电台「不 seek 都能播」，**一旦 seek 就死**。这排除了「电台服务端不稳定」「插件 URL 写错」这两类猜测。

### 3.4 流本身的状态（curl 实测）

```
GET https://listen.moe/stream?format=mp3&ext=.mp3
HTTP/2 200
content-type: audio/ogg        ← 不是 mp3，format=mp3 参数被忽略
icy-br: 192                    ← 不是 320
server: cloudflare
（无 Accept-Ranges）

GET https://vocaloid.radioca.st/stream?format=mp3&ext=.mp3
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Transfer-Encoding: chunked
icy-br: 320
Access-Control-Allow-Origin: *
（无 Accept-Ranges）
```

两条流都是「无长度、不可 Range」的直播流 → 浏览器无法真正 seek。

## 4. 责任划分

| 项                                                            | 判定                                   |
| ------------------------------------------------------------- | -------------------------------------- |
| 宿站恢复时对直播流 seek 到 elapsed                            | 宿站缺陷（触发点）                     |
| 宿站恢复时不自动 `play()`，需用户交互                         | 宿站行为（次因，会造成「第二次静音」） |
| 插件把直播流按普通点播曲目上报（`=0` 类型、`duration=43200`） | 插件设计选择，放大了宿站缺陷           |
| 插件无「恢复后自检/重连」                                     | 插件缺失的兜底                         |
| 电台服务端                                                    | 正常（两者不 seek 均可播放）           |

宿主播放器是 `#shareMediaObjAudio`（`#resourceHolder` 内，`display:none` + `autoplay`），**不是** `#radioPlayer`；`#radioPlayer` 是宿站自家电台功能用的，本插件不经过它。

## 5. 次要发现（同一次真机测试中暴露）

1. **电台时长把后续点歌堵住**：电台 `duration=43200`（12 小时）。实测在电台播放中，连续发送「网易云歌曲」「Vocaloid 电台」媒体卡（`m__4`/`&1` 均已在控制台确认发出、聊天区也出现了卡片），宿站 `shareMedia()` **一次都没被调用**，播放器仍停在 Listen.moe。高度怀疑宿站按「当前媒体剩余时长」做排队/接管判定，12 小时剩余 = 后续点歌全部排队。
2. **码率/格式上报失真**：`bitRate: 320`，实际 listen.moe 为 192 kbps Ogg；`format=mp3` 参数无效。宿站卡片显示 320K 与事实不符。
3. **不同网络下 vocaloid 首播 5.7 s 才到 `canplay`**（listen.moe 0.24 s），本身也会造成"点了没立刻响"的观感。

## 6. 建议（按性价比排序）

**A. 插件侧自愈（不改宿站，收益最大）**

插件加载后（或用户首次交互后）检测「当前房间正在播的是本插件电台」：

```ts
const a = document.getElementById(
  "shareMediaObjAudio",
) as HTMLAudioElement | null;
const isOurRadio =
  a && RadioPlatform.radiourl.some((r) => a.src.startsWith(r.url));
if (isOurRadio && a.paused && a.currentTime > 5) {
  a.currentTime = 0; // 关键：放弃 seek 到 elapsed，回到直播头
  a.play().catch(() => {}); // 需要用户手势；失败则静默等待下一次交互
}
```

要点：**先归零再播放**。只 `play()` 不归零仍会卡在上面的 550 s 缓冲里。绑定到首次 `pointerdown`/`click`（一次性）最稳，避免自动播放策略拒绝。

**B. 提供显式「重连电台」按钮/提示**

恢复失败时在插件 UI 给出「电台已断开，点击重连」，重连即重发一次点播（用户可接受刷一条卡片）。比让用户猜"为什么没声"好。

**C. 修正时长语义**

- 默认 `duration` 从 12 小时降到合理值（例如 60 分钟），减少 B 类"堵队列"副作用；
- 或提供「电台模式：播完即止/一直播」开关，向宿站上报较小 duration，本地自行续播。

**D. 修正元数据**

- listen.moe 使用其真实 Opus 端点，`bitRate` 上报 192；
- 或保留 mp3 参数但在文案中不宣称 320K。

**不建议**：直接改宿站 `objTmp.oncanplay` / `shareMedia`（宿站随时更新，补丁会碎；且属于篡改第三方站点行为）。

## 7. 尚未闭环的点

- 「电台播放中后续点歌不接管」只在本次房间（时光小苑）复现 3 次，未在未启用队列的房间交叉验证，需要再测一间确认是房间设置还是全局行为。
- Vocaloid 重载后的端到端复现因宿站拒绝切换媒体（见上）未单独完成，但 3.3 的裸流对照实验已覆盖同一机制。

## 8. 附录：埋点脚本要点

```js
// 在页面脚本执行前注入（Playwright addInitScript 或直接在 iframe 内早期执行）
const d = Object.getOwnPropertyDescriptor(
  HTMLMediaElement.prototype,
  "currentTime",
);
Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
  get: d.get,
  set(v) {
    log({ ev: "set-ct", id: this.id, val: v, stack: new Error().stack });
    return d.set.call(this, v);
  },
  configurable: true,
});
// 同时包裹 play/load/pause，并监听 canplay/seeking/waiting/stalled/playing
```
