import { IIROSEUtils } from "../../iirose_func/IIROSEUtils";

export interface NeteaseSetting
{
    quality: 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires' | 'jyeffect' | 'sky' | 'jymaster';
    api: 'default' | 'xc' | 'theresa';
    lyricOption: 'off' | 'original' | 'translated' | 'both';
}
export class NetEaseSettings
{
    iiroseUtils = new IIROSEUtils();
    public setNeteaseMusicQuality(changeActionTitleAction?: (actionTitle?: string) => void)
    {

        const set = (_t: HTMLElement, s: string) =>
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
            'mdi-music-note',
            'mdi-music-note',
            'mdi-music-note',
            'mdi-music-note-plus',
            'mdi-music-note-plus',
            'mdi-surround-sound-7-1',
            'mdi-surround-sound-7-1',
            'mdi-grain',
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

    public setNeteaseDefaultApi(changeActionTitleAction?: (actionTitle?: string) => void)
    {
        const set = (_t: HTMLElement, s: string) =>
        {
            const neteaseSettings = localStorage.getItem('neteaseSetting');

            if (neteaseSettings)
            {
                const neteaseSetting = JSON.parse(neteaseSettings) as NeteaseSetting;
                neteaseSetting.api = s as 'default' | 'xc' | 'theresa';
                localStorage.setItem('neteaseSetting', JSON.stringify(neteaseSetting));
            }

            if (changeActionTitleAction)
            {
                const apiIntext = this.parseNetEaseMusicApi(s);
                changeActionTitleAction(apiIntext);
            }
        }


        const mdiClass = [
            'mdi-rocket-launch-outline',
            'mdi-grass',
            'mdi-firefox',
        ];

        const selectOption = [
            ['default', '网易云默认API（最快）'],
            ['xc', '小草的API（稳定）'],
            ['theresa', '苏苏的API（最稳定）'],
        ];

        selectOption.forEach((item, index) =>
        {
            item.push(`<div class="${mdiClass[index]}" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`);
        });

        this.iiroseUtils.buildSelect2(null, selectOption, set, false, true, null, false, null, () => { });


    }

    public setNeteaseMusicLyric(changeActionTitleAction?: (actionTitle?: string) => void)
    {
        const set = (_t: HTMLElement, s: string) =>
        {
            const neteaseSettings = localStorage.getItem('neteaseSetting');

            if (neteaseSettings)
            {
                const neteaseSetting = JSON.parse(neteaseSettings) as NeteaseSetting;
                neteaseSetting.lyricOption = s as 'off' | 'original' | 'translated' | 'both';
                localStorage.setItem('neteaseSetting', JSON.stringify(neteaseSetting));
            }

            if (changeActionTitleAction)
            {
                const lyricOptionInText = this.parseNetEaseMusicLyricOption(s);
                changeActionTitleAction(lyricOptionInText);
            }
        }

        const mdiClass = [
            'mdi-close',
            'mdi-book-open-variant',
            'mdi-translate',
            'mdi-book-open-variant',
        ];

        const selectOption = [
            ['off', '关闭歌词'],
            ['original', '原文歌词'],
            ['translated', '翻译歌词'],
            ['both', '原文 + 翻译歌词'],
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
                quality: 'lossless',
                api: 'default',
                lyricOption: 'both',
            }
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

    public parseNetEaseMusicApi(api: string)
    {
        const selectOption = [
            ['default', '网易云默认API（最快）'],
            ['xc', '小草的API（稳定）'],
            ['theresa', '苏苏的API（最稳定）']
        ];

        const optionInText = selectOption.find((option) => option[0] === api);

        return optionInText ? optionInText[1] : '网易云默认API（最快）';
    }

    public parseNetEaseMusicLyricOption(lyricOption: string)
    {
        const selectOption = [
            ['off', '关闭歌词'],
            ['original', '原文歌词'],
            ['translated', '翻译歌词'],
            ['both', '原文 + 翻译歌词']
        ];

        const optionInText = selectOption.find((option) => option[0] === lyricOption);

        return optionInText ? optionInText[1] : '原文 + 翻译歌词';
    }
}