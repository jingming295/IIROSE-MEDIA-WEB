import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Socket } from "../iirose_func/Socket";
import { IMCInit } from "./index";

const sent = vi.fn();
const payload = `&1${JSON.stringify({
  s: "https://a/b.mp3",
  d: 300,
  c: "https://a/c.jpg",
  n: "甲",
  r: "歌手",
  b: "@0",
  o: "https://music.163.com/#/song?id=1",
  l: "",
})}`;

const loop = () =>
  document.getElementById("imw-toggle-loop") as HTMLButtonElement;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", function WebSocketStub() {});
  sent.mockClear();
  Object.assign(window, {
    shareMediaCurrentTime: 80,
    shareMediaDuration: 300,
    socket: { readyState: 1, send: sent },
    // 无媒体管理权限且非本人点播：循环是否可用完全取决于报文缓存。
    rank: "0",
    myself: "",
    roomnFull: "wiring-room",
    Info: { room: { identity: 0 } },
    shareMedia: () => {},
    Utils: {
      service: { isShareMediaPlaying: () => true, seekDemandMedia: () => {} },
    },
  });
  document.body.innerHTML =
    '<div id="mainContainer"></div><div id="functionHolder"><div id="functionHolderExtBox">' +
    '<div class="functionButtonExt"><div id="shareMediaBox">' +
    '<div id="shareMediaSongName">甲</div><div id="shareMediaUserName"></div>' +
    "</div></div></div></div>";
});

afterEach(() => {
  window.dispatchEvent(
    new PageTransitionEvent("pagehide", { persisted: false }),
  );
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Socket.observe = undefined;
  document.body.innerHTML = "";
});

describe("播放报文观察接线", () => {
  it("插件自己发出的报文让循环可用，卸载后钩子被摘除", () => {
    IMCInit.init(document.getElementById("mainContainer") as HTMLDivElement);
    expect(typeof Socket.observe).toBe("function");
    vi.advanceTimersByTime(250);
    expect(loop().getAttribute("aria-disabled")).toBe("true");

    new Socket().send(payload);
    vi.advanceTimersByTime(250);
    expect(loop().getAttribute("aria-disabled")).toBe("false");
    loop().click();
    expect(loop().getAttribute("aria-pressed")).toBe("true");

    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: false }),
    );
    expect(Socket.observe).toBeUndefined();
  });
});
