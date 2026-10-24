import { afterEach, describe, expect, it, vi } from "vitest";
import { Socket } from "./index";

const sent = vi.fn();

function stubSocket(value: unknown) {
  vi.stubGlobal("WebSocket", function WebSocketStub() {});
  Object.assign(window, { socket: value });
}

afterEach(() => {
  vi.unstubAllGlobals();
  Socket.observe = undefined;
  sent.mockClear();
});

describe("Socket 报文观察钩子", () => {
  it("以实际发出的同一字符串回调观察者", () => {
    stubSocket({ send: sent });
    const observe = vi.fn();
    Socket.observe = observe;
    new Socket().send('&1{"n":"甲"}');
    expect(sent).toHaveBeenCalledExactlyOnceWith('&1{"n":"甲"}');
    expect(observe).toHaveBeenCalledExactlyOnceWith('&1{"n":"甲"}');
  });

  it("没有宿站 socket 时不回调观察者", () => {
    vi.stubGlobal("WebSocket", function WebSocketStub() {});
    Object.assign(window, { socket: undefined });
    const observe = vi.fn();
    Socket.observe = observe;
    new Socket().send("&1{}");
    expect(observe).not.toHaveBeenCalled();
  });

  it("观察者抛错不影响发送", () => {
    stubSocket({ send: sent });
    Socket.observe = () => {
      throw new Error("boom");
    };
    expect(() => new Socket().send("&1{}")).not.toThrow();
    expect(sent).toHaveBeenCalledExactlyOnceWith("&1{}");
  });
});
