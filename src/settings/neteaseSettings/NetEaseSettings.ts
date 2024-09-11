import { IIROSEUtils } from "../../iirose_func/IIROSEUtils";

export interface NeteaseSetting
{
    quality: 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires' | 'jyeffect' | 'sky' | 'jymaster';
}
export class NetEaseSettings
{
    iiroseUtils = new IIROSEUtils();
    public setNeteaseMusicQuality(changeActionTitleAction?: (actionTitle?: string) => void)
    {

        const set = (t: HTMLElement, s: string) =>
        {
            const neteaseSettings = localStorage.getItem('neteaseSetting');

            if (neteaseSettings)
            {
                const neteaseSetting = JSON.parse(neteaseSettings) as NeteaseSetting;
                neteaseSetting.quality = s as 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires' | 'jyeffect' | 'sky' | 'jymaster';
                localStorage.setItem('neteaseSetting', JSON.stringify(neteaseSetting));
            }

            if (changeActionTitleAction)
            {
                const qualityInText = this.parseNetEaseMusicQuality(s);
                changeActionTitleAction(qualityInText);
            }
        }

        const mdiClass = [
            'iirose-media-web-musicNote',
            'iirose-media-web-musicNote',
            'iirose-media-web-musicNote',
            'iirose-media-web-musicNotePlus',
            'iirose-media-web-musicNotePlus',
            'iirose-media-web-surroundSound',
            'iirose-media-web-surroundSound',
            'iirose-media-web-grain',
        ];

        const selectOption = [
            ['standard', '标准音质'],
            ['higher', '较高音质'],
            ['exhigh', '极高音质'],
            ['lossless', '无损音质'],
            ['hires', 'Hi-Res'],
            ['jyeffect', '高清环绕声'],
            ['sky', '沉浸环绕声'],
            ['jymaster', '超清母带'],
        ];

        selectOption.forEach((item, index) =>
        {
            item.push(`<div class="${mdiClass[index]}" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`);
        });

        this.iiroseUtils.buildSelect2(null, selectOption, set, false, true, null, false, null, () => { });

    }

    public getNeteaseMusicSetting(): NeteaseSetting
    {
        const neteaseSetting = localStorage.getItem('neteaseSetting');
        if (neteaseSetting)
        {
            return JSON.parse(neteaseSetting) as NeteaseSetting;
        } else
        {
            return {
                quality: 'lossless'
            };
        }
    }

    public parseNetEaseMusicQuality(quality: string)
    {
        const selectOption = [
            ['standard', '标准音质'],
            ['higher', '较高音质'],
            ['exhigh', '极高音质'],
            ['lossless', '无损音质'],
            ['hires', 'Hi-Res'],
            ['jyeffect', '高清环绕声'],
            ['sky', '沉浸环绕声'],
            ['jymaster', '超清母带'],
        ];

        const optionInText = selectOption.find((option) => option[0] === quality);

        return optionInText ? optionInText[1] : '为止';

    }
}