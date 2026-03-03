import { IIROSEUtils } from "../../iirose_func/IIROSEUtils";
import { Input_Behavior_Module } from "../../input-behavior-module/Input-Behavior-Module";

export interface PluginSettingsInterface
{
    chatBox: {
        isProxyAtInput: boolean;
    }
    defaultPage: number;
}

export class PluginSettings
{

    public static isProxyAtInputSetting(changeActionTitleAction: (actionTitle?: string) => void, changeSearchKeyword: (keyword: string | null) => void, ShowOrHideIMC: () => Promise<void>)
    {
        const pluginSettings = PluginSettings.getPluginSetting();

        pluginSettings.chatBox.isProxyAtInput = !pluginSettings.chatBox.isProxyAtInput;
        localStorage.setItem('imwPluginSetting', JSON.stringify(pluginSettings));

        if (changeActionTitleAction)
        {
            changeActionTitleAction(pluginSettings.chatBox.isProxyAtInput ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off-outline');
        }
        Input_Behavior_Module.applyBehavior(changeSearchKeyword, ShowOrHideIMC);
    }

    public static setDefaultPage(changeActionTitleAction?: (actionTitle?: string) => void)
    {


        const set = (_t: HTMLElement, s: string) =>
        {
            const ps = PluginSettings.getPluginSetting();
            const inputint = parseInt(s);
            if (ps)
            {
                ps.defaultPage = inputint;
                localStorage.setItem('imwPluginSetting', JSON.stringify(ps));
            }

            if (changeActionTitleAction)
            {
                const qualityInText = PluginSettings.parseDefaultPage(inputint);
                changeActionTitleAction(qualityInText);
            }
        }

        const mdiClass = [
            'mdi-music',
            'mdi-video',
        ];

        const selectOption = [
            [0, '音乐'],
            [1, '视频'],
        ];

        selectOption.forEach((item, index) =>
        {
            item.push(`<div class="${mdiClass[index]}" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`);
        });

        IIROSEUtils.buildSelect2(null, selectOption, set, false, true, null, false, null, () => { });


    }
    public static parseDefaultPage(page: number): string
    {
        const selectOption: [number, string][] = [
            [0, '音乐'],
            [1, '视频'],
        ];

        const optionInText = selectOption.find((option) => option[0] === page);

        return optionInText ? optionInText[1] : '音乐';
    }

    public static getPluginSetting(): PluginSettingsInterface
    {
        const pluginSettings = localStorage.getItem('imwPluginSetting');
        if (pluginSettings)
        {
            return JSON.parse(pluginSettings) as PluginSettingsInterface;
        }
        return {
            chatBox: {
                isProxyAtInput: true
            },
            defaultPage: 0
        }
    }

}