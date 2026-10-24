import { afterEach, describe, expect, it, vi } from "vitest";
import { ShowMessage } from "../iirose_func/ShowMessage";
import { MediaSnapshot } from "../media-progress/model";
import { PlaybackMode } from "./PlaybackMode";
import { SidebarPlaybackRow } from "./SidebarPlaybackRow";

vi.mock("../iirose_func/ShowMessage", () => ({
  ShowMessage: { show: vi.fn() },
}));
const show = ShowMessage.show as unknown as ReturnType<typeof vi.fn>;

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

const button = (id: string) => document.getElementById(id) as HTMLButtonElement;
const pressed = (id: string) => button(id).getAttribute("aria-pressed");
const disabled = (id: string) => button(id).getAttribute("aria-disabled");

function setup() {
  const mode = new PlaybackMode();
  const row = new SidebarPlaybackRow(mode);
  document.body.append(row.element);
  return { mode, row };
}

afterEach(() => {
  document.body.innerHTML = "";
  show.mockClear();
});

describe("侧栏播放模式开关行", () => {
  it("渲染一行两枚熄灭按钮与自包含图标", () => {
    const { row } = setup();
    expect(row.element.id).toBe("imw-playback-controls");
    expect(row.element.getAttribute("role")).toBe("group");
    expect(row.element.getAttribute("aria-label")).toBe("播放模式");
    expect(row.element.querySelectorAll("button")).toHaveLength(2);
    expect(button("imw-toggle-loop").textContent).toBe("单曲循环");
    expect(button("imw-toggle-shuffle").textContent).toBe("收藏随机");
    for (const id of ["imw-toggle-loop", "imw-toggle-shuffle"]) {
      expect(pressed(id)).toBe("false");
      expect(disabled(id)).toBe("false");
      expect(button(id).title).toBe(
        id === "imw-toggle-loop" ? "单曲循环" : "收藏随机",
      );
      const icon = button(id).querySelector("svg")!;
      expect(icon.getAttribute("aria-hidden")).toBe("true");
      expect(icon.getAttribute("viewBox")).toBe("0 0 24 24");
      expect(icon.querySelector("path")!.getAttribute("d")).toBeTruthy();
    }
  });

  it("点击互斥点亮，两枚按钮的 aria-pressed 同步更新", () => {
    setup();
    button("imw-toggle-loop").click();
    expect(pressed("imw-toggle-loop")).toBe("true");
    expect(pressed("imw-toggle-shuffle")).toBe("false");
    button("imw-toggle-shuffle").click();
    expect(pressed("imw-toggle-loop")).toBe("false");
    expect(pressed("imw-toggle-shuffle")).toBe("true");
    button("imw-toggle-shuffle").click();
    expect(pressed("imw-toggle-shuffle")).toBe("false");
    expect(show).not.toHaveBeenCalled();
  });

  it("不可用时灰化，点击仅提示原因且不点亮", () => {
    const { mode } = setup();
    mode.applySnapshot(snapshot({ connected: false }));
    expect(disabled("imw-toggle-loop")).toBe("true");
    expect(disabled("imw-toggle-shuffle")).toBe("true");
    expect(button("imw-toggle-loop").title).toBe("连接已断开，暂时无法调整");
    button("imw-toggle-loop").click();
    expect(show).toHaveBeenCalledExactlyOnceWith("连接已断开，暂时无法调整");
    expect(pressed("imw-toggle-loop")).toBe("false");
    expect(mode.mode).toBe("none");
  });

  it("点亮后条件转为不可用即熄灭", () => {
    const { mode } = setup();
    button("imw-toggle-loop").click();
    expect(pressed("imw-toggle-loop")).toBe("true");
    mode.applySnapshot(snapshot({ duration: null }));
    expect(pressed("imw-toggle-loop")).toBe("false");
    expect(disabled("imw-toggle-loop")).toBe("true");
    expect(button("imw-toggle-loop").title).toBe("直播或时间未知，无法使用");
  });

  it("待命原因通过 title 暴露但不灰化", () => {
    const { mode } = setup();
    mode.setAvailability("shuffle", {
      enabled: true,
      reason: "当前曲目由他人点播，暂不自动续播",
    });
    expect(disabled("imw-toggle-shuffle")).toBe("false");
    expect(button("imw-toggle-shuffle").title).toBe(
      "当前曲目由他人点播，暂不自动续播",
    );
    button("imw-toggle-shuffle").click();
    expect(pressed("imw-toggle-shuffle")).toBe("true");
    expect(show).not.toHaveBeenCalled();
  });

  it("dispose 移除容器并停止响应状态变化", () => {
    const { mode, row } = setup();
    const loop = button("imw-toggle-loop");
    loop.click();
    row.dispose();
    expect(document.getElementById("imw-playback-controls")).toBeNull();
    mode.toggle("shuffle");
    expect(loop.getAttribute("aria-pressed")).toBe("true");
  });
});
