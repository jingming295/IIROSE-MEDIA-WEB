import { MediaContainerUtils } from "../../IIROSE-MEDIA/MediaContainer";
import { Video } from "../../Platform/Video";

export class VideoMediaContainer
{
    public showVideoMediaContainer(mcu: MediaContainerUtils)
    {
        // const prevmediaContainer = document.querySelector('.MediaContainer') as HTMLDivElement | null;
        // if (!prevmediaContainer || prevmediaContainer.id === 'VideoContainer') return;
        // prevmediaContainer.style.opacity = '0';

        // // 添加动画结束事件的监听器
        // prevmediaContainer.addEventListener('transitionend', () =>
        // {
        //     prevmediaContainer.remove();
        // }, { once: true });
        const MediaContainerWrapper = document.getElementById('MediaContainerWrapper') as HTMLDivElement | null;
        if (!MediaContainerWrapper) return;
        const video = new Video(mcu);
        const platforms = video.createVideoPlatform();
        const videoMediaContainer = mcu.createMediaContainer(platforms);
        // videoMediaContainer.style.opacity = '0';

        // MediaContainerWrapper.appendChild(videoMediaContainer);

        // setTimeout(() =>
        // {
        //     videoMediaContainer.style.opacity = '1';
        // }, 1);


    }
}