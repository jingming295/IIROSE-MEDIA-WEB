import { afterEach, describe, expect, it } from "vitest";
import {
  platformOf,
  readPanelFocus,
  resetPanelFocus,
  setPanelFocus,
} from "./PanelFocus";

afterEach(() => resetPanelFocus());

describe("面板焦点平台映射", () => {
  it("音乐首平台→网易云，视频首平台→B站，其余无收藏", () => {
    expect(platformOf({ category: 0, platform: 0 }, 1)).toBe("netease");
    expect(platformOf({ category: 1, platform: 0 }, 0)).toBe("bilibili");
    expect(platformOf({ category: 0, platform: 1 }, 0)).toBeNull();
    expect(platformOf({ category: 1, platform: 1 }, 0)).toBeNull();
    expect(platformOf({ category: 2, platform: 0 }, 0)).toBeNull();
    expect(platformOf({ category: 3, platform: 0 }, 0)).toBeNull();
  });

  it("未初始化（从未写过）时按 defaultPage 推断", () => {
    expect(platformOf(readPanelFocus(), 0)).toBe("netease");
    expect(platformOf(readPanelFocus(), 1)).toBe("bilibili");
  });

  it("写入后以焦点为准，defaultPage 不再参与", () => {
    setPanelFocus({ category: 1, platform: 0 });
    expect(platformOf(readPanelFocus(), 0)).toBe("bilibili");
    setPanelFocus({ category: 0, platform: 0 });
    expect(platformOf(readPanelFocus(), 1)).toBe("netease");
  });

  it("读取返回副本，外部修改不影响 store", () => {
    setPanelFocus({ category: 1, platform: 0 });
    const focus = readPanelFocus();
    if (focus) focus.category = 0;
    expect(readPanelFocus()?.category).toBe(1);
  });
});
