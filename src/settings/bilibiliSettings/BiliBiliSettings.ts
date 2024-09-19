import { BilibiliACC } from "../../Account/BiliBili/BilibiliAccountInterface";
import { BiliBiliAccount } from "../../Account/BiliBili/SetBiliBili";
import { BiliBiliLoginApi } from "../../Api/BilibiliAPI/LoginAPI";
import { IIROSEUtils } from "../../iirose_func/IIROSEUtils";

export interface BilibiliVideoSettings
{
    qn: number,
    streamqn: number,
    streamSeconds: number,
    videoStreamFormat: number,
}

export class BiliBiliSettings
{
    iiroseUtils = new IIROSEUtils();
    bilibiliLoginAPI = new BiliBiliLoginApi()
    public setAccount(changeActionTitleAction?: (actionTitle?: string) => void)
    {
        const login = (t: HTMLElement, s: string) =>
        {
            const handleUserInputCookie = async (input: string | null) =>
            {
                if (!input) return;
                const cookie = input;

                const cookies = this.parseCookie(cookie);
                const navData = await this.bilibiliLoginAPI.getNavUserData(cookies['SESSDATA']);

                // 从 localStorage 获取已有的 bilibiliAccount
                const storedAccount = localStorage.getItem('bilibiliAccount');
                let bilibiliaccount: BilibiliACC = storedAccount ? JSON.parse(storedAccount) : {};

                // 更新 bilibiliAccount 对象中的字段
                bilibiliaccount = {
                    ...bilibiliaccount,
                    DedeUserID: cookies['DedeUserID'] || bilibiliaccount.DedeUserID || '',
                    DedeUserID__ckMd5: cookies['DedeUserID__ckMd5'] || bilibiliaccount.DedeUserID__ckMd5 || '',
                    Expires: cookies['bili_ticket_expires'] || bilibiliaccount.Expires || '',
                    SESSDATA: cookies['SESSDATA'] || bilibiliaccount.SESSDATA || '',
                    bili_jct: cookies['bili_jct'] || bilibiliaccount.bili_jct || '',
                    gourl: cookies['gourl'] || bilibiliaccount.gourl || '',
                    refresh_token: cookies['refresh_token'] || bilibiliaccount.refresh_token || '',
                    uname: navData?.data.uname || bilibiliaccount.uname || '',
                    face: navData?.data.face || bilibiliaccount.face || ''
                };

                // 更新 localStorage 中的值
                localStorage.setItem('bilibiliAccount', JSON.stringify(bilibiliaccount));
                if (changeActionTitleAction)
                {
                    changeActionTitleAction(bilibiliaccount.uname);
                }
            }

            if (s === '0')
            {
                const bilibiliaccount = new BiliBiliAccount();
                const uname = bilibiliaccount.setBiliBiliAccount();

                uname.then((username) =>
                {
                    if (username)
                    {
                        if (changeActionTitleAction)
                        {
                            changeActionTitleAction(username);
                        }
                    }
                })
            }

            if (s === '1')
            {
                this.iiroseUtils.sync(2, ['请输入B站Cookie', 'text', 100000], handleUserInputCookie)
            }
        }

        function logOut(t: HTMLElement, s: string)
        {
            if (s === '1')
            {
                localStorage.removeItem('bilibiliAccount');
                if (changeActionTitleAction)
                {
                    changeActionTitleAction('未登录');
                }
            }
        }



        const bilibiliAccount = this.getBiliBiliAccount();

        if (bilibiliAccount && bilibiliAccount.uname && bilibiliAccount.face)
        {
            const selectOption = [
                [0, bilibiliAccount.uname, `<div style="height:100px;width:100px;position:absolute;top:0;left:0;"><div class="bgImgBox"><img class="bgImg" loading="lazy" decoding="async" src="${bilibiliAccount.face}" onerror="this.style.display='none';"><div class="fullBox"></div></div></div>`],
                [1, '登出账号', `<div class="mdi-logout" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`]
            ]
            this.iiroseUtils.buildSelect2(null, selectOption, logOut, false, true, null, false, null, () => { })
        } else
        {
            const selectOption = [
                [0, '扫码登录账号', `<div class="mdi-qrcode" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`],
                [1, '输入B站Cookie', `<div class="mdi-cookie" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`]
            ]
            this.iiroseUtils.buildSelect2(null, selectOption, login, false, true, null, false, null, () => { })
        }

    }

