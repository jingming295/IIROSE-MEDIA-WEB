import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "preact/test-utils";
import { IMCInit } from "../page";
import { Socket } from "../iirose_func/Socket";
import type { MediaHost } from "./HostMediaBridge";

vi.mock("../page/MainAppControlLayer", () => ({
  MainAppControlLayer: () => null,
}));
const send = vi.fn();
const chat = { moveinputDo: vi.fn(), msgfetch: vi.fn(), getcontents: vi.fn() };

let range: HTMLInputElement;
let resizePanel: () => void;
const entry = () => document.getElementById("imw-media-progress-entry")!;
const panel = () => document.getElementById("imw-media-progress");
function key(value: string, repeat = false) {
  act(() => {
    range.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: value,
        repeat,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}
function value(type: "input" | "change", target: number) {
  act(() => {
    range.value = String(target);
    range.dispatchEvent(new Event(type, { bubbles: true }));
  });
}
function pointer(type: string, x = 40) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX: x,
  });
  act(() => {
    range.dispatchEvent(event);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  send.mockClear();
  for (const method of Object.values(chat)) method.mockClear();
  vi.spyOn(Socket.prototype, "sendMessage");
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resizePanel = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  Object.assign(window, {
    shareMediaCurrentTime: 80,
    shareMediaDuration: 300,
    socket: { readyState: 1, send },
    rank: "0",
    roomnFull: "component-room",
    Info: { room: { identity: 1 } },
    ...chat,
    shareMedia: () => {},
    Utils: {
      service: {
        isShareMediaPlaying: () => true,
        seekDemandMedia: vi.fn((time: number) => {
          window.shareMediaCurrentTime = time;
        }),
        ...chat,
      },
    },
  });
  document.body.innerHTML =
    '<div id="mainContainer"></div><div id="functionHolder"><div id="functionHolderExtBox"><div class="functionButtonExt"><div id="shareMediaBox"></div></div></div></div>';
  act(() => {
    IMCInit.init(document.getElementById("mainContainer") as HTMLDivElement);
  });
  vi.spyOn(entry(), "getClientRects").mockReturnValue([
    new DOMRect(0, 0, 100, 44),
  ] as unknown as DOMRectList);
  act(() => {
    entry().click();
  });
  range = document.querySelector("#imw-media-progress input")!;
  range.setPointerCapture = vi.fn();
  vi.spyOn(range, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 100, 44),
  );
});
afterEach(() => {
  act(() => {
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: false }),
    );
  });
  expect(Socket.prototype.sendMessage).not.toHaveBeenCalled();
  for (const method of Object.values(chat))
    expect(method).not.toHaveBeenCalled();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("浮窗原生交互与页面生命周期", () => {
  it("普通身份即时禁用滑块和四个按钮，但仍显示媒体资料与权限原因", () => {
    const host = window as typeof window & {
      Info: { room: { identity: unknown } };
      rank: unknown;
    };
    host.Info.room.identity = 0;
    host.rank = "4";
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(range.disabled).toBe(true);
    expect(
      [
        ...document.querySelectorAll<HTMLButtonElement>(
          "#imw-media-progress button",
        ),
      ]
        .filter(
          (button) =>
            button !== document.querySelector('[aria-label="关闭播放进度"]'),
        )
        .every((button) => button.disabled),
    ).toBe(true);
    expect(panel()!.textContent).toContain("当前房间无媒体管理权限");
    expect(panel()!.textContent).toContain("未命名媒体");
    act(() => {
      range.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(send).not.toHaveBeenCalled();
  });
  it("0.8缩放下标题栏拖动与视口收缩保持浮窗和关闭按钮可达", () => {
    const viewport = Object.assign(new EventTarget(), {
      width: 400,
      height: 640,
    });
    vi.stubGlobal("visualViewport", viewport);
    act(() => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="关闭播放进度"]')!
        .click();
    });
    act(() => {
      entry().click();
    });
    const floating = panel()!;
    const scale = 0.8;
    // jsdom 不布局：按固定卡片尺寸与实际 max-* 样式模拟缩放布局。
    Object.defineProperties(floating, {
      offsetWidth: {
        get: () => Math.min(320, parseFloat(floating.style.maxWidth) || 320),
      },
      offsetHeight: {
        get: () => Math.min(270, parseFloat(floating.style.maxHeight) || 270),
      },
    });
    vi.spyOn(floating, "getBoundingClientRect").mockImplementation(
      () =>
        new DOMRect(
          parseFloat(floating.style.left) * scale,
          parseFloat(floating.style.top) * scale,
          floating.offsetWidth * scale,
          floating.offsetHeight * scale,
        ),
    );
    act(() => {
      resizePanel();
    });
    expect(floating.style.maxWidth).toBe("476px");
    expect(floating.style.maxHeight).toBe("776px");
    const title = floating.querySelector<HTMLElement>(".cursor-grab")!;
    title.setPointerCapture = vi.fn();
    const drag = (type: string, x: number, y: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, {
        pointerId: 7,
        isPrimary: true,
        button: 0,
        clientX: x,
        clientY: y,
      });
      act(() => {
        title.dispatchEvent(event);
      });
    };
    drag("pointerdown", 20, 80);
    drag("pointermove", 100, 120);
    expect(title.setPointerCapture).toHaveBeenCalledWith(7);
    expect([floating.style.left, floating.style.top]).toEqual([
      "112px",
      "130px",
    ]);
    drag("pointermove", 1000, 1000);
    drag("pointerup", 1000, 1000);
    expect([floating.style.left, floating.style.top]).toEqual([
      "168px",
      "518px",
    ]);
    viewport.width = 240;
    viewport.height = 200;
    act(() => {
      viewport.dispatchEvent(new Event("resize"));
    });
    act(() => {
      resizePanel();
    });
    expect([floating.style.maxWidth, floating.style.maxHeight]).toEqual([
      "276px",
      "226px",
    ]);
    expect([floating.style.left, floating.style.top]).toEqual(["12px", "12px"]);
    const rect = floating.getBoundingClientRect();
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(viewport.width);
    expect(rect.bottom).toBeLessThanOrEqual(viewport.height);
    const close = floating.querySelector<HTMLButtonElement>(
      '[aria-label="关闭播放进度"]',
    )!;
    // 标题栏关闭按钮44×44，右上内边距12px；验证该目标仍在可见范围。
    const closeRect = new DOMRect(
      rect.right - (12 + 44) * scale,
      rect.top + 12 * scale,
      44 * scale,
      44 * scale,
    );
    expect(closeRect.left).toBeGreaterThanOrEqual(rect.left);
    expect(closeRect.right).toBeLessThanOrEqual(viewport.width);
    expect(closeRect.bottom).toBeLessThanOrEqual(viewport.height);
    act(() => {
      close.focus();
    });
    expect(document.activeElement).toBe(close);
    act(() => {
      close.click();
    });
    expect(panel()).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });
  it.each([
    ["快进1秒", '!15[">","1s"]'],
    ["快退1秒", '!15["<","1s"]'],
    ["快进1分钟", '!15[">","1m"]'],
    ["快退1分钟", '!15["<","1m"]'],
  ])("%s 按钮仅发送 %s，2秒无回执显示未确认", (label, command) => {
    act(() => {
      document
        .querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!
        .click();
    });
    expect(send.mock.calls).toEqual([[command]]);
    expect(panel()!.textContent).toContain("等待宿站更新");
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(panel()!.textContent).toContain("未收到调整确认，请稍后重试");
    expect(panel()!.textContent).not.toContain("宿站进度已更新");
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("授权操作同步定位回读立即确认并恢复控件，2秒后不超时或重发", () => {
    const host = window as unknown as MediaHost;
    send.mockImplementationOnce(() => {
      host.Utils!.service!.seekDemandMedia!(140);
    });
    const controls = ["快退1分钟", "快退1秒", "快进1秒", "快进1分钟"].map(
      (label) =>
        panel()!.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!,
    );
    act(() => {
      controls[3].click();
    });
    expect(send).toHaveBeenCalledExactlyOnceWith('!15[">","1m"]');
    expect(host.shareMediaCurrentTime).toBe(140);
    expect(range.value).toBe("140");
    expect(panel()!.textContent).toContain("宿站进度已更新");
    expect(panel()!.textContent).not.toContain("等待宿站更新");
    expect(range.disabled).toBe(false);
    for (const control of controls) expect(control.disabled).toBe(false);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(panel()!.textContent).toContain("宿站进度已更新");
    expect(panel()!.textContent).not.toContain("未收到调整确认");
    expect(range.disabled).toBe(false);
    for (const control of controls) expect(control.disabled).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("原生 input 保持预览，change 只提交一次", () => {
    value("input", 120);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(range.value).toBe("120");
    expect(send).not.toHaveBeenCalled();
    value("change", 120);
    value("change", 120);
    expect(send.mock.calls).toEqual([['!15[">","40s"]']]);
  });
  it("原生预览 Escape 取消后晚到的 change 不提交，后续 input 可重新操作", () => {
    value("input", 120);
    key("Escape");
    value("change", 120);
    expect(send).not.toHaveBeenCalled();
    expect(panel()).not.toBeNull();
    value("input", 140);
    value("change", 140);
    expect(send.mock.calls).toEqual([['!15[">","1m"]']]);
  });
  it("辅助技术仅 change 也能提交", () => {
    value("change", 140);
    expect(send.mock.calls).toEqual([['!15[">","1m"]']]);
  });
  it("键盘仍需 Enter，原生事件不重复提交", () => {
    key("ArrowRight");
    key("ArrowRight");
    value("input", 90);
    value("change", 90);
    expect(send).not.toHaveBeenCalled();
    key("Enter");
    value("change", 82);
    expect(send.mock.calls).toEqual([['!15[">","2s"]']]);
  });
  it("指针释放提交一次，原生 change 不提前提交", () => {
    pointer("pointerdown");
    value("input", 180);
    value("change", 180);
    expect(send).not.toHaveBeenCalled();
    pointer("pointerup");
    value("change", 120);
    expect(send.mock.calls).toEqual([['!15[">","40s"]']]);
  });
  it("取消指针后晚到的 change 不发送", () => {
    pointer("pointerdown");
    pointer("pointercancel");
    value("change", 120);
    expect(send).not.toHaveBeenCalled();
  });
  it("Escape 先取消预览，再关闭；长按不误关闭，焦点回到可见入口", () => {
    key("ArrowRight");
    key("Escape");
    key("Escape", true);
    expect(panel()).not.toBeNull();
    expect(send).not.toHaveBeenCalled();
    key("Escape");
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(entry());
  });
  it("关闭按钮恢复焦点，但隐藏入口不抢焦点", () => {
    act(() => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="关闭播放进度"]')!
        .click();
    });
    expect(document.activeElement).toBe(entry());
    act(() => {
      entry().click();
    });
    vi.mocked(entry().getClientRects).mockReturnValue(
      [] as unknown as DOMRectList,
    );
    const focus = vi.spyOn(entry(), "focus");
    act(() => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="关闭播放进度"]')!
        .click();
    });
    expect(focus).not.toHaveBeenCalled();
  });
  it("bfcache pagehide/pageshow 保留唯一可用实例，离开页面清理监听", () => {
    const original = panel();
    act(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      );
    });
    act(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });
    expect(panel()).toBe(original);
    expect(document.querySelectorAll("#imw-media-progress-root")).toHaveLength(
      1,
    );
    value("change", 120);
    expect(send).toHaveBeenCalledOnce();
    const remove = vi.spyOn(window, "removeEventListener");
    act(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: false }),
      );
    });
    expect(document.getElementById("imw-media-progress-root")).toBeNull();
    expect(remove).toHaveBeenCalledWith("pagehide", expect.any(Function));
    // Preact 已排队的渲染调度可在卸载后完成；业务超时与轮询不得继续。
    act(() => {
      vi.runOnlyPendingTimers();
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(send).toHaveBeenCalledOnce();
  });
});
