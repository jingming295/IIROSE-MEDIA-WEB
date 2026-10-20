import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "preact/test-utils";
import { IMCInit } from "../page";

vi.mock("../page/MainAppControlLayer", () => ({
  MainAppControlLayer: () => null,
}));
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("../iirose_func/Socket", () => ({
  Socket: class {
    sendMessage = send;
  },
}));

let range: HTMLInputElement;
const entry = () => document.getElementById("imw-media-progress-entry")!;
const panel = () => document.getElementById("imw-media-progress");
function key(value: string, repeat = false) {
  act(() =>
    range.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: value,
        repeat,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
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
  act(() => range.dispatchEvent(event));
}

beforeEach(() => {
  vi.useFakeTimers();
  send.mockClear();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  Object.assign(window, {
    shareMediaCurrentTime: 80,
    shareMediaDuration: 300,
    socket: { readyState: 1 },
    shareMedia: () => {},
    Utils: {
      service: { isShareMediaPlaying: () => true, seekDemandMedia: () => {} },
    },
  });
  document.body.innerHTML =
    '<div id="mainContainer"></div><div id="functionHolder"><div id="functionHolderExtBox"><div class="functionButtonExt"><div id="shareMediaBox"></div></div></div></div>';
  act(() =>
    IMCInit.init(document.getElementById("mainContainer") as HTMLDivElement),
  );
  vi.spyOn(entry(), "getClientRects").mockReturnValue([
    new DOMRect(0, 0, 100, 44),
  ] as unknown as DOMRectList);
  act(() => entry().click());
  range = document.querySelector("#imw-media-progress input")!;
  range.setPointerCapture = vi.fn();
  vi.spyOn(range, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 100, 44),
  );
});
afterEach(() => {
  act(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: false }),
    ),
  );
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("浮窗原生交互与页面生命周期", () => {
  it("原生 input 保持预览，change 只提交一次", () => {
    value("input", 120);
    act(() => vi.advanceTimersByTime(250));
    expect(range.value).toBe("120");
    expect(send).not.toHaveBeenCalled();
    value("change", 120);
    value("change", 120);
    expect(send.mock.calls).toEqual([["快进40s"]]);
  });
  it("原生预览 Escape 取消后晚到的 change 不提交，后续 input 可重新操作", () => {
    value("input", 120);
    key("Escape");
    value("change", 120);
    expect(send).not.toHaveBeenCalled();
    expect(panel()).not.toBeNull();
    value("input", 140);
    value("change", 140);
    expect(send.mock.calls).toEqual([["快进1m"]]);
  });
  it("辅助技术仅 change 也能提交", () => {
    value("change", 140);
    expect(send.mock.calls).toEqual([["快进1m"]]);
  });
  it("键盘仍需 Enter，原生事件不重复提交", () => {
    key("ArrowRight");
    key("ArrowRight");
    value("input", 90);
    value("change", 90);
    expect(send).not.toHaveBeenCalled();
    key("Enter");
    value("change", 82);
    expect(send.mock.calls).toEqual([["快进2s"]]);
  });
  it("指针释放提交一次，原生 change 不提前提交", () => {
    pointer("pointerdown");
    value("input", 180);
    value("change", 180);
    expect(send).not.toHaveBeenCalled();
    pointer("pointerup");
    value("change", 120);
    expect(send.mock.calls).toEqual([["快进40s"]]);
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
    act(() =>
      document
        .querySelector<HTMLButtonElement>('[aria-label="关闭播放进度"]')!
        .click(),
    );
    expect(document.activeElement).toBe(entry());
    act(() => entry().click());
    vi.mocked(entry().getClientRects).mockReturnValue(
      [] as unknown as DOMRectList,
    );
    const focus = vi.spyOn(entry(), "focus");
    act(() =>
      document
        .querySelector<HTMLButtonElement>('[aria-label="关闭播放进度"]')!
        .click(),
    );
    expect(focus).not.toHaveBeenCalled();
  });
  it("bfcache pagehide/pageshow 保留唯一可用实例，离开页面清理监听", () => {
    const original = panel();
    act(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      ),
    );
    act(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      ),
    );
    expect(panel()).toBe(original);
    expect(document.querySelectorAll("#imw-media-progress-root")).toHaveLength(
      1,
    );
    value("change", 120);
    expect(send).toHaveBeenCalledOnce();
    const remove = vi.spyOn(window, "removeEventListener");
    act(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: false }),
      ),
    );
    expect(document.getElementById("imw-media-progress-root")).toBeNull();
    expect(remove).toHaveBeenCalledWith("pagehide", expect.any(Function));
    // Preact 已排队的渲染调度可在卸载后完成；业务超时与轮询不得继续。
    act(() => vi.runOnlyPendingTimers());
    expect(vi.getTimerCount()).toBe(0);
    expect(send).toHaveBeenCalledOnce();
  });
});
