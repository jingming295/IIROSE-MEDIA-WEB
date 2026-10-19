import { describe, expect, it } from "vitest";
import { PluginSettings } from "./PluginSettings";

describe("normalizeSyncSettings", () => {
  const empty = PluginSettings.normalizeSyncSettings(null);

  it("缺省值：关闭、无 salt、无 lastRev、地址是默认函数 URL", () => {
    expect(empty.enabled).toBe(false);
    expect(empty.salt).toBeNull();
    expect(empty.lastRev).toBeNull();
    expect(empty.lastSyncAt).toBeNull();
    expect(empty.serverUrl).toMatch(/^https:\/\/.+\.tencentscf\.com$/);
  });

  it("lastRev 只接受非空字符串，其余一律回退 null", () => {
    const keep = PluginSettings.normalizeSyncSettings({ lastRev: "MTg0NDQ5" });
    expect(keep.lastRev).toBe("MTg0NDQ5");

    expect(
      PluginSettings.normalizeSyncSettings({ lastRev: "" }).lastRev,
    ).toBeNull();
    expect(
      PluginSettings.normalizeSyncSettings({
        lastRev: 123 as unknown as string,
      }).lastRev,
    ).toBeNull();
    expect(
      PluginSettings.normalizeSyncSettings({ lastRev: null }).lastRev,
    ).toBeNull();
  });

  it("非法 deviceId 被清空（服务端要 16 位 hex，否则每次 PUT 400）", () => {
    expect(
      PluginSettings.normalizeSyncSettings({ deviceId: "device-1" }).deviceId,
    ).toBe("");
    expect(
      PluginSettings.normalizeSyncSettings({ deviceId: "0123456789abcdef" })
        .deviceId,
    ).toBe("0123456789abcdef");
  });

  it("口令不出现在设置结构里", () => {
    const shape = PluginSettings.normalizeSyncSettings({
      // 即使有人手改 localStorage 塞了这些键，归一化也不应该带出去
      passphrase: "oops",
      password: "oops",
    } as never);
    expect(Object.keys(shape).sort()).toEqual([
      "deviceId",
      "enabled",
      "lastRev",
      "lastSyncAt",
      "salt",
      "serverUrl",
    ]);
  });
});

describe("搜索结果视图切换", () => {
  it("卡片 → 列表 → 卡片：翻转并落盘", () => {
    localStorage.clear();
    localStorage.setItem(
      "imwPluginSetting",
      JSON.stringify({ searchViewMode: "card" }),
    );

    expect(PluginSettings.toggleSearchViewMode()).toBe("list");
    expect(
      JSON.parse(localStorage.getItem("imwPluginSetting")!).searchViewMode,
    ).toBe("list");

    expect(PluginSettings.toggleSearchViewMode()).toBe("card");
    expect(
      JSON.parse(localStorage.getItem("imwPluginSetting")!).searchViewMode,
    ).toBe("card");
  });

  it("缺省或非法值一律按卡片处理，再切换一次得到列表", () => {
    localStorage.clear();
    expect(PluginSettings.toggleSearchViewMode()).toBe("list");

    localStorage.setItem(
      "imwPluginSetting",
      JSON.stringify({ searchViewMode: "grid" }),
    );
    expect(PluginSettings.getPluginSetting().searchViewMode).toBe("card");
    expect(PluginSettings.toggleSearchViewMode()).toBe("list");
  });

  it("展示文案与设置值一一对应", () => {
    expect(PluginSettings.parseSearchViewMode("list")).toBe("列表");
    expect(PluginSettings.parseSearchViewMode("card")).toBe("卡片");
  });
});