    public setBilibiliVideoQuality(changeActionTitleAction?: (actionTitle?: string) => void)
    {

        const setBilibiliVideoQuality = (t: HTMLElement, s: string) =>
        {
            const qn = parseInt(s);

            const bilibiliSetting = localStorage.getItem('bilibiliSetting');
            if (bilibiliSetting)
            {
                const parseBilibiliSetting: BilibiliVideoSettings = JSON.parse(bilibiliSetting);
                parseBilibiliSetting.qn = parseInt(s);
                localStorage.setItem('bilibiliSetting', JSON.stringify(parseBilibiliSetting));
            }

            const qnText = this.parseBilibiliVideoQn(qn);

            if (changeActionTitleAction)
            {
                changeActionTitleAction(qnText);
            }

        }
        const mdiClass = [
            'iirose-media-web-play',
            'iirose-media-web-play',
            'iirose-media-web-play',
            'iirose-media-web-hdbox',
            'iirose-media-web-hdbox',
            'iirose-media-web-hdbox',
            'iirose-media-web-hdbox',
            'iirose-media-web-hdbox',
            'iirose-media-web-4kbox',
            'iirose-media-web-dolby',
            'iirose-media-web-grain'
        ];

        const selectOption = [
            [6, '240P 极速'],
            [16, '360P 流畅'],
            [32, '480P 清晰'],
            [64, '720P 高清'],
            [74, '720P60 高帧率'],
            [80, '1080P 高清'],
            [112, '1080P+ 高码率'],
            [116, '1080P60 高帧率'],
            [120, '4K 超清'],
            [126, '杜比视界'],
            [127, '8K 超高清'],
        ];

        selectOption.forEach((item, index) =>
        {
            item.push(`<div class="${mdiClass[index]}" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`);
        });

        this.iiroseUtils.buildSelect2(null, selectOption, setBilibiliVideoQuality, false, true, null, false, null, () => { });
    }

    public setBilibiliLiveQuality(changeActionTitleAction?: (actionTitle?: string) => void)
    {
        const selectOption = [
            [250, '超清'],
            [10000, '原生画质'],
        ];

        const set = (t: HTMLElement, s: string) =>
        {
            const qn = parseInt(s);

            const bilibiliSetting = localStorage.getItem('bilibiliSetting');
            if (bilibiliSetting)
            {
                const parseBilibiliSetting: BilibiliVideoSettings = JSON.parse(bilibiliSetting);
                parseBilibiliSetting.streamqn = parseInt(s);
                localStorage.setItem('bilibiliSetting', JSON.stringify(parseBilibiliSetting));
            }

            const qnText = this.parseBilibiliLiveQn(qn);

            if (changeActionTitleAction)
            {
                changeActionTitleAction(qnText);
            }

        }

        const mdiClass = [
            'iirose-media-web-play',
            'iirose-media-web-hdbox',
        ];

        selectOption.forEach((item, index) =>
        {
            item.push(`<div class="${mdiClass[index]}" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`);
        });

        this.iiroseUtils.buildSelect2(null, selectOption, set, false, true, null, false, null, () => { });


    }

    public setBilibiliStreamSeconds(changeActionTitleAction?: (actionTitle?: string) => void)
    {

        function set(userInput: string | null)
        {
            if (!userInput) return;
            const streamMinutes = parseInt(userInput as string);
            const bilibiliSetting = localStorage.getItem('bilibiliSetting');
            if (bilibiliSetting)
            {
                const parseBilibiliSetting: BilibiliVideoSettings = JSON.parse(bilibiliSetting);
                parseBilibiliSetting.streamSeconds = streamMinutes * 60;
                localStorage.setItem('bilibiliSetting', JSON.stringify(parseBilibiliSetting));
            }

            if (changeActionTitleAction)
            {
                changeActionTitleAction(`${streamMinutes} 分钟`);
            }
        }

        const t = [`请输入直播播放时长 (分钟)`, `number`, 8]

        this.iiroseUtils.sync(2, t, set)

    }

    public setGetVideoFormat(changeActionTitleAction?: (actionTitle?: string) => void)
    {

        const set = (t: HTMLElement, s: string) =>
        {
            const format = parseInt(s);

            const bilibiliSetting = localStorage.getItem('bilibiliSetting');
            if (bilibiliSetting)
            {
                const parseBilibiliSetting: BilibiliVideoSettings = JSON.parse(bilibiliSetting);
                parseBilibiliSetting.videoStreamFormat = parseInt(s);
                localStorage.setItem('bilibiliSetting', JSON.stringify(parseBilibiliSetting));
            }

            const formatText = this.parseGetVideoFormat(format);

            if (changeActionTitleAction)
            {
                changeActionTitleAction(formatText);
            }

        }

        const selectOption = [
            [0, 'durl - 音频视频不分离，最高720p画质'],
            [1, 'dash - 视频音频分离，可以获取高画质'],
            [2, '混合 (高于720p自动使用dash)']
        ];

        const mdiClass = [
            'iirose-media-web-play',
            'iirose-media-web-hdbox',
            `iirose-media-web-mixed`
        ];

        selectOption.forEach((item, index) =>
        {
            item.push(`<div class="${mdiClass[index]}" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`);
        });

        this.iiroseUtils.buildSelect2(null, selectOption, set, false, true, null, false, null, () => { })
    }

    public getBiliBiliAccount()
    {
        const bilibiliaccount = localStorage.getItem('bilibiliAccount')
        if (bilibiliaccount)
        {
            return JSON.parse(bilibiliaccount) as BilibiliACC
        } else
        {
            return null
        }
    }

    public getBilibiliVideoSettings(): BilibiliVideoSettings
    {
        const lsBiliBiliSetting = localStorage.getItem('bilibiliSetting');
        if (lsBiliBiliSetting)
        {
            return JSON.parse(lsBiliBiliSetting) as BilibiliVideoSettings;
        } else
        {
            return {
                qn: 112,
                streamqn: 10000,
                streamSeconds: 43200,
                videoStreamFormat: 2
            };
        }
    }

    public parseBilibiliVideoQn(qn: number)
    {
        const selectOption = [
            [6, '240P 极速'],
            [16, '360P 流畅'],
            [32, '480P 清晰'],
            [64, '720P 高清'],
            [74, '720P60 高帧率'],
            [80, '1080P 高清'],
            [112, '1080P+ 高码率'],
            [116, '1080P60 高帧率'],
            [120, '4K 超清'],
            [126, '杜比视界'],
            [127, '8K 超高清'],
        ];

        const selectedOption = selectOption.find((option) => option[0] === qn);
        if (selectedOption)
        {
            return selectedOption[1] as string;
        } else
        {
            return '未知';
        }
    }

    public parseBilibiliLiveQn(qn: number)
    {
        const selectOption = [
            [250, '超清'],
            [10000, '原生画质'],
        ];

        const selectedOption = selectOption.find((option) => option[0] === qn);
        if (selectedOption)
        {
            return selectedOption[1] as string;
        } else
        {
            return '未知';
        }
    }

    public parseGetVideoFormat(format: number)
    {
        const selectOption = [
            [0, 'durl - 音频视频不分离，最高720p画质'],
            [1, 'dash - 视频音频分离，可以获取高画质'],
            [2, '混合']
        ];

        const selectedOption = selectOption.find((option) => option[0] === format);

        if (selectedOption)
        {
            return selectedOption[1] as string;
        } else
        {
            return '未知';
        }
    }

    public parseCookie(cookie: string)
    {
        return cookie.split('; ').reduce((acc: Record<string, string>, part) =>
        {
            const [key, value] = part.split('=');
            acc[key] = decodeURIComponent(value);
            return acc;
        }, {});
    }

}




