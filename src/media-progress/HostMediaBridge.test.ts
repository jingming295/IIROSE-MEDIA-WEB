import { afterEach, describe, expect, it, vi } from "vitest";
import { HostMediaBridge, MediaHost } from "./HostMediaBridge";
import { ProgressSession } from "./ProgressSession";
import { Socket } from "../iirose_func/Socket";

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
        moveinputDo: vi.fn(),
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("宿站桥接与交互生命周期", () => {
  it("默认发送器交给宿站原生解析，拖动与步进均不发送普通公聊", () => {
    vi.useFakeTimers();
    const { host, session: unused } = fixture();
    unused.dispose();
    const publicSend = vi.spyOn(Socket.prototype, "sendMessage");
    const wireSend = vi.fn();
    vi.stubGlobal("socket", { readyState: 1, send: wireSend });
    document.body.innerHTML = '<textarea id="moveinput"></textarea>';
    const draft = document.getElementById("moveinput") as HTMLTextAreaElement;
    draft.value = '保留草稿："未发送"\n第二行';
    draft.setSelectionRange(2, 5, "backward");
    const originalDraft = draft.value;
    const service = host.Utils!.service!;
    const control = vi.fn(function (this: unknown) {
      expect(this).toBe(service);
      // 即使宿站清理输入，桥接也必须恢复草稿和选择范围。
      draft.value = "";
    });
    service.moveinputDo = control;
    const session = new ProgressSession(new HostMediaBridge(host), vi.fn());
    try {
      session.begin();
      session.preview(120);
      expect(control).not.toHaveBeenCalled();
      session.commit();
      session.commit();
      expect(control.mock.calls).toEqual([["快进40s"]]);
      expect(session.state.waiting).toBe(true);
      service.seekDemandMedia!(120);
      expect(session.state.media.current).toBe(120);
      expect(session.state.waiting).toBe(false);
      session.step(60);
      expect(control.mock.calls).toEqual([["快进40s"], ["快进1m"]]);
      expect(publicSend).not.toHaveBeenCalled();
      expect(wireSend).not.toHaveBeenCalled();
      expect(draft.value).toBe(originalDraft);
      expect([
        draft.selectionStart,
        draft.selectionEnd,
        draft.selectionDirection,
      ]).toEqual([2, 5, "backward"]);
    } finally {
      session.dispose();
    }
  });
  it("mediaShareRoom 明确为 false 时不调用控制函数或普通公聊", () => {
    vi.useFakeTimers();
    const { host, session: unused } = fixture();
    unused.dispose();
    host.mediaShareRoom = false;
    const control = host.Utils!.service!.moveinputDo as ReturnType<
      typeof vi.fn
    >;
    const publicSend = vi.spyOn(Socket.prototype, "sendMessage");
    const session = new ProgressSession(new HostMediaBridge(host), vi.fn());
    try {
      session.step(60);
      expect(control).not.toHaveBeenCalled();
      expect(publicSend).not.toHaveBeenCalled();
      expect(session.state.waiting).toBe(false);
      expect(session.state.message).toBe("当前房间不支持媒体进度控制");
    } finally {
      session.dispose();
    }
  });
  it.each(["missing", "throws", "disconnect"])(
    "原生控制 %s 时安全失败且保护草稿",
    (mode) => {
      vi.useFakeTimers();
      const { host, session: unused } = fixture();
      unused.dispose();
      document.body.innerHTML =
        '<textarea id="moveinput">未发送草稿</textarea>';
      const draft = document.getElementById("moveinput") as HTMLTextAreaElement;
      const control = vi.fn(() => {
        draft.value = "";
        throw new Error("unavailable");
      });
      host.Utils!.service!.moveinputDo =
        mode === "missing" ? undefined : control;
      if (mode === "disconnect") host.socket!.readyState = 3;
      const publicSend = vi.spyOn(Socket.prototype, "sendMessage");
      const session = new ProgressSession(new HostMediaBridge(host), vi.fn());
      try {
        session.step(60);
        expect(publicSend).not.toHaveBeenCalled();
        expect(control).toHaveBeenCalledTimes(mode === "throws" ? 1 : 0);
        expect(draft.value).toBe("未发送草稿");
        expect(session.state.waiting).toBe(false);
        if (mode === "missing")
          expect(session.state.message).toContain("控制不可用");
        if (mode === "throws")
          expect(session.state.message).toContain("连接、房间权限");
      } finally {
        session.dispose();
      }
    },
  );
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
