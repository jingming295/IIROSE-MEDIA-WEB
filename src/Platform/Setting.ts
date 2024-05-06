import { BilibiliACC } from "../Account/BilibiliAccountInterface";
import { BiliBiliAccount } from "../Account/SetBiliBili";
import { SettingContainerNavBarPlatform } from "../IIROSE-MEDIA/MediaContainerInterface";
import { ShowImage } from "../IIROSE/ShowImg";
import { Utils } from "../IIROSE/Utils";

export class Setting
{

    public Setting()
    {
        const platforms: SettingContainerNavBarPlatform[] = [
            this.bilibilisetting()
        ];
        return platforms;
    }

    private bilibilisetting()
    {
        const bilibilisetting: SettingContainerNavBarPlatform = {
            id: 'BilibiliVideo',
            containerID: 'SettingContainer',
            title: '哔哩哔哩设置',
            iconsrc: 'https://static.codemao.cn/rose/v0/images/system/media/video/bilibili/ic_launcher.png',
            buttonBackgroundColor: 'rgb(209, 79, 118)',
            subNavBarItems: [
                {
                    title: '账号',
                    id: 'SubNavBarItemBilibiliAccount',
                    onclick: () =>
                    {
                        console.log('bilibili');
                    },
                    item: [
                        {
                            type: 1,
                            title: '账号',
                            getSelectOption: () =>
                            {
                                const lsBilibiliAccount = localStorage.getItem('bilibiliAccount');
                                if (lsBilibiliAccount)
                                {
                                    const bilibiliAccount: BilibiliACC = JSON.parse(lsBilibiliAccount);
                                    if (bilibiliAccount.uname && bilibiliAccount.face)
                                    {
                                        return [
                                            [0, bilibiliAccount.uname, `<img src="${bilibiliAccount.face}" style="width:100px;height:100px;border-radius:50%;`]
                                        ];
                                    }
                                }

                                return [
                                    [0, '扫码登录账号']
                                ];
                            },
                            cb: (htmlElement?: HTMLElement) =>
                            {
                                const noSelectCallback = () =>
                                {
                                    console.log('No Select');
                                };
                                const utils = new Utils();

                                const lsBilibiliAccount = localStorage.getItem('bilibiliAccount');
                                if (lsBilibiliAccount)
                                {
                                    const bilibiliAccount: BilibiliACC = JSON.parse(lsBilibiliAccount);
                                    if (bilibiliAccount.uname && bilibiliAccount.face)
                                    {
                                        const selectCallback = (htmlElement: HTMLElement, index: string) =>{
                                            console.log(`你选择了 ${index}`);
                                        }
                                        const selectOption = [
                                            [
                                                0,
                                                bilibiliAccount.uname,
                                                `<div style="height:100px;width:100px;position:absolute;top:0;left:0;"><div class="bgImgBox"><img class="bgImg" loading="lazy" decoding="async" src="${bilibiliAccount.face}" onerror="this.style.display='none';"><div class="fullBox"></div></div></div>`
                                            ]
                                        ];
                                        utils.buildSelect2(htmlElement, selectOption, selectCallback, false, true, null, false, null, noSelectCallback);
                                        return
                                    }
                                }

                                const selectCallback = (htmlElement: HTMLElement, index: string) =>
                                {
                                    if (index === `0`)
                                    {
                                        const bilibiliaccount = new BiliBiliAccount();
                                        const uname = bilibiliaccount.setBiliBiliAccount();
                                        uname.then((res) =>
                                        {
                                            if (res)
                                            {
                                                htmlElement.innerText = res;
                                            }
                                        });
                                    }
                                    const optionText = selectOption.find((item) => item[0] === parseInt(index));
                                    if (optionText)
                                    {
                                        htmlElement.innerText = optionText[1].toString();
                                    }

                                };

                                const f = `<div class="mdi-badge-account-horizontal" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`;

                                const selectOption = [
                                    [0, '扫码登录账号', f]
                                ];
                                utils.buildSelect2(htmlElement, selectOption, selectCallback, false, true, null, false, null, noSelectCallback);
                            }
                        }
                    ]
                }
            ]
        };
        return bilibilisetting;
    }
}
