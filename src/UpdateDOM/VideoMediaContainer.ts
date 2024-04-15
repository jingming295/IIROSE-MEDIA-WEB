import { MediaContainer } from "../IIROSE-MEDIA/MediaContainer";
import { MediaContainerNavBarPlatform, MediaContainerItem } from "../IIROSE-MEDIA/MediaContainerInterface";
import { Video } from "../Platform/Video";

export class VideoMediaContainer
{
    public showVideoMediaContainer()
    {
        const prevmediaContainer = document.querySelector('.MediaContainer') as HTMLDivElement | null;
        if(!prevmediaContainer || prevmediaContainer.id === 'VideoContainer') return;
        prevmediaContainer.style.opacity = '0';

        // 添加动画结束事件的监听器
        prevmediaContainer.addEventListener('transitionend', () =>
        {
            prevmediaContainer.remove();
        }, { once: true });

        const MediaContainerWrapper = document.getElementById('MediaContainerWrapper');
        if (!MediaContainerWrapper) return;
        const video = new Video();
        const platforms = video.video();
        const mediaContainer = new MediaContainer();
        const videoMediaContainer = mediaContainer.createMediaCOntainer(platforms, 'VideoContainer');
        videoMediaContainer.style.opacity = '0';

        MediaContainerWrapper.appendChild(videoMediaContainer);

        setTimeout(() =>
        {
            // videoMediaContainer.style.transform = 'translateX(0)';
            videoMediaContainer.style.opacity = '1';
        }, 1);


    }
}