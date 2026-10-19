import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateSyncSettings } from "./SyncSettingsStore";
import type { UnlockedSync } from "./SyncContext";
import { cancelDebounce, canAutoUpload, rt } from "./SyncRuntime";
import { scheduleUpload, uploadPendingChanges } from "./SyncTransport";

/**
 * 「预览待确认期间零 PUT」的**接线**测试。
 *
 * 纯函数 shouldUpload 已有单测，但那只证明判定本身正确；真正会漏的是接线：
 * canAutoUpload 把 rt.pendingEnable 映射成 previewPending 时写反，或某个上传入口
 * 绕过这道门。这里直接构造「已启用 + 已解锁 + 有待确认预览」这个生产路径难以到达
 * 的组合，验证门确实拦在 scheduleUpload / uploadPendingChanges 上。
 *
 * 该状态经公开 API 不可达（previewEnable 不写 unlocked、commitEnable 先清 pending
 * 再置 enabled），所以只能直接摆 rt 的字段——这正是这条用例存在的意义：等将来
 * 顺序调整让状态可达时，接线已经有测试盯着。
 */
const UID = "6e3f0a1b2c4d5";

/** 任何一次真正走到传输层的尝试都会先调 client.get；用它当「门是否放行」的探针 */
const client = {
  get: vi.fn(async () => {
    throw new Error("gate opened");
  }),
  put: vi.fn(),
  removeCloud: vi.fn(),
};

function unlockedCtx(): UnlockedSync {
  return {
    uid: UID,
    deviceId: "0123456789abcdef",
    salt: "salt",
    iterations: 1,
    wrapped: {} as UnlockedSync["wrapped"],
    dek: {} as UnlockedSync["dek"],
    client: client as unknown as UnlockedSync["client"],
  };
}

describe("预览待确认：上传门的真实接线", () => {
  const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));

  beforeEach(() => {
    localStorage.clear();
    (globalThis as any).window.uid = UID;
    updateSyncSettings({ enabled: true, salt: "salt" });
    rt.busy = false;
    rt.pendingAfterBusy = false;
    rt.unlocked = unlockedCtx();
    rt.pendingEnable = {
      ctx: unlockedCtx(),
      prefetched: { kind: "empty" },
      stats: { cloud: 0, local: 0, merged: 0 },
    };
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockClear();
    client.get.mockClear();
  });

  afterEach(() => {
    cancelDebounce();
    rt.unlocked = null;
    rt.pendingEnable = null;
    rt.busy = false;
    rt.pendingAfterBusy = false;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("已启用 + 已解锁 + 预览待确认 → 不排定时器，也不发任何请求", async () => {
    vi.useFakeTimers();
    expect(canAutoUpload()).toBe(false);

    scheduleUpload();
    // 预览期间连定时器都不排：排了就等于把未确认的合并结果放进队列
    expect(vi.getTimerCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(6000);
    await uploadPendingChanges();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(client.get).not.toHaveBeenCalled();
  });

  it("只把 previewPending 去掉就放行（证明拦的是这道接线，而不是别的条件）", () => {
    vi.useFakeTimers();
    rt.pendingEnable = null;

    expect(canAutoUpload()).toBe(true);
    scheduleUpload();
    expect(vi.getTimerCount()).toBe(1);
  });

  it("预览期间直接调用上传入口同样被拦下", async () => {
    await uploadPendingChanges();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(client.get).not.toHaveBeenCalled();
  });
});
