import { MediaContainer } from "../IIROSE-MEDIA/MediaContainer";
import { MediaContainerNavBarPlatform, MediaContainerItem } from "../IIROSE-MEDIA/MediaContainerInterface";

export class VideoMediaContainer
{
    public showVideoMediaContainer()
    {

        const musicMediaContainer = document.getElementById('MusicContainer');
        if (!musicMediaContainer) return;
        const platforms: MediaContainerNavBarPlatform[] = [
            {
                id: 'BilibiliVideo',
                title: '哔哩哔哩视频',
                iconsrc: 'https://static.codemao.cn/rose/v0/images/system/media/video/bilibili/ic_launcher.png',
                buttonBackgroundColor: 'rgb(209, 79, 118)',
                inputEvent: {
                    title: '搜索视频',
                    InputAreaConfirmBtnOnClick: () =>
                    {
                        console.log('搜索视频')
                    }
                },
                subNavBarItems: [
                    {
                        title: '视频',
                        id: 'SubNavBarItemBilibiliVideo',
                        onclick: () =>{
                            console.log('视频')
                        }
                    },{
                        title: '番剧',
                        id: 'SubNavBarItemBilibiliBangumi',
                        onclick: () =>{
                            console.log('番剧')
                        }
                    },{
                        title: '影视',
                        id: 'SubNavBarItemBilibiliMovie',
                        onclick: () =>{
                            console.log('影视')
                        }
                    },{
                        title: '直播',
                        id: 'SubNavBarItemBilibiliLive',
                        onclick: () =>{
                            console.log('直播')
                        }
                    }
                ]
            }
        ];

        const item = new Promise<MediaContainerItem[] | null>((resolve, reject) =>{return null})

        // musicMediaContainer.style.transform = 'translateX(-10%)';
        musicMediaContainer.style.opacity = '0';

        // 添加动画结束事件的监听器
        musicMediaContainer.addEventListener('transitionend', () =>
        {
            musicMediaContainer.remove();
        }, { once: true });

        const MediaContainerWrapper = document.getElementById('MediaContainerWrapper');
        console.log(MediaContainerWrapper)
        if (!MediaContainerWrapper) return;
        const mediaContainer = new MediaContainer();
        const videoMediaContainer = mediaContainer.createMediaCOntainer(platforms, 'VideoContainer');
        // videoMediaContainer.style.transform = 'translateX(10%)';
        videoMediaContainer.style.opacity = '0';

        MediaContainerWrapper.appendChild(videoMediaContainer);

        setTimeout(() =>
        {
            // videoMediaContainer.style.transform = 'translateX(0)';
            videoMediaContainer.style.opacity = '1';
        }, 1);


    }
}