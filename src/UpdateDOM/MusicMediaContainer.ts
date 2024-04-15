import { NeteaseSearchAPI } from "../Api/NeteaseAPI/NeteaseSearch/index";
import { MediaContainer } from "../IIROSE-MEDIA/MediaContainer";
import { MediaContainerNavBarPlatform, MediaContainerItem } from "../IIROSE-MEDIA/MediaContainerInterface";
import { Music } from "../Platform/Music";

export class MusicMediaContainer
{
    public showMusicMediaContainer()
    {
        const prevmediaContainer = document.querySelector('.MediaContainer') as HTMLDivElement | null;
        if (!prevmediaContainer || prevmediaContainer.id === 'MusicContainer') return;

        prevmediaContainer.style.opacity = '0';

        // 添加动画结束事件的监听器
        prevmediaContainer.addEventListener('transitionend', () =>
        {
            prevmediaContainer.remove();
        }, { once: true });

        const MediaContainerWrapper = document.getElementById('MediaContainerWrapper');
        if (!MediaContainerWrapper) return;
        const mediaContainer = new MediaContainer();
        const music = new Music();
        const platforms = music.music();
        const musicMediaContainer = mediaContainer.createMediaCOntainer(platforms, 'MusicContainer');
        // videoMediaContainer.style.transform = 'translateX(10%)';
        musicMediaContainer.style.opacity = '0';

        MediaContainerWrapper.appendChild(musicMediaContainer);

        setTimeout(() =>
        {
            musicMediaContainer.style.opacity = '1';
        }, 1);

    }
}