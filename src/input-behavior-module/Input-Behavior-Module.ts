import { PluginSettings } from "../settings/pluginSettings/PluginSettings";
import { InputPlatformAnalysis } from "./InputPlatformAnalysis";

/**
 * 代理 @ 事件的模块
 */
export class Input_Behavior_Module
{
    static firstTime = true;

    public static init(changeSearchKeyword: (keyword: string | null) => void, ShowOrHideIMC: () => Promise<void>)
    {
        if (!window.Utils) return;

        // 1. 确保原始方法只备份一次
        if (!window.Utils.IMW?.backup.moveinputDo)
        {
            window.Utils.IMW = {
                backup: {
                    moveinputDo: window.Utils.service.moveinputDo
                }
            };
        }

        // 2. 执行应用逻辑
        this.applyBehavior(changeSearchKeyword, ShowOrHideIMC);
    }

    /**
     * 拆分出来的应用逻辑：可以被外部多次调用以更新状态
     */
    public static applyBehavior(changeSearchKeyword: (keyword: string | null) => void, ShowOrHideIMC: () => Promise<void>)
    {
        if (!window.Utils || !window.Utils.IMW) return; // 1. 显式检查 IMW 是否存在

        const ps = PluginSettings.getPluginSetting();

        // 2. 使用非空断言 ! 告诉 TS 你确定 backup 此时一定存在
        const backupMethod = window.Utils.IMW.backup.moveinputDo;

        if (!ps.chatBox.isProxyAtInput)
        {
            // 还原回备份的原始方法
            window.Utils.service.moveinputDo = backupMethod;
        } else
        {
            // 绑定代理逻辑
            window.Utils.service.moveinputDo = this.changedOriginalMoveInputDo.bind(
                this,
                backupMethod,
                changeSearchKeyword,
                ShowOrHideIMC
            );
        }
    }

    // 代理方法逻辑保持不变
    public static async changedOriginalMoveInputDo(
        originalMethod: Function,
        changeSearchKeyword: (keyword: string | null) => void,
        ShowOrHideIMC: () => Promise<void>,
        e: string,
        t: undefined
    )
    {
        if (typeof e === 'string' && e.startsWith('@'))
        {
            const urlPattern = /^(https?:\/\/)/;
            const urlMatch = e.slice(1).match(urlPattern);
            if (urlMatch)
            {
                InputPlatformAnalysis.Analysis(e, originalMethod);
            }
            else if (
                (e.length === 2 && /\p{P}|\p{S}/u.test(e[1])) ||
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
                    this.firstTime = false;
                } else
                {
                    ShowOrHideIMC();
                }
                changeSearchKeyword(e.slice(1));
            }
        } else
        {
            return originalMethod(e, t);
        }
    }
}