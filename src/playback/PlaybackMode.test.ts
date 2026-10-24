import { describe, expect, it, vi } from "vitest";
import { snapshot } from "./fixtures";
import { PlaybackMode } from "./PlaybackMode";
import type { PlaybackModeAvailability } from "./PlaybackMode";

const reasonOf = (value: PlaybackModeAvailability) => value.reason;

describe("播放模式状态机", () => {
  it("收到快照前按「时长未知」处理：熄灭且不可用", () => {
    const mode = new PlaybackMode();
    expect(mode.mode).toBe("none");
    expect(mode.state).toEqual({
      mode: "none",
      loop: { enabled: false, reason: "直播或时间未知，无法使用" },
      shuffle: { enabled: false, reason: "直播或时间未知，无法使用" },
    });
    mode.applySnapshot(snapshot());
    expect(mode.state).toEqual({
      mode: "none",
      loop: { enabled: true, reason: "" },
      shuffle: { enabled: true, reason: "" },
    });
  });

  it("互斥单选，再次点击已点亮项回到熄灭", () => {
    const mode = new PlaybackMode();
    mode.applySnapshot(snapshot());
    mode.toggle("loop");
    expect(mode.mode).toBe("loop");
    mode.toggle("shuffle");
    expect(mode.mode).toBe("shuffle");
    mode.toggle("shuffle");
    expect(mode.mode).toBe("none");
  });

  it("不可用模式拒绝点亮且保留原因", () => {
    const mode = new PlaybackMode();
    mode.applySnapshot(snapshot());
    mode.setAvailability("loop", {
      enabled: false,
      reason: "无媒体管理权限，且该曲目不由插件点播，无法循环",
    });
    mode.toggle("loop");
    expect(mode.mode).toBe("none");
    expect(reasonOf(mode.state.loop)).toBe(
      "无媒体管理权限，且该曲目不由插件点播，无法循环",
    );
    expect(mode.state.shuffle.enabled).toBe(true);
  });

  it("媒体行消失即灰化并清零点亮态，恢复存在也不自动重新点亮", () => {
    const mode = new PlaybackMode();
    mode.applySnapshot(snapshot());
    mode.toggle("loop");
    // 删卡后宿站仍可能保留 shareMediaDuration，只有 DOM 存在性能判定「无当前媒体」。
    mode.setMediaPresent(false);
    expect(mode.mode).toBe("none");
    expect(mode.state.loop).toEqual({
      enabled: false,
      reason: "直播或时间未知，无法使用",
    });
    mode.toggle("loop");
    expect(mode.mode).toBe("none");
    mode.setMediaPresent(true);
    expect(mode.state.loop).toEqual({ enabled: true, reason: "" });
    expect(mode.mode).toBe("none");
  });

  it("连接未就绪或断开时灰化，文案不假定已断开", () => {
    const mode = new PlaybackMode();
    mode.toggle("loop");
    mode.applySnapshot(snapshot({ connected: false }));
    expect(mode.mode).toBe("none");
    expect(mode.state.loop).toEqual({
      enabled: false,
      reason: "连接未就绪或已断开，暂时无法调整",
    });
  });

  it("时长未知或为 0 按直播原因禁用，暂停不影响", () => {
    const mode = new PlaybackMode();
    mode.applySnapshot(snapshot({ duration: null }));
    expect(mode.state.loop).toEqual({
      enabled: false,
      reason: "直播或时间未知，无法使用",
    });
    mode.applySnapshot(snapshot({ duration: 0 }));
    expect(mode.state.shuffle).toEqual({
      enabled: false,
      reason: "直播或时间未知，无法使用",
    });
    mode.applySnapshot(snapshot({ duration: 200, playing: false }));
    expect(mode.state.shuffle.enabled).toBe(true);
  });

  it("可用性派生顺序：无媒体 → 断线 → 时长未知 → 单模式原因", () => {
    const mode = new PlaybackMode();
    mode.setAvailability("shuffle", {
      enabled: false,
      reason: "当前页面没有收藏",
    });
    mode.applySnapshot(snapshot({ duration: null }));
    expect(reasonOf(mode.state.shuffle)).toBe("直播或时间未知，无法使用");
    mode.applySnapshot(snapshot({ connected: false }));
    expect(reasonOf(mode.state.shuffle)).toBe(
      "连接未就绪或已断开，暂时无法调整",
    );
    mode.setMediaPresent(false);
    expect(reasonOf(mode.state.shuffle)).toBe("直播或时间未知，无法使用");
    mode.setMediaPresent(true);
    mode.applySnapshot(snapshot());
    expect(reasonOf(mode.state.shuffle)).toBe("当前页面没有收藏");
  });

  it("待命原因可用但不灰化", () => {
    const mode = new PlaybackMode();
    mode.applySnapshot(snapshot());
    mode.setAvailability("shuffle", {
      enabled: true,
      reason: "当前曲目由他人点播，暂不自动续播",
    });
    expect(mode.state.shuffle).toEqual({
      enabled: true,
      reason: "当前曲目由他人点播，暂不自动续播",
    });
    mode.toggle("shuffle");
    expect(mode.mode).toBe("shuffle");
  });

  it("订阅立即回调，只在状态变化时通知，取消后静默", () => {
    const mode = new PlaybackMode();
    mode.applySnapshot(snapshot());
    const listener = vi.fn();
    const unsubscribe = mode.subscribe(listener);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenLastCalledWith(mode.state);
    mode.applySnapshot(snapshot());
    mode.applySnapshot(snapshot());
    expect(listener).toHaveBeenCalledOnce();
    mode.toggle("loop");
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    mode.applySnapshot(snapshot({ connected: false }));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("dispose 后不再改状态也不再通知", () => {
    const mode = new PlaybackMode();
    mode.applySnapshot(snapshot());
    mode.toggle("loop");
    const listener = vi.fn();
    mode.subscribe(listener);
    mode.dispose();
    mode.toggle("shuffle");
    mode.applySnapshot(snapshot({ connected: false }));
    mode.setMediaPresent(false);
    mode.setAvailability("loop", { enabled: false, reason: "已卸载" });
    expect(mode.mode).toBe("loop");
    expect(mode.state.loop).toEqual({ enabled: true, reason: "" });
    expect(listener).toHaveBeenCalledOnce();
  });
});
