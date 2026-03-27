import { IIROSEUtils } from "../../iirose_func/IIROSEUtils";


export interface RadioSetting
{
    duration: number; // 单位秒
}


export class RadioSettings
{


    public static setRadioStreamSeconds(changeActionTitleAction?: (actionTitle?: string) => void)
    {
        function set(userInput: string | null)
        {
            if (!userInput) return;
            const streamMinutes = parseInt(userInput as string);
            const radioSetting = localStorage.getItem('radioSettings');
            if (radioSetting)
            {
                const parseRadioSetting = JSON.parse(radioSetting) as RadioSetting;

                parseRadioSetting.duration = streamMinutes * 60;
                localStorage.setItem('radioSettings', JSON.stringify(parseRadioSetting));
            }

            if (changeActionTitleAction)
            {
                changeActionTitleAction(`${streamMinutes} 分钟`);
            }
        }

        const t = [`请输入电台播放时长 (分钟)`, `number`, 8]

        IIROSEUtils.sync(2, t, set)

    }


    public static getRadioSettings(): RadioSetting
    {
        const radioSettings = localStorage.getItem('radioSettings');
        if (radioSettings)
        {
            return JSON.parse(radioSettings) as RadioSetting;
        } else
        {
            const defaultSetting: RadioSetting = { duration: 43200 };
            localStorage.setItem('radioSettings', JSON.stringify(defaultSetting));
            return defaultSetting;
        }
    }
}