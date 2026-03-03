import { IIROSEUtils } from "../../iirose_func/IIROSEUtils";
export interface JOOXSetting
{
    api: 'gdstudio' | string; // 明确来源，也可以直接用 string
}
export class JOOXSettings
{
    public static setNeteaseDefaultApi(changeActionTitleAction?: (actionTitle?: string) => void)
    {
        const set = (_t: HTMLElement, s: string) =>
        {
            const jooxsettings = localStorage.getItem('jooxSettings');

            if (jooxsettings)
            {
                const jooxSetting = JSON.parse(jooxsettings) as JOOXSetting;
                jooxSetting.api = s as 'gdstudio';
                localStorage.setItem('jooxSettings', JSON.stringify(jooxSetting));
            }

            if (changeActionTitleAction)
            {
                const apiIntext = this.parseJOOXApi(s);
                changeActionTitleAction(apiIntext);
            }
        }


        const mdiClass = [
            'mdi-rocket-launch-outline',
        ];

        const selectOption = [
            ['gdstudio', 'GDStudio API (https://music-api.gdstudio.xyz)'],
        ];

        selectOption.forEach((item, index) =>
        {
            item.push(`<div class="${mdiClass[index]}" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`);
        });

        IIROSEUtils.buildSelect2(null, selectOption, set, false, true, null, false, null, () => { });


    }

    public static getJOOXSetting(): JOOXSetting
    {
        const jooxSettings = localStorage.getItem('jooxSettings');
        if (jooxSettings)
        {
            return JSON.parse(jooxSettings) as JOOXSetting;
        } else
        {
            const defaultSetting: JOOXSetting = { api: 'gdstudio' };
            localStorage.setItem('jooxSettings', JSON.stringify(defaultSetting));
            return defaultSetting;
        }
    }

    public static parseJOOXApi(api: string)
    {
        const selectOption = [
            ['gdstudio', 'GDStudio API'],
        ];

        const optionInText = selectOption.find((option) => option[0] === api);

        return optionInText ? optionInText[1] : '未知API';
    }

}