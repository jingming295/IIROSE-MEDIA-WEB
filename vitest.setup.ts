// 测试环境垫片：jsdom 不提供 IndexedDB 与 crypto.subtle，两者都由这里补齐。
import "fake-indexeddb/auto";
import { webcrypto } from "node:crypto";

if (!(globalThis as any).crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

// 宿站插件运行在登录态下，`window.uid` 是我们读取账号归属的唯一入口。
// 各用例按需改写它；这里给一个默认值，避免 undefined 让归属逻辑走成游客分支。
(globalThis as any).window.uid = "6e3f0a1b2c4d5";
