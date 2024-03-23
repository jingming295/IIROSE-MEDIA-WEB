import { NeteaseSearchAPI } from "../Api/NeteaseAPI/NeteaseSearch/index";
import { MediaContainer } from "../IIROSE-MEDIA/MediaContainer";
import { MediaContainerNavBarPlatform, MediaContainerItem } from "../IIROSE-MEDIA/MediaContainerInterface";
import { Music } from "../Platform/Music";

export class MusicMediaContainer
{

    public showMusicMediaContainer()
    {
        console.log('showMusicMediaContainer');
        const videoMediaContainer = document.getElementById('VideoContainer');
        if (!videoMediaContainer) return;

        const music = new Music()

        const platforms = music.music()

        const neteaseSearch = new NeteaseSearchAPI();
        const item = neteaseSearch.NeteaseRecommandPlayList();

        videoMediaContainer.style.opacity = '0';

        videoMediaContainer.addEventListener('transitionend', () =>
        {
            videoMediaContainer.remove();
        }, { once: true });


        const MediaContainerWrapper = document.getElementById('MediaContainerWrapper');
        if (!MediaContainerWrapper) return;
        const mediaContainer = new MediaContainer();
        const musicMediaContainer = mediaContainer.createMediaCOntainer(platforms, 'MusicContainer');
        // videoMediaContainer.style.transform = 'translateX(10%)';
        musicMediaContainer.style.opacity = '0';

        MediaContainerWrapper.appendChild(musicMediaContainer);

        setTimeout(() =>
        {
            requestAnimationFrame(() => {
                musicMediaContainer.style.opacity = '1';
            });
        }, 1);

        musicMediaContainer.addEventListener('transitionend', () =>{
            console.log('transitionend');
        }, { once: true });

    }
}