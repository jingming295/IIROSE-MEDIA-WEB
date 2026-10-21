import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostMediaBridge, MediaHost } from "./HostMediaBridge";
import { ProgressSession } from "./ProgressSession";
import { unavailableReason } from "./model";

const sessions: ProgressSession[] = [];
function fixture(identity = 0) {
  document.body.innerHTML =
    '<div id="shareMediaUserName" title="测试账号"></div><textarea id="moveinput"></textarea>';
  const draft = document.querySelector<HTMLTextAreaElement>("#moveinput")!;
  draft.value = "私聊草稿：未发送\n第二行";
  draft.setSelectionRange(2, 7, "backward");
  const moveinputDo = vi.fn();
  const host: MediaHost = {
    rank: "4",
    roomnFull: "owner-room",
    myself: "测试账号",
    Info: { room: { identity } },
    Probe: { admin: { blockPubChat: 0 } },
    socket: { readyState: 1, send: vi.fn() },
    shareMediaCurrentTime: 80,
    shareMediaDuration: 300,
    shareMedia: vi.fn(),
    Utils: {
      service: {
        moveinputDo,
        isShareMediaPlaying: () => true,
        seekDemandMedia: (time) => {
          host.shareMediaCurrentTime = time;
        },
      },
    },
  };
  const bridge = new HostMediaBridge(host);
  const session = new ProgressSession(bridge, vi.fn());
  sessions.push(session);
  return { host, bridge, session, draft, moveinputDo };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  sessions.splice(0).forEach((session) => session.dispose());
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("本人点播双通道", () => {
  it.each([
    [1, "快进1s"],
    [-1, "快退1s"],
    [60, "快进1m"],
    [-60, "快退1m"],
  ])("本人步进 %s 只发送一条 %s，五秒无回执不重试", (seconds, text) => {
    const { host, session, moveinputDo } = fixture();
    expect(session.state.media.controlMode).toBe("owner");
    expect(session.state.media.permission).toBe("denied");
    expect(session.state.media.controlNotice).toBe(
      "本人点播模式：调整会在房间发送快进/快退消息",
    );
    session.step(seconds);
    session.commit();
    session.step(1);
    expect(moveinputDo).toHaveBeenCalledExactlyOnceWith(text);
    expect(moveinputDo.mock.contexts[0]).toBe(host.Utils!.service);
    expect(host.socket!.send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(4999);
    expect(session.state.waiting).toBe(true);
    vi.advanceTimersByTime(1);
    expect(session.state.waiting).toBe(false);
    expect(session.state.message).toContain("未收到调整确认");
    vi.advanceTimersByTime(10000);
    expect(moveinputDo).toHaveBeenCalledOnce();
    expect(host.socket!.send).not.toHaveBeenCalled();
  });

  it.each(["测试账号", "其他人"])(
    "管理员控制 %s 始终静默，超时不降级",
    (owner) => {
      const { host, session, moveinputDo } = fixture(1);
      document.getElementById("shareMediaUserName")!.title = owner;
      session.step(1);
      expect(session.state.media.controlMode).toBe("silent");
      expect(session.state.media.controlNotice).not.toContain("房间发送");
      expect(host.socket!.send).toHaveBeenCalledExactlyOnceWith(
        '!15[">","1s"]',
      );
      vi.advanceTimersByTime(15000);
      expect(moveinputDo).not.toHaveBeenCalled();
      expect(host.socket!.send).toHaveBeenCalledOnce();
    },
  );

  it.each(["其他人", "", null])("点播者 %s 不证明本人，拒绝发送", (owner) => {
    const { host, bridge, session, moveinputDo } = fixture();
    const name = document.getElementById("shareMediaUserName")!;
    if (owner === null) name.removeAttribute("title");
    else name.title = owner;
    session.step(1);
    expect(bridge.read().controlMode).toBe("unavailable");
    expect(moveinputDo).not.toHaveBeenCalled();
    expect(host.socket!.send).not.toHaveBeenCalled();
  });

  it.each(["", undefined, 123])("myself 为 %s 时不猜测所有权", (myself) => {
    const { host, bridge, session, moveinputDo } = fixture();
    host.myself = myself;
    document.getElementById("shareMediaUserName")!.title = String(myself ?? "");
    session.step(1);
    expect(bridge.read().controlMode).toBe("unavailable");
    expect(moveinputDo).not.toHaveBeenCalled();
  });

  it("管理权限未知但所有权明确时仍走本人通道", () => {
    const { host, session, moveinputDo } = fixture();
    host.rank = undefined;
    host.Info = undefined;
    session.step(1);
    expect(session.state.media.permission).toBe("unknown");
    expect(moveinputDo).toHaveBeenCalledExactlyOnceWith("快进1s");
  });

  it.each([false, true])("宿站调用异常=%s 时均恢复草稿及反向选区", (throws) => {
    const { host, session, draft, moveinputDo } = fixture();
    const original = draft.value;
    moveinputDo.mockImplementation(function (this: unknown, text) {
      expect(this).toBe(host.Utils!.service);
      expect(text).toBe("快退1s");
      expect(draft.value).toBe("");
      draft.value = "宿站临时修改";
      draft.setSelectionRange(0, 0);
      if (throws) throw new Error("host error");
    });
    session.step(-1);
    expect(draft.value).toBe(original);
    expect([
      draft.selectionStart,
      draft.selectionEnd,
      draft.selectionDirection,
    ]).toEqual([2, 7, "backward"]);
    expect(session.state.waiting).toBe(!throws);
    expect(moveinputDo).toHaveBeenCalledOnce();
    expect(host.socket!.send).not.toHaveBeenCalled();
  });

  it.each(["missing", "blocked", "ended"])(
    "%s 时禁用本人通道，发送边界再次检查",
    (reason) => {
      const { host, bridge, session, draft, moveinputDo } = fixture();
      session.begin();
      session.preview(100);
      if (reason === "missing") host.Utils!.service!.moveinputDo = undefined;
      if (reason === "blocked") host.Probe!.admin!.blockPubChat = 123;
      if (reason === "ended")
        host.Utils!.service!.isShareMediaPlaying = () => false;
      expect(unavailableReason(bridge.read())).not.toBe("");
      expect(
        bridge.send('!15[">","20s"]', session.state.media.instance, "owner"),
      ).toBe(false);
      session.commit();
      expect(session.state.preview).toBeNull();
      expect(session.state.waiting).toBe(false);
      expect(draft.value).toContain("私聊草稿");
      expect(moveinputDo).not.toHaveBeenCalled();
      expect(host.socket!.send).not.toHaveBeenCalled();
    },
  );

  it.each([0, 1])(
    "预览中通道切换（初始身份%s），轮询前提交也不发言",
    (identity) => {
      const { host, bridge, session, moveinputDo } = fixture(identity);
      const mode = session.state.media.controlMode;
      session.begin();
      session.preview(120);
      host.Info!.room!.identity = identity ? 0 : 1;
      expect(
        bridge.send('!15[">","40s"]', session.state.media.instance, mode),
      ).toBe(false);
      session.commit();
      expect(session.state.preview).toBeNull();
      expect(session.state.waiting).toBe(false);
      expect(session.state.message).toContain("控制通道已切换");
      expect(moveinputDo).not.toHaveBeenCalled();
      expect(host.socket!.send).not.toHaveBeenCalled();
      // 新手势读取新通道，可以明确按当前模式操作。
      session.step(1);
      expect(identity ? moveinputDo : host.socket!.send).toHaveBeenCalledOnce();
    },
  );

  it.each([0, 1])(
    "等待中通道切换（初始身份%s）取消旧回执和超时",
    (identity) => {
      const { host, session, moveinputDo } = fixture(identity);
      session.step(1);
      host.Info!.room!.identity = identity ? 0 : 1;
      vi.advanceTimersByTime(250);
      expect(session.state.waiting).toBe(false);
      expect(session.state.message).toContain("控制通道已切换");
      host.Utils!.service!.seekDemandMedia!(81);
      vi.advanceTimersByTime(5000);
      expect(session.state.message).toContain("控制通道已切换");
      expect(identity ? host.socket!.send : moveinputDo).toHaveBeenCalledOnce();
      expect(identity ? moveinputDo : host.socket!.send).not.toHaveBeenCalled();
    },
  );

  it.each(["preview", "waiting"])("本人%s中失去所有权立即取消", (stage) => {
    const { host, session, moveinputDo } = fixture();
    if (stage === "preview") {
      session.begin();
      session.preview(120);
    } else session.step(1);
    document.getElementById("shareMediaUserName")!.title = "其他人";
    vi.advanceTimersByTime(250);
    expect(session.state.message).toContain("已非本人点播");
    session.commit();
    expect(session.state.preview).toBeNull();
    expect(session.state.waiting).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(moveinputDo).toHaveBeenCalledTimes(stage === "preview" ? 0 : 1);
    expect(host.socket!.send).not.toHaveBeenCalled();
  });

  it.each(["track", "room"])("本人通道%s切换取消预览与等待", (kind) => {
    const { host, session, moveinputDo } = fixture();
    const change = () => {
      if (kind === "track") host.shareMedia!();
      else host.roomnFull += "-next";
    };
    session.begin();
    session.preview(120);
    change();
    session.commit();
    expect(moveinputDo).not.toHaveBeenCalled();
    expect(session.state.message).toContain("媒体已切换");
    session.step(1);
    change();
    vi.advanceTimersByTime(250);
    host.Utils!.service!.seekDemandMedia!(81);
    vi.advanceTimersByTime(5000);
    expect(session.state.waiting).toBe(false);
    expect(session.state.message).toContain("媒体已切换");
    expect(moveinputDo).toHaveBeenCalledOnce();
  });

  it("本人边界单次发送，当前函数同步回读后立即恢复", () => {
    const { host, session, moveinputDo } = fixture();
    host.shareMediaCurrentTime = 10;
    const replacement = vi.fn(function (this: unknown) {
      expect(this).toBe(host.Utils!.service);
      host.Utils!.service!.seekDemandMedia!(0);
    });
    host.Utils!.service!.moveinputDo = replacement;
    session.step(-60);
    expect(replacement).toHaveBeenCalledExactlyOnceWith("快退10s");
    expect(moveinputDo).not.toHaveBeenCalled();
    expect(session.state.waiting).toBe(false);
    expect(session.state.message).toBe("宿站进度已更新");
    vi.advanceTimersByTime(5000);
    expect(session.state.message).toBe("宿站进度已更新");
    session.step(-1);
    expect(replacement).toHaveBeenCalledOnce();
  });

  it("本人通道仅接受白名单，不把任意文本转为公聊", () => {
    const { host, bridge, session, moveinputDo } = fixture();
    for (const text of [
      "快进1s",
      '!15[">","0s"]',
      '!15[">","1s"]\n',
      '!15[">","1s","chat"]',
    ])
      expect(bridge.send(text, session.state.media.instance, "owner")).toBe(
        false,
      );
    expect(moveinputDo).not.toHaveBeenCalled();
    expect(host.socket!.send).not.toHaveBeenCalled();
  });
});
