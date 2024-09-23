import { IIROSEUtils } from "../../iirose_func/IIROSEUtils";

export interface CommonSettingsInterface
{
    TOS: {
        TOSVersion: string;
        TOSAgree: boolean;
    };
    Privacy: {
        PrivacyVersion: string;
        PrivacyAgree: boolean;
    };
}

export class CommonSettings
{
    iiroseUtils = new IIROSEUtils();

    public setAgree(tosVersion: string, privacyVersion: string)
    {

        const setTOS = (userInput: any) =>
        {
            const commonSetting = localStorage.getItem('commonSetting');
            if (commonSetting)
            {
                const cs: CommonSettingsInterface = JSON.parse(commonSetting);
                cs.TOS.TOSAgree = true;
                localStorage.setItem('commonSetting', JSON.stringify(cs));
            } else
            {
                const cs = {
                    TOS: {
                        TOSVersion: tosVersion,
                        TOSAgree: true
                    },
                    Privacy: {
                        PrivacyVersion: privacyVersion,
                        PrivacyAgree: false
                    }
                }
                localStorage.setItem('commonSetting', JSON.stringify(cs));
            }

            let content = `IIROSE-MEDIA-WEB 隐私政策\n`;
            content += `版本: ${privacyVersion}\n\n`;
            content += `感谢您使用 IIROSE-MEDIA-WEB。我们非常重视您的隐私，并致力于保护您的个人信息。请仔细阅读以下隐私政策：\n\n`;
            content += `1. 本插件不会收集、存储或共享任何个人用户信息。\n`;
            content += `2. 您的所有数据仅在本地设备上处理，我们不会进行任何形式的数据追踪或分析。\n`;
            content += `3. 本插件与第三方服务或平台没有任何数据共享行为。\n`;
            content += `4. 您可以随时删除或停用本插件，且无需担心任何用户数据泄露风险。\n\n`;
            content += `如有任何疑问或建议，请联系我。感谢您的信任与支持！\n`
            const title = [content];
            this.iiroseUtils.sync(0, title, setPrivacy)
        }

        const setPrivacy = (userInput: any) =>
        {
            const commonSetting = localStorage.getItem('commonSetting');
            if (commonSetting)
            {
                const cs: CommonSettingsInterface = JSON.parse(commonSetting);
                cs.Privacy.PrivacyAgree = true;
                localStorage.setItem('commonSetting', JSON.stringify(cs));
            } else
            {
                const cs = {
                    TOS: {
                        TOSVersion: tosVersion,
                        TOSAgree: true
                    },
                    Privacy: {
                        PrivacyVersion: privacyVersion,
                        PrivacyAgree: true
                    }
                }
                localStorage.setItem('commonSetting', JSON.stringify(cs));
            }
        }

        let content = `IIROSE-MEDIA-WEB 用户协议\n`;
        content += `版本: ${tosVersion}\n\n`;
        content += `欢迎使用 IIROSE-MEDIA-WEB！在使用本插件前，请仔细阅读以下条款：\n\n`;
        content += `1. 请合理使用本插件，避免任何形式的滥用行为。\n`;
        content += `2. 希望您能充分体验和享受本插件带来的便捷与乐趣。\n`;
        content += `3. 我将不断改进，期待您的宝贵意见与建议。\n\n`;
        content += `感谢您的支持！\n`;
        const title = [content];
        this.iiroseUtils.sync(0, title, setTOS)
    }

}