import { afterEach, describe, expect, it, vi } from "vitest";
import { HostMediaBridge, MediaHost } from "./HostMediaBridge";
import { ProgressSession } from "./ProgressSession";

function fixture() {
  let playing = true;
  const host: MediaHost = {
    shareMediaCurrentTime: 80,
    shareMediaDuration: "300",
    socket: { readyState: 1 },
    shareMedia: vi.fn(function (this: unknown) {
      host.shareMediaCurrentTime = 0;
      return this;
    }),
    Utils: {
      service: {
        isShareMediaPlaying: () => playing,
        seekDemandMedia: function (time: unknown) {
          host.shareMediaCurrentTime = time;
          return "seek-return";
        },
      },
    },
  };
  document.body.innerHTML =
    '<div id="shareMediaSongName">同名媒体</div><input id="draft" value="未发送的草稿">';
  const send = vi.fn();
  const bridge = new HostMediaBridge(host, document, send);
  const session = new ProgressSession(bridge, vi.fn());
  return {
    host,
    bridge,
    session,
    send,
    end: () => {
      playing = false;
    },
  };
}
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("宿站桥接与交互生命周期", () => {
  it("拖动中零消息，释放按最新时间发一条并保护草稿", () => {
    vi.useFakeTimers();
    const { session, host, send } = fixture();
    session.begin();
    session.preview(120);
    session.preview(121);
    expect(send).not.toHaveBeenCalled();
    host.shareMediaCurrentTime = 81;
    session.commit();
    session.commit();
    session.step(1);
    expect(send.mock.calls).toEqual([["快进40s"]]);
    expect((document.getElementById("draft") as HTMLInputElement).value).toBe(
      "未发送的草稿",
    );
    expect(session.state.waiting).toBe(true);
    host.shareMediaCurrentTime = 121;
    vi.advanceTimersByTime(1000);
    expect(session.state.waiting).toBe(true);
    expect(host.Utils!.service!.seekDemandMedia!(121)).toBe("seek-return");
    expect(session.state.waiting).toBe(false);
    expect(session.state.media.current).toBe(121);
    session.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("同标题的新播放实例取消拖动与等待，旧回调不确认新媒体", () => {
    vi.useFakeTimers();
    const { session, host, send } = fixture();
    session.begin();
    session.preview(120);
    const receiver = {};
    expect(host.shareMedia!.call(receiver)).toBe(receiver);
    session.commit();
    expect(send).not.toHaveBeenCalled();
    session.step(60);
    expect(session.state.waiting).toBe(true);
    host.shareMedia!();
    host.Utils!.service!.seekDemandMedia!(60);
    expect(session.state.waiting).toBe(false);
    expect(session.state.message).toContain("媒体已切换");
    expect(send).toHaveBeenCalledTimes(1);
    session.dispose();
  });
  it("8秒无定位确认则提示未确认，不重发", () => {
    vi.useFakeTimers();
    const { session, host, send } = fixture();
    session.step(-60);
    expect(send).toHaveBeenCalledWith("快退1m");
    host.Utils!.service!.seekDemandMedia!(10);
    expect(session.state.waiting).toBe(true);
    host.shareMediaCurrentTime = 20;
    vi.advanceTimersByTime(7999);
    expect(session.state.waiting).toBe(true);
    vi.advanceTimersByTime(1);
    expect(session.state.waiting).toBe(false);
    expect(session.state.message).toContain("未确认");
    vi.advanceTimersByTime(20000);
    expect(send).toHaveBeenCalledTimes(1);
    session.dispose();
  });
  it("边界步进只发实际差值，取消手势不发", () => {
    vi.useFakeTimers();
    const { session, host, send } = fixture();
    host.shareMediaCurrentTime = 10;
    session.step(-60);
    expect(send).toHaveBeenCalledWith("快退10s");
    host.Utils!.service!.seekDemandMedia!(0);
    session.step(-1);
    expect(send).toHaveBeenCalledTimes(1);
    session.begin();
    session.preview(60);
    session.cancel();
    session.commit();
    expect(send).toHaveBeenCalledTimes(1);
    session.dispose();
  });
  it.each(["empty", "unknown", "disconnect"])(
    "%s 禁用且取消旧操作",
    (reason) => {
      vi.useFakeTimers();
      const { session, host, send, end } = fixture();
      session.begin();
      session.preview(120);
      if (reason === "empty") end();
      if (reason === "unknown") host.shareMediaDuration = Infinity;
      if (reason === "disconnect") host.socket!.readyState = 3;
      session.commit();
      session.step(1);
      expect(send).not.toHaveBeenCalled();
      expect(session.state.preview).toBeNull();
      session.dispose();
    },
  );
  it("发送异常解除等待；关闭释放观察，重新打开读新值", () => {
    vi.useFakeTimers();
    const { bridge, session, host, send } = fixture();
    send.mockImplementation(() => {
      throw new Error("closed");
    });
    session.step(1);
    expect(session.state.waiting).toBe(false);
    expect(session.state.message).toContain("发送失败");
    session.dispose();
    expect(vi.getTimerCount()).toBe(0);
    host.shareMediaCurrentTime = 200;
    const reopened = new ProgressSession(bridge, vi.fn());
    expect(reopened.state.media.current).toBe(200);
    reopened.dispose();
  });
  it("外部嵌套包装在关闭后失效，重开与重新包装只通知一次", () => {
    vi.useFakeTimers();
    const original = vi.fn(function (this: unknown) {
      return this;
    });
    const host: MediaHost = { shareMedia: original };
    const bridge = new HostMediaBridge(host);
    let stop = bridge.subscribe(vi.fn());
    const receiver = {};
    for (let index = 0; index < 3; index++) {
      const nested = host.shareMedia!;
      const external = function (this: unknown, ...args: unknown[]) {
        return nested.apply(this, args);
      };
      host.shareMedia = external;
      vi.advanceTimersByTime(250);
      stop();
      const before = bridge.read().instance;
      expect(external.call(receiver)).toBe(receiver);
      expect(bridge.read().instance).toBe(before);
      const listener = vi.fn();
      stop = bridge.subscribe(listener);
      listener.mockClear();
      expect(host.shareMedia!.call(receiver)).toBe(receiver);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(bridge.read().instance).toBe(before + 1);
    }
    stop();
    expect(original).toHaveBeenCalledTimes(6);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("支持延迟初始化并还原包装，不覆盖后安装的钩子", () => {
    vi.useFakeTimers();
    const host: MediaHost = {};
    const bridge = new HostMediaBridge(host);
    const stop = bridge.subscribe(vi.fn());
    const original = vi.fn();
    host.shareMedia = original;
    vi.advanceTimersByTime(250);
    expect(host.shareMedia).not.toBe(original);
    const later = vi.fn();
    host.shareMedia = later;
    stop();
    expect(host.shareMedia).toBe(later);
    const stopAgain = bridge.subscribe(vi.fn());
    stopAgain();
    expect(host.shareMedia).toBe(later);
    expect(vi.getTimerCount()).toBe(0);
  });
});
