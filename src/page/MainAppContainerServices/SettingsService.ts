// SettingsService.ts

import { GetBiliBiliAccount } from "../../Account/BiliBili/GetBiliBili";
import { ShowMessage } from "../../iirose_func/ShowMessage";
import { IIROSEUtils } from "../../iirose_func/IIROSEUtils";
import { BiliBiliSettings } from "../../settings/bilibiliSettings/BiliBiliSettings";
import { JOOXSettings } from "../../settings/jooxSettings/JOOXSettings";
import { NetEaseSettings } from "../../settings/neteaseSettings/NetEaseSettings";
import { PluginSettings } from "../../settings/pluginSettings/PluginSettings";
import { RadioSettings } from "../../settings/radioSettings/RadioSettings";
import { SyncManager } from "../../sync/SyncManager";

export class SettingsService {
  /**
   * B站账号设置
   */
  static showBilibiliAccount(ctx: MainAppContainerActionContext) {
    const getBilibiliAcc = new GetBiliBiliAccount();
    const accData = getBilibiliAcc.getBiliBiliAccount();
    const settings = new BiliBiliSettings();

    const data: SettingData[] = [
      {
        title: "账号",
        actionTitle: accData?.uname || "未登录",
        icon: "mdi-account-child-circle",
        action: settings.setAccount.bind(settings),
      },
    ];

    this.setState(ctx, data);
  }

  /**
   * B站视频/直播画质设置
   */
  static showBilibiliVideo(ctx: MainAppContainerActionContext) {
    const settings = new BiliBiliSettings();
    const s = settings.getBilibiliVideoSettings();

    const data: SettingData[] = [
      {
        title: "点播的视频画质",
        actionTitle: settings.parseBilibiliVideoQn(s.qn),
        icon: "mdi-video",
        action: settings.setBilibiliVideoQuality.bind(settings),
      },
      {
        title: "点播的直播画质",
        actionTitle: settings.parseBilibiliLiveQn(s.streamqn),
        icon: "mdi-video-wireless",
        action: settings.setBilibiliLiveQuality.bind(settings),
      },
      {
        title: "点播的直播播放时长",
        actionTitle: `${s.streamSeconds / 60} 分钟`,
        icon: "mdi-clock-outline",
        action: settings.setBilibiliStreamSeconds.bind(settings),
      },
      {
        title: "点播视频的获取格式",
        actionTitle: settings.parseGetVideoFormat(s.videoStreamFormat),
        icon: "mdi-hammer-wrench",
        action: settings.setGetVideoFormat.bind(settings),
      },
      {
        title: "默认API",
        actionTitle: settings.parseBilibiliApi(s.api),
        icon: "mdi-code-braces",
        action: settings.setBilibiliDefaultApi.bind(settings),
      },
    ];

    this.setState(ctx, data);
  }

  /**
   * 网易云音乐设置
   */
  static showNetEaseMusic(ctx: MainAppContainerActionContext) {
    const s = NetEaseSettings.getNeteaseMusicSetting();

    const data: SettingData[] = [
      {
        title: "歌词",
        actionTitle: NetEaseSettings.parseNetEaseMusicLyricOption(
          s.lyricOption,
        ),
        icon: "mdi-card-bulleted",
        action: NetEaseSettings.setNeteaseMusicLyric.bind(NetEaseSettings),
      },
      {
        title: "默认API",
        actionTitle: NetEaseSettings.parseNetEaseMusicApi(s.api),
        icon: "mdi-code-braces",
        action: NetEaseSettings.setNeteaseDefaultApi.bind(NetEaseSettings),
      },
      {
        title: "音乐的音质 - 已废弃",
        actionTitle: NetEaseSettings.parseNetEaseMusicQuality(s.quality),
        icon: "mdi-music",
        action: NetEaseSettings.setNeteaseMusicQuality.bind(NetEaseSettings),
      },
    ];

    this.setState(ctx, data);
  }

