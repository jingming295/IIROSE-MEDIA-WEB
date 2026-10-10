import { IIROSEUtils } from "../../iirose_func/IIROSEUtils";
import { Input_Behavior_Module } from "../../input-behavior-module/Input-Behavior-Module";

export type SearchViewMode = "card" | "list";

export interface PluginSettingsInterface {
  chatBox: {
    isProxyAtInput: boolean;
  };
  defaultPage: number;
  searchViewMode: SearchViewMode;
}

export class PluginSettings {
  public static isProxyAtInputSetting(
    changeActionTitleAction: (actionTitle?: string) => void,
    changeSearchKeyword: (keyword: string | null) => void,
    ShowOrHideIMC: () => Promise<void>,
  ) {
    const pluginSettings = PluginSettings.getPluginSetting();

    pluginSettings.chatBox.isProxyAtInput =
      !pluginSettings.chatBox.isProxyAtInput;
    localStorage.setItem("imwPluginSetting", JSON.stringify(pluginSettings));

    if (changeActionTitleAction) {
      changeActionTitleAction(
        pluginSettings.chatBox.isProxyAtInput
          ? "mdi-toggle-switch"
          : "mdi-toggle-switch-off-outline",
      );
    }
    Input_Behavior_Module.applyBehavior(changeSearchKeyword, ShowOrHideIMC);
  }

  public static setDefaultPage(
    changeActionTitleAction?: (actionTitle?: string) => void,
  ) {
    const set = (_t: HTMLElement, s: string) => {
      const ps = PluginSettings.getPluginSetting();
      const inputint = parseInt(s);
      if (ps) {
        ps.defaultPage = inputint;
        localStorage.setItem("imwPluginSetting", JSON.stringify(ps));
      }

      if (changeActionTitleAction) {
        const qualityInText = PluginSettings.parseDefaultPage(inputint);
        changeActionTitleAction(qualityInText);
      }
    };

    const mdiClass = ["mdi-music", "mdi-video"];

    const selectOption = [
      [0, "音乐"],
      [1, "视频"],
    ];

    selectOption.forEach((item, index) => {
      item.push(
        `<div class="${mdiClass[index]}" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`,
      );
    });

    IIROSEUtils.buildSelect2(
      null,
      selectOption,
      set,
      false,
      true,
      null,
      false,
      null,
      () => {},
    );
  }
  public static parseDefaultPage(page: number): string {
    const selectOption: [number, string][] = [
      [0, "音乐"],
      [1, "视频"],
    ];

    const optionInText = selectOption.find((option) => option[0] === page);

    return optionInText ? optionInText[1] : "音乐";
  }

  /**
   * 切换搜索结果视图（卡片/列表）：读 -> 翻转 -> 写 localStorage -> 返回新值
   */
  public static toggleSearchViewMode(): SearchViewMode {
    const pluginSettings = PluginSettings.getPluginSetting();

    pluginSettings.searchViewMode =
      pluginSettings.searchViewMode === "list" ? "card" : "list";
    localStorage.setItem("imwPluginSetting", JSON.stringify(pluginSettings));

    return pluginSettings.searchViewMode;
  }

  public static parseSearchViewMode(mode: SearchViewMode): string {
    return mode === "list" ? "列表" : "卡片";
  }

  public static getPluginSetting(): PluginSettingsInterface {
    const pluginSettings = localStorage.getItem("imwPluginSetting");
    if (pluginSettings) {
      const parsed = JSON.parse(pluginSettings) as PluginSettingsInterface;
      // 单点归一化：手改 localStorage 产生的非法值一律回退 "card"
      parsed.searchViewMode =
        parsed.searchViewMode === "list" ? "list" : "card";
      return parsed;
    }
    return {
      chatBox: {
        isProxyAtInput: true,
      },
      defaultPage: 0,
      searchViewMode: "card",
    };
  }
}
