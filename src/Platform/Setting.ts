import { SettingContainerNavBarPlatform } from "../IIROSE-MEDIA/MediaContainerInterface";

export class Setting{

    public Setting(){
        const platforms: SettingContainerNavBarPlatform[] = [
            this.bilibilisetting()
        ]
        return platforms
    }

    private bilibilisetting(){
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
                    onclick: () => {
                        console.log('bilibili')
                    },
                    item: [
                        {
                            type: 0,
                            cb: () => {
                                console.log('bilibili')
                            }
                        }
                    ]
                }
            ]
        }
        return bilibilisetting
    }
}
