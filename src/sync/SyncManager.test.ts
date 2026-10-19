import { describe, expect, it } from "vitest";
import {
  chooseEnableStep,
  formatMergeStats,
  shouldAutoPull,
  shouldUpload,
} from "./SyncGate";
import {
  getSyncStatus,
  notifySyncState,
  onSyncStateChange,
  recordSyncResult,
  setBusy,
} from "./SyncRuntime";

/**
 * 自动拉取的判定是纯函数，这里单独覆盖——它决定「B 设备到底会不会自己更新」，
 * 一旦回归就会退回「页面开着永远不同步」的老问题。
 */
const base = {
  enabled: true,
  hasContext: true,
  busy: false,
  lastPullAt: 0,
  now: 10 * 60_000,
};

describe("shouldAutoPull", () => {
  it("已启用、已解锁、空闲且过了冷却 → 拉", () => {
    expect(shouldAutoPull(base)).toBe(true);
  });

  it("未启用 / 未解锁 / 正在跑，任一成立都不拉", () => {
    expect(shouldAutoPull({ ...base, enabled: false })).toBe(false);
    expect(shouldAutoPull({ ...base, hasContext: false })).toBe(false);
    expect(shouldAutoPull({ ...base, busy: true })).toBe(false);
  });

  it("冷却窗口内不拉，到点即拉", () => {
    const lastPullAt = 1_000_000;
    const cooldown = 60_000;
    expect(
      shouldAutoPull({ ...base, lastPullAt, now: lastPullAt + cooldown - 1 }),
    ).toBe(false);
    expect(
      shouldAutoPull({ ...base, lastPullAt, now: lastPullAt + cooldown }),
    ).toBe(true);
  });

  it("冷却时长可覆盖", () => {
    const lastPullAt = 1_000_000;
    expect(
      shouldAutoPull({
        ...base,
        lastPullAt,
        now: lastPullAt + 30_000,
        cooldownMs: 10_000,
      }),
    ).toBe(true);
  });
});

/**
 * 「首次启用预览待确认期间零 PUT」的唯一门就是 shouldUpload：
 * 它必须是「预览中」压过「已启用」，否则确认框停留几秒就会把未经确认的合并结果写上去。
 */
describe("shouldUpload（防抖上传门）", () => {
  const gate = { enabled: true, hasContext: true, previewPending: false };

  it("已启用、已解锁、无待确认预览 → 放行", () => {
    expect(shouldUpload(gate)).toBe(true);
  });

  it("预览待确认 → 一律不放行（即使 enabled 已被误置真）", () => {
    expect(shouldUpload({ ...gate, previewPending: true })).toBe(false);
  });

  it("未启用或未解锁 → 不放行", () => {
    expect(shouldUpload({ ...gate, enabled: false })).toBe(false);
    expect(shouldUpload({ ...gate, hasContext: false })).toBe(false);
  });
});

describe("formatMergeStats", () => {
  it("三个数字的口径与确认框/提示条一致", () => {
    expect(formatMergeStats({ cloud: 137, local: 89, merged: 152 })).toBe(
      "云端 137 / 本地 89 / 合并后 152",
    );
  });
});

/**
 * 「云端为空直接提交 / 云端非空弹确认框」的唯一分支点：分支写反就等于把未经确认的
 * 合并结果直接写进云端，因此三条路径都必须锁住。
 */
describe("chooseEnableStep", () => {
  it("预览失败 → 中止（不提交、不弹框）", () => {
    expect(chooseEnableStep({ ok: false })).toBe("abort");
  });

  it("云端为空 → 跳过确认，直接提交", () => {
    expect(chooseEnableStep({ ok: true, cloudEmpty: true })).toBe("commit");
  });

  it("云端有数据 → 必须走确认框", () => {
    expect(chooseEnableStep({ ok: true, cloudEmpty: false })).toBe("confirm");
  });
});

describe("同步状态（设置面板常驻显示）", () => {
  it("进入同步 → 同步中；失败 → 待重试并保留原因；成功 → 清空原因", () => {
    const seen: string[] = [];
    const off = onSyncStateChange((s) => {
      seen.push(`${s.phase}:${s.message ?? ""}`);
    });

    setBusy(true);
    expect(getSyncStatus().phase).toBe("syncing");

    recordSyncResult({ ok: false, message: "网络错误，请稍后重试" });
    setBusy(false);
    expect(getSyncStatus()).toEqual({
      phase: "error",
      message: "网络错误，请稍后重试",
      at: expect.any(Number),
    });

    recordSyncResult({ ok: true, message: "同步完成" });
    expect(getSyncStatus().phase).toBe("idle");
    expect(getSyncStatus().message).toBeNull();

    expect(seen.length).toBeGreaterThan(0);
    off();
  });

  it("取消订阅后不再收到状态变化", () => {
    let calls = 0;
    const off = onSyncStateChange(() => {
      calls += 1;
    });
    off();

    setBusy(true);
    setBusy(false);
    recordSyncResult({ ok: true, message: "同步完成" });

    expect(calls).toBe(0);
  });
});

describe("状态广播（常驻指示器依赖）", () => {
  it("设置变化时主动补发一次，订阅者能刷新可见性", () => {
    let calls = 0;
    const off = onSyncStateChange(() => {
      calls += 1;
    });
    notifySyncState();
    off();
    expect(calls).toBe(1);
  });
});
