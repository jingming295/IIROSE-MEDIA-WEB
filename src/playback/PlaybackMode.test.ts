import { describe, expect, it, vi } from "vitest";
import { MediaSnapshot } from "../media-progress/model";
import { PlaybackMode, PlaybackModeAvailability } from "./PlaybackMode";

function snapshot(patch: Partial<MediaSnapshot> = {}): MediaSnapshot {
  return {
    instance: 1,
    title: "测试曲目",
    cover: "",
    current: 30,
    duration: 200,
    playing: true,
    connected: true,
    seekVersion: 0,
    dark: false,
    permission: "allowed",
    permissionReason: "",
    controlMode: "silent",
    controlNotice: "",
    controlReason: "",
    ...patch,
  };
}

const reasonOf = (value: PlaybackModeAvailability) => value.reason;

describe("播放模式状态机", () => {
  it("默认熄灭且两种模式都可用", () => {
    const mode = new PlaybackMode();
    expect(mode.mode).toBe("none");
    expect(mode.state).toEqual({
      mode: "none",
      loop: { enabled: true, reason: "" },
      shuffle: { enabled: true, reason: "" },
    });
  });

  it("互斥单选，再次点击已点亮项回到熄灭", () => {
    const mode = new PlaybackMode();
    expect(mode.toggle("loop")).toBe(true);
    expect(mode.mode).toBe("loop");
    expect(mode.toggle("shuffle")).toBe(true);
    expect(mode.mode).toBe("shuffle");
    expect(mode.state.loop.enabled).toBe(true);
    expect(mode.toggle("shuffle")).toBe(false);
    expect(mode.mode).toBe("none");
  });

  it("不可用模式拒绝点亮且保留原因", () => {
    const mode = new PlaybackMode();
    mode.setAvailability("loop", {
      enabled: false,
      reason: "无媒体管理权限，且该曲目不由插件点播，无法循环",
    });
    expect(mode.toggle("loop")).toBe(false);
    expect(mode.mode).toBe("none");
    expect(reasonOf(mode.state.loop)).toBe(
      "无媒体管理权限，且该曲目不由插件点播，无法循环",
    );
    expect(mode.state.shuffle.enabled).toBe(true);
  });

  it("不可用条件出现即清零点亮态，恢复可用也不自动重新点亮", () => {
    const mode = new PlaybackMode();
    mode.toggle("loop");
    mode.applySnapshot(snapshot({ connected: false }));
    expect(mode.mode).toBe("none");
    expect(mode.state.loop).toEqual({
      enabled: false,
      reason: "连接已断开，暂时无法调整",
    });
    mode.applySnapshot(snapshot());
    expect(mode.state.loop.enabled).toBe(true);
    expect(mode.mode).toBe("none");
  });

  it("无媒体或时长未知按直播原因禁用", () => {
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

  it("连接与媒体原因优先于单模式自身原因", () => {
    const mode = new PlaybackMode();
    mode.setAvailability("shuffle", {
      enabled: false,
      reason: "当前页面没有收藏",
    });
    mode.applySnapshot(snapshot({ connected: false }));
    expect(reasonOf(mode.state.shuffle)).toBe("连接已断开，暂时无法调整");
    mode.applySnapshot(snapshot());
    expect(reasonOf(mode.state.shuffle)).toBe("当前页面没有收藏");
    mode.setAvailability("shuffle", { enabled: true, reason: "收藏为空" });
    expect(mode.state.shuffle).toEqual({ enabled: true, reason: "收藏为空" });
    mode.setAvailability("shuffle", { enabled: true, reason: "" });
    expect(mode.state.shuffle).toEqual({ enabled: true, reason: "" });
  });

  it("订阅立即回调，只在状态变化时通知，取消后静默", () => {
    const mode = new PlaybackMode();
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

  it("dispose 清空订阅，后续变化不再通知", () => {
    const mode = new PlaybackMode();
    const listener = vi.fn();
    mode.subscribe(listener);
    mode.dispose();
    mode.toggle("shuffle");
    expect(listener).toHaveBeenCalledOnce();
    expect(mode.mode).toBe("shuffle");
  });
});
