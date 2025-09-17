import { BilibiliVideoSettings } from "../bilibiliSettings/BiliBiliSettings";
import { CommonSettings, CommonSettingsInterface } from "../commonSettings/CommonSettings";
import { NeteaseSetting } from "../neteaseSettings/NetEaseSettings";
import { PluginSettingsInterface } from "../pluginSettings/PluginSettings";

export class LocalStorageUtils
{

    public static Init()
    {
        this.setBilibili()
        this.setNetease()
        this.setCommonSetting()
        this.setPluginSetting()
    }

    private static setBilibili()
    {
        const lsBiliBiliSetting = localStorage.getItem('bilibiliSetting');
        if (!lsBiliBiliSetting)
        {
            const bilibiliSetting: BilibiliVideoSettings = {
                qn: 112,
                streamqn: 10000,
                streamSeconds: 43200,
                videoStreamFormat: 1,
                api: 'Beijing'
            }
            localStorage.setItem('bilibiliSetting', JSON.stringify(bilibiliSetting));
        }
    }

    private static setNetease()
    {
        const lsNeteaseSetting = localStorage.getItem('neteaseSetting');

        if (!lsNeteaseSetting)
        {
            const neteaseSetting: NeteaseSetting = {
                quality: 'lossless',
                api: 'xc',
                lyricOption: 'both'
            }
            localStorage.setItem('neteaseSetting', JSON.stringify(neteaseSetting));
        }

    }

    private static setCommonSetting()
    {
        const lsCommonSetting = localStorage.getItem('commonSetting');
        if (!lsCommonSetting)
        {
            const commonSetting = this.getCommonSetting()
            localStorage.setItem('commonSetting', JSON.stringify(commonSetting));
            const cs = new CommonSettings()
            cs.setAgree(commonSetting.TOS.TOSVersion, commonSetting.Privacy.PrivacyVersion)
        } else
        {
            const commonSetting: CommonSettingsInterface = JSON.parse(lsCommonSetting);
            const latestCommonSetting = this.getCommonSetting();
            const tosVersion = commonSetting.TOS.TOSVersion;
            const privacyVersion = commonSetting.Privacy.PrivacyVersion;

            if (
                tosVersion === latestCommonSetting.TOS.TOSVersion &&
                privacyVersion === latestCommonSetting.Privacy.PrivacyVersion &&
                commonSetting.Privacy.PrivacyAgree &&
                commonSetting.TOS.TOSAgree
            )
            {
                return;
            }

            if (tosVersion !== latestCommonSetting.TOS.TOSVersion)
            {
                commonSetting.TOS = latestCommonSetting.TOS;
            }

            if (privacyVersion !== latestCommonSetting.Privacy.PrivacyVersion)
            {
                commonSetting.Privacy = latestCommonSetting.Privacy;
            }

            if (!commonSetting.Privacy.PrivacyAgree || !commonSetting.TOS.TOSAgree)
            {
                const cs = new CommonSettings()
                cs.setAgree(commonSetting.TOS.TOSVersion, commonSetting.Privacy.PrivacyVersion)
            }


            localStorage.setItem('commonSetting', JSON.stringify(commonSetting));

        }
    }

    private static getCommonSetting(): CommonSettingsInterface
    {
        const comminSettings: CommonSettingsInterface = {
            TOS: {
                TOSVersion: '1.0.1',
                TOSAgree: false
            },
            Privacy: {
                PrivacyVersion: '1.0.1',
                PrivacyAgree: false
            }
        }
        return comminSettings;
    }

    private static setPluginSetting()
    {
        const lsPluginSetting = localStorage.getItem('imwPluginSetting');
        if (!lsPluginSetting)
        {
            const pluginSetting: PluginSettingsInterface = {
                chatBox: {
                    isProxyAtInput: true
                }
            }
            localStorage.setItem('imwPluginSetting', JSON.stringify(pluginSetting));
        }
    }

}