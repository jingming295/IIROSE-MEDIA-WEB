import { BilibiliACC } from "../Account/BilibiliAccountInterface";
import { BiliBiliAccount } from "../Account/SetBiliBili";
import { settingContainerItem, SettingContainerNavBarPlatform } from "../IIROSE-MEDIA/MediaContainerInterface";
import { SettingContainer } from "../IIROSE-MEDIA/SettingContainer";
import { Utils } from "../IIROSE/Utils";
import { BilibiliSetting, NeteaseSetting } from "./SettingInterface";

export class Setting
{

    public Setting()
    {
        const platforms: SettingContainerNavBarPlatform[] = [
            this.bilibiliSetting(),
            this.neteaseSetting()
        ];
        return platforms;
    }

    private bilibiliSetting()
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
                        this.createSettingContainerContent(this.bilibiliAccountItem.bind(this)());
                    }
                },
                {
                    title: '视频设置',
                    id: 'SubNavBarItemBilibiliVideo',
                    onclick: () =>
                    {
                        this.createSettingContainerContent(this.bilibiliVideoItem.bind(this)());
                    }
                }
            ]
        };
        return bilibilisetting;
    }

    private bilibiliAccountItem()
    {
        return [
            {
                type: 1,
                title: '账号',
                mdiClass: 'iirose-media-web-account',
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
                            const selectCallback = (htmlElement: HTMLElement, index: string) =>
                            {
                                console.log(`你选择了 ${index}`);
                            };
                            const selectOption = [
                                [
                                    0,
                                    bilibiliAccount.uname,
                                    `<div style="height:100px;width:100px;position:absolute;top:0;left:0;"><div class="bgImgBox"><img class="bgImg" loading="lazy" decoding="async" src="${bilibiliAccount.face}" onerror="this.style.display='none';"><div class="fullBox"></div></div></div>`
                                ]
                            ];
                            utils.buildSelect2(htmlElement, selectOption, selectCallback, false, true, null, false, null, noSelectCallback);
                            return;
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
        ];
    }

    private bilibiliVideoItem()
    {
        return [
            {
                type: 1,
                title: '视频画质',
                mdiClass: 'iirose-media-web-video',
                getSelectOption: () =>
                {
                    const selectOption = [
                        [6, '240P 极速'],
                        [16, '360P 流畅'],
                        [32, '480P 清晰'],
                        [64, '720P 高清'],
                        [74, '720P60 高帧率 (仅供测试)'],
                        [80, '1080P 高清 (仅供测试)'],
                        [112, '1080P+ 高码率 (仅供测试)'],
                        [116, '1080P60 高帧率 (仅供测试)'],
                        [120, '4K 超清 (仅供测试)'],
                        [126, '杜比视界 (仅供测试)'],
                        [127, '8K 超高清 (仅供测试)'],
                    ];

                    const bilibiliSetting = localStorage.getItem('bilibiliSetting');
                    if (bilibiliSetting)
                    {
                        const parseBilibiliSetting:BilibiliSetting = JSON.parse(bilibiliSetting);
                        if(parseBilibiliSetting){
                            const option = selectOption.find((item) => item[0] === parseBilibiliSetting.qn);
                            return option ? [option] : selectOption;
                        }
                    }
                    return selectOption;
                },
                cb: (htmlElement?: HTMLElement) =>
                {
                    const noSelectCallback = () =>
                    {
                        console.log('No Select');
                    };

                    const selectCallback = (htmlElement: HTMLElement, index: string) =>
                    {
                        const bilibiliSetting = localStorage.getItem('bilibiliSetting');
                        if (bilibiliSetting)
                        {
                            const parseBilibiliSetting:BilibiliSetting = JSON.parse(bilibiliSetting);
                            parseBilibiliSetting.qn = parseInt(index);
                            localStorage.setItem('bilibiliSetting', JSON.stringify(parseBilibiliSetting));
                        }
                        const optionText = selectOption.find((item) => item[0] === parseInt(index));
                        if (optionText)
                        {
                            htmlElement.innerText = optionText[1].toString();
                        }

                    };

                    const utils = new Utils();

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
                    utils.buildSelect2(htmlElement, selectOption, selectCallback, false, true, null, false, null, noSelectCallback);
                }
            },
            {
                type: 1,
                title: '直播画质',
                mdiClass: 'iirose-media-web-live',
                getSelectOption: () =>
                {
                    const selectOption = [
                        [250, '超清'],
                        [10000, '原生画质'],
                    ];

                    const bilibiliSetting = localStorage.getItem('bilibiliSetting');
                    if (bilibiliSetting)
                    {
                        const parseBilibiliSetting:BilibiliSetting = JSON.parse(bilibiliSetting);
                        if(parseBilibiliSetting){
                            const option = selectOption.find((item) => item[0] === parseBilibiliSetting.streamqn);
                            return option ? [option] : selectOption;
                        }
                    }
                    return selectOption;
                },
                cb: (htmlElement?: HTMLElement) =>
                {
                    const noSelectCallback = () =>
                    {
                        console.log('No Select');
                    };

                    const selectCallback = (htmlElement: HTMLElement, index: string) =>
                    {
                        const bilibiliSetting = localStorage.getItem('bilibiliSetting');
                        if (bilibiliSetting)
                        {
                            const parseBilibiliSetting:BilibiliSetting = JSON.parse(bilibiliSetting);
                            parseBilibiliSetting.streamqn = parseInt(index);
                            localStorage.setItem('bilibiliSetting', JSON.stringify(parseBilibiliSetting));
                        }
                        const optionText = selectOption.find((item) => item[0] === parseInt(index));
                        if (optionText)
                        {
                            htmlElement.innerText = optionText[1].toString();
                        }

                    };

                    const utils = new Utils();

                    const mdiClass = [
                        'iirose-media-web-play',
                        'iirose-media-web-hdbox',
                    ];

                    const selectOption = [
                        [250, '超清'],
                        [10000, '原生画质'],
                    ];

                    selectOption.forEach((item, index) =>
                    {
                        item.push(`<div class="${mdiClass[index]}" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`);
                    });
                    utils.buildSelect2(htmlElement, selectOption, selectCallback, false, true, null, false, null, noSelectCallback);
                }
            },
            {
                type: 1,
                title: '直播播放时长',
                mdiClass: 'iirose-media-web-time',
                getSelectOption: () =>
                {
                    let selectOption = [
                        [0, 43200/60 + ' 分钟'],
                    ];

                    const bilibiliSetting = localStorage.getItem('bilibiliSetting');
                    if (bilibiliSetting)
                    {
                        const parseBilibiliSetting:BilibiliSetting = JSON.parse(bilibiliSetting);
                        if(parseBilibiliSetting){
                            return [[0, parseBilibiliSetting.streamSeconds/60 + ' 分钟']];
                        }
                    }
                    return selectOption;
                },
                cb: (htmlElement?: HTMLElement) =>
                {
                    const Callback = (userInput:string | null) =>
                    {
                        if(!userInput) return;
                        const minutes = parseInt(userInput || '0');
                        const seconds = minutes * 60;
                        const bilibiliSetting = localStorage.getItem('bilibiliSetting');
                        if (bilibiliSetting)
                        {
                            const parseBilibiliSetting:BilibiliSetting = JSON.parse(bilibiliSetting);
                            
                            parseBilibiliSetting.streamSeconds = seconds;
                            localStorage.setItem('bilibiliSetting', JSON.stringify(parseBilibiliSetting));
                        }
                        const optionText = `${minutes} 分钟`
                        if(htmlElement){
                            htmlElement.innerText = optionText;
                        }
                    };

                    const utils = new Utils();
                    const t = [`请输入直播播放时长 (分钟)`, `number`, 8]

                    utils.sync(2, t, Callback)
                }
            }
        ];
    }

    private neteaseSetting(){
        const neteaseSetting: SettingContainerNavBarPlatform = {
            id: 'NeteaseMusic',
            containerID: 'SettingContainer',
            title: '网易云设置',
            iconsrc: 'https://static.codemao.cn/rose/v0/images/system/media/music/NeteaseMusic/logo.png',
            buttonBackgroundColor: 'rgb(221, 28, 4)',
            subNavBarItems: [
                {
                    title: '音乐设置',
                    id: 'SubNavBarItemNeteaseMusic',
                    onclick: () =>
                    {
                        this.createSettingContainerContent(this.neteaseMusicItem.bind(this)());
                    }
                }
            ]
        };
        return neteaseSetting;
    }

    private neteaseMusicItem(){
        return [
            {
                type: 1,
                title: '音质',
                mdiClass: 'iirose-media-web-music',
                getSelectOption: () =>
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

                    const neteaseSetting = localStorage.getItem('neteaseSetting');
                    if (neteaseSetting)
                    {
                        const parseNeteaseSetting:NeteaseSetting = JSON.parse(neteaseSetting);
                        if(parseNeteaseSetting){
                            const option = selectOption.find((item) => item[0] === parseNeteaseSetting.quality);
                            return option ? [option] : selectOption;
                        }
                    }
                    return selectOption;
                },
                cb: (htmlElement?: HTMLElement) =>
                {
                    const noSelectCallback = () =>
                    {
                        console.log('No Select');
                    };

                    const selectCallback = (htmlElement: HTMLElement, userSelect: string) =>
                    {
                        const neteaseSetting = localStorage.getItem('neteaseSetting');
                        if (neteaseSetting)
                        {
                            const parseNeteaseSetting:NeteaseSetting = JSON.parse(neteaseSetting);
                            parseNeteaseSetting.quality = userSelect as 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires' | 'jyeffect' | 'sky' | 'jymaster';
                            localStorage.setItem('neteaseSetting', JSON.stringify(parseNeteaseSetting));
                        }
                        const optionText = selectOption.find((item) => item[0] === userSelect);
                        if (optionText)
                        {
                            htmlElement.innerText = optionText[1].toString();
                        }

                    };

                    const utils = new Utils();

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
                        ['standard', '标准'],
                        ['higher', '较高'],
                        ['exhigh', '极高'],
                        ['lossless', '无损'],
                        ['hires', 'Hi-Res'],
                        ['jyeffect', '高清环绕声'],
                        ['sky', '沉浸环绕声'],
                        ['jymaster', '超清母带'],
                    ];

                    selectOption.forEach((item, index) =>
                    {
                        item.push(`<div class="${mdiClass[index]}" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`);
                    });
                    utils.buildSelect2(htmlElement, selectOption, selectCallback, false, true, null, false, null, noSelectCallback);
                }
            }
        ];
    }

    private createSettingContainerContent(item: settingContainerItem[])
    {
        const sC = new SettingContainer();
        const settingContainers = document.querySelectorAll('.MediaContainer');
        let settingContainerContent = document.getElementById('SettingContainerContent');

        // 如果有多个设置容器
        if (settingContainers.length > 1)
        {
            settingContainerContent = null;
        }

        // 如果没有设置容器内容
        if (!settingContainerContent)
        {
            const newSettingContainerDiv = sC.createSettingContainerContent(item);
            const settingContainer = settingContainers[1] ? settingContainers[1] : settingContainers[0];
            if (settingContainer)
            {
                newSettingContainerDiv.style.opacity = '0';
                settingContainer.appendChild(newSettingContainerDiv);
                setTimeout(() =>
                {
                    newSettingContainerDiv.style.opacity = '1';
                }, 1);
            }
        } else
        {
            const newSettingContainerDiv = sC.createSettingContainerContent(item);
            const parent = settingContainerContent.parentElement;
            settingContainerContent.style.opacity = '0';
            settingContainerContent.addEventListener('transitionend', () =>
            {
                settingContainerContent.remove();
                const currentsettingContainerDiv = document.getElementById('SettingContainerContent');
                if (currentsettingContainerDiv) return;
                if (parent)
                {
                    newSettingContainerDiv.style.opacity = '0';
                    parent.appendChild(newSettingContainerDiv);
                    setTimeout(() =>
                    {
                        newSettingContainerDiv.style.opacity = '1';
                    }, 1);
                }
            }, { once: true });
        }



    }


}