  static showJOOXMusic(ctx: MainAppContainerActionContext) {
    const s = JOOXSettings.getJOOXSetting();
    const data: SettingData[] = [
      {
        title: "默认API",
        actionTitle: JOOXSettings.parseJOOXApi(s.api),
        icon: "mdi-code-braces",
        action: JOOXSettings.setJooxDefaultApi.bind(JOOXSettings),
      },
    ];

    this.setState(ctx, data);
  }

  static showRadio(ctx: MainAppContainerActionContext) {
    const s = RadioSettings.getRadioSettings();

    const data: SettingData[] = [
      {
        title: "默认播放时长",
        actionTitle: `${s.duration / 60} 分钟`,
        icon: "mdi-clock-outline",
        action: RadioSettings.setRadioStreamSeconds.bind(RadioSettings),
      },
    ];

    this.setState(ctx, data);
  }

  /**
   * 插件全局设置
   */
  static showPluginSettings(
    ctx: MainAppContainerActionContext,
    changeSearchKeyword: (keyword: string | null) => void,
    ShowOrHideIMC: () => Promise<void>,
  ) {
    const ps = PluginSettings.getPluginSetting();
    const isProxyAtInputInText = ps.chatBox.isProxyAtInput
      ? "mdi-toggle-switch"
      : "mdi-toggle-switch-off-outline";

    const data: SettingData[] = [
      {
        title: "插件启动默认页面",
        actionTitle: PluginSettings.parseDefaultPage(ps.defaultPage),
        icon: "mdi-page-layout-header-footer",
        action: (doSomethings) => PluginSettings.setDefaultPage(doSomethings),
      },
      {
        title: "搜索结果视图",
        actionTitle: PluginSettings.parseSearchViewMode(ps.searchViewMode),
        icon: ps.searchViewMode === "list" ? "listViewIcon" : "cardViewIcon",
        action: (doSomethings) => {
          const newMode = PluginSettings.toggleSearchViewMode();
          doSomethings?.(PluginSettings.parseSearchViewMode(newMode));
          // ctx.setState 触发父级重渲染时，SettingCard 会用 props.actionTitle
          // 覆盖内部标题，因此需同步更新 settingsData 里的 actionTitle 与 icon
          ctx.setState({
            searchViewMode: newMode,
            settingsData: data.map((item) =>
              item.title === "搜索结果视图"
                ? {
                    ...item,
                    actionTitle: PluginSettings.parseSearchViewMode(newMode),
                    icon: newMode === "list" ? "listViewIcon" : "cardViewIcon",
                  }
                : item,
            ),
          });
        },
      },
      {
        title: "代理蔷薇@输入",
        actionTitle: isProxyAtInputInText,
        icon: "mdi-at",
        action: (doSomethings) => {
          PluginSettings.isProxyAtInputSetting(
            doSomethings!,
            changeSearchKeyword,
            ShowOrHideIMC,
          );
        },
      },
    ];

    this.setState(ctx, data);
  }

  /**
   * 收藏云同步设置面板（唯一入口，全部改动都发生在这里）
   */
  static async showSyncSettings(ctx: MainAppContainerActionContext) {
    this.setState(ctx, await this.buildSyncSettings(ctx));
  }

  private static async buildSyncSettings(
    ctx: MainAppContainerActionContext,
  ): Promise<SettingData[]> {
    const refresh = () => void this.showSyncSettings(ctx);

    const uid = SyncManager.getUid();
    const state = SyncManager.getState();
    const enabled = state.enabled;
    const unlocked = state.unlocked;
    // 「忘记本机密钥」按缓存是否存在判定：关闭同步后缓存仍在，也必须能清除
    const hasLocalKey = await SyncManager.hasLocalKey();

    const promptPassphrase = (
      title: string,
      onConfirm: (passphrase: string) => void,
    ) => {
      IIROSEUtils.sync(2, [title, "", 64], (value) => {
        const passphrase = typeof value === "string" ? value.trim() : "";
        if (!passphrase) return;
        onConfirm(passphrase);
      });
    };

    return [
      {
        title: "云端同步",
        actionTitle: !uid ? "未登录账号" : enabled ? "已启用" : "未启用",
        icon: "syncCloudIcon",
        action: () => {
          if (!SyncManager.getUid()) {
            ShowMessage.show("未登录蔷薇账号，无法启用云端同步");
            return;
          }
          if (SyncManager.getState().enabled) {
            ShowMessage.show(SyncManager.disable().message);
            refresh();
            return;
          }
          promptPassphrase(
            "设置同步口令（忘记口令将无法找回云端收藏，建议至少 8 位）",
            (passphrase) => {
              void SyncManager.enable(passphrase).then((res) => {
                ShowMessage.show(res.message);
                refresh();
              });
            },
          );
        },
      },
      {
        title: "同步口令（忘记不可找回）",
        actionTitle: !enabled ? "未启用" : unlocked ? "已解锁" : "未解锁",
        icon: "syncKeyIcon",
        action: () => {
          if (!SyncManager.getState().enabled) {
            ShowMessage.show("请先启用云端同步");
            return;
          }
          promptPassphrase(
            "输入同步口令解锁（本机已缓存密钥时无需输入；换设备或清除本机密钥后才需要）",
            (passphrase) => {
              void SyncManager.unlock(passphrase).then((res) => {
                ShowMessage.show(res.message);
                refresh();
              });
            },
          );
        },
      },
      {
        title: "上次同步时间",
        actionTitle: SyncManager.formatLastSyncAt(state.lastSyncAt),
        icon: "syncClockIcon",
        action: () => refresh(),
      },
      {
        title: "立即同步",
        actionTitle: !enabled ? "未启用" : unlocked ? "立即同步" : "需先解锁",
        icon: "syncRefreshIcon",
        action: () => {
          const current = SyncManager.getState();
          if (!current.enabled) {
            ShowMessage.show("请先启用云端同步");
            return;
          }
          if (!current.unlocked) {
            ShowMessage.show("请先输入同步口令解锁");
            return;
          }
          void SyncManager.syncNow().then((res) => {
            ShowMessage.show(res.message);
            refresh();
          });
        },
      },
      {
        title: "清空云端",
        actionTitle: "清空云端",
        icon: "syncDeleteIcon",
        action: () => {
          const content =
            "确认清空云端收藏？\n\n" +
            "云端保存的收藏密文将被清空（服务端保留历史版本以供回滚），本地收藏不受影响。\n" +
            "注意：只要本地仍保留收藏且同步处于启用状态，之后的收藏增删仍会上传并重建云端副本。";
          IIROSEUtils.sync(0, [content], () => {
            void SyncManager.clearCloud().then((res) => {
              ShowMessage.show(res.message);
              refresh();
            });
          });
        },
      },
      {
        title: "忘记本机密钥",
        actionTitle: hasLocalKey ? "清除本机密钥" : "无本机密钥",
        icon: "syncKeyIcon",
        action: () => {
          if (!hasLocalKey) {
            ShowMessage.show("本机没有可清除的密钥缓存");
            return;
          }
          const content =
            "确认清除本机密钥？\n\n" +
            "清除后本机不再缓存解密的密钥句柄，下次进入插件需要重新输入同步口令。\n" +
            "云端收藏密文与本地收藏都不受影响；没有口令就再也解不开云端副本。";
          IIROSEUtils.sync(0, [content], () => {
            void SyncManager.forgetLocalKey().then((res) => {
              ShowMessage.show(res.message);
              refresh();
            });
          });
        },
      },
    ];
  }

  static setState = (
    ctx: MainAppContainerActionContext,
    settingsData: SettingData[],
  ) => {
    ctx.setState({ settingsData });
  };
}
