import { describe, expect, it } from "vitest";
import { shouldAutoPull } from "./SyncManager";

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
