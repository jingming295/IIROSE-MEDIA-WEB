// SettingsService.ts

import { GetBiliBiliAccount } from "../../Account/BiliBili/GetBiliBili";
import { BiliBiliSettings } from "../../settings/bilibiliSettings/BiliBiliSettings";
import { JOOXSettings } from "../../settings/jooxSettings/JOOXSettings";
import { NetEaseSettings } from "../../settings/neteaseSettings/NetEaseSettings";
import { PluginSettings } from "../../settings/pluginSettings/PluginSettings";

export class SettingsService
{
    /**
     * B站账号设置
     */
    static showBilibiliAccount(ctx: MainAppContainerActionContext)
    {
        const getBilibiliAcc = new GetBiliBiliAccount();
        const accData = getBilibiliAcc.getBiliBiliAccount();
        const settings = new BiliBiliSettings();

        const data: SettingData[] = [{
            title: '账号',
            actionTitle: accData?.uname || '未登录',
            icon: 'mdi-account-child-circle',
            action: settings.setAccount.bind(settings)
        }];

        this.setState(ctx, data);

    }

    /**
     * B站视频/直播画质设置
     */
    static showBilibiliVideo(ctx: MainAppContainerActionContext)
    {
        const settings = new BiliBiliSettings();
        const s = settings.getBilibiliVideoSettings();

        const data: SettingData[] = [
            {
                title: '点播的视频画质',
                actionTitle: settings.parseBilibiliVideoQn(s.qn),
                icon: 'mdi-video',
                action: settings.setBilibiliVideoQuality.bind(settings)
            },
            {
                title: '点播的直播画质',
                actionTitle: settings.parseBilibiliLiveQn(s.streamqn),
                icon: 'mdi-video-wireless',
                action: settings.setBilibiliLiveQuality.bind(settings)
            },
            {
                title: '点播的直播播放时长',
                actionTitle: `${s.streamSeconds / 60} 分钟`,
                icon: 'mdi-clock-outline',
                action: settings.setBilibiliStreamSeconds.bind(settings)
            },
            {
                title: '点播视频的获取格式',
                actionTitle: settings.parseGetVideoFormat(s.videoStreamFormat),
                icon: 'mdi-hammer-wrench',
                action: settings.setGetVideoFormat.bind(settings)
            },
            {
                title: "默认API",
                actionTitle: settings.parseBilibiliApi(s.api),
                icon: 'mdi-code-braces',
                action: settings.setBilibiliDefaultApi.bind(settings)
            }
        ];

        this.setState(ctx, data);

    }

    /**
     * 网易云音乐设置
     */
    static showNetEaseMusic(ctx: MainAppContainerActionContext)
    {
        const s = NetEaseSettings.getNeteaseMusicSetting();

        const data: SettingData[] = [
            {
                title: '音乐的音质',
                actionTitle: NetEaseSettings.parseNetEaseMusicQuality(s.quality),
                icon: 'mdi-music',
                action: NetEaseSettings.setNeteaseMusicQuality.bind(NetEaseSettings)
            },
            {
                title: '歌词',
                actionTitle: NetEaseSettings.parseNetEaseMusicLyricOption(s.lyricOption),
                icon: 'mdi-card-bulleted',
                action: NetEaseSettings.setNeteaseMusicLyric.bind(NetEaseSettings)
            },
            {
                title: '默认API',
                actionTitle: NetEaseSettings.parseNetEaseMusicApi(s.api),
                icon: 'mdi-code-braces',
                action: NetEaseSettings.setNeteaseDefaultApi.bind(NetEaseSettings)
            }
        ];

        this.setState(ctx, data);

    }

    static showJOOXMusic(ctx: MainAppContainerActionContext)
    {
        const s = JOOXSettings.getJOOXSetting();
        const data: SettingData[] = [
            {
                title: '默认API',
                actionTitle: JOOXSettings.parseJOOXApi(s.api),
                icon: 'mdi-code-braces',
                action: JOOXSettings.setNeteaseDefaultApi.bind(JOOXSettings)
            }
        ];

        this.setState(ctx, data);
    }

    /**
     * 插件全局设置
     */
    static showPluginSettings(
        ctx: MainAppContainerActionContext,
        changeSearchKeyword: (keyword: string | null) => void,
        ShowOrHideIMC: () => Promise<void>
    )
    {
        const ps = PluginSettings.getPluginSetting();
        const isProxyAtInputInText = ps.chatBox.isProxyAtInput ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off-outline';

        const data: SettingData[] = [
            {
                title: '插件启动默认页面',
                actionTitle: PluginSettings.parseDefaultPage(ps.defaultPage),
                icon: 'mdi-page-layout-header-footer',
                action: (doSomethings) => PluginSettings.setDefaultPage(doSomethings)
            },
            {
                title: '代理蔷薇@输入',
                actionTitle: isProxyAtInputInText,
                icon: 'mdi-at',
                action: (doSomethings) =>
                {
                    PluginSettings.isProxyAtInputSetting(doSomethings!, changeSearchKeyword, ShowOrHideIMC);
                }
            }
        ];

        this.setState(ctx, data);
    }

    static setState = (ctx: MainAppContainerActionContext, settingsData: SettingData[]) =>
    {
        ctx.setState({ settingsData });
    }
}