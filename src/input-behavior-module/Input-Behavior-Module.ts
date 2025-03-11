import { PluginSettings } from "../settings/pluginSettings/PluginSettings";
import { InputPlatformAnalysis } from "./InputPlatformAnalysis";

export class Input_Behavior_Module
{
    static firstTime = true;
    public static init(changeSearchKeyword: (keyword: string | null) => void, ShowOrHideIMC: () => Promise<void>)
    {
        if (window.Utils)
        {
            const pluginSetting = new PluginSettings();

            const ps = pluginSetting.getPluginSetting();

            if (!window.Utils.IMW?.backup.moveinputDo)
            {
                window.Utils.IMW = {
                    backup: {
                        moveinputDo: window.Utils.service.moveinputDo
                    }
                }
            }

            if (!ps.chatBox.isProxyAtInput)
            {
                window.Utils.service.moveinputDo = window.Utils.IMW.backup.moveinputDo;
            } else
            {
                // 获取原始的 moveinputDo 方法
                const originalMoveInputDo = window.Utils.service.moveinputDo;

                // 替换 moveinputDo 方法为代理方法
                window.Utils.service.moveinputDo = this.changedOriginalMoveInputDo.bind(this, originalMoveInputDo, changeSearchKeyword, ShowOrHideIMC);
            }

        }
    }

    // 代理方法
    public static async changedOriginalMoveInputDo(
        originalMethod: Function,
        changeSearchKeyword: (keyword: string | null) => void,
        ShowOrHideIMC: () => Promise<void>,
        e: string,
        t: undefined)
    {
        if (typeof e === 'string' && e.startsWith('@'))
        {
            const urlPattern = /^(https?:\/\/)/;
            const urlMatch = e.slice(1).match(urlPattern); // 去掉 @ 符号进行匹配
            if (urlMatch)
            {
                InputPlatformAnalysis.Analysis(e, originalMethod);
            }
            else if (
                e.length === 2 && /\p{P}|\p{S}/u.test(e[1]) ||
                window.Probe.getMediaLink ||
                e.length === 1 ||
                e === '@@@'
            )
            {
                return originalMethod(e, t);
            } else
            {
                if (this.firstTime)
                {
                    await ShowOrHideIMC();
                    this.firstTime = false


                } else
                {
                    ShowOrHideIMC();
                }
                changeSearchKeyword(e.slice(1));
            }
        }
        else
        {
            // 调用原始方法
            return originalMethod(e, t);
        }
    }
}

