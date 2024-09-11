// import { MediaContainerUtils } from "../../IIROSE-MEDIA/MediaContainer";
// import { Music } from "../../Platform/Music";

// export class MusicMediaContainer
// {
//     mcu: MediaContainerUtils;
//     constructor(mcu: MediaContainerUtils)
//     {
//         this.mcu = mcu;
//     }

//     public showMusicMediaContainer()
//     {
//         // const prevmediaContainer = document.querySelector('.MediaContainer') as HTMLDivElement | null;
//         // if (!prevmediaContainer || prevmediaContainer.id === 'MusicContainer') return;

//         // prevmediaContainer.style.opacity = '0';

//         // 添加动画结束事件的监听器
//         // prevmediaContainer.addEventListener('transitionend', () =>
//         // {
//         //     prevmediaContainer.remove();
//         // }, { once: true });

//         const MediaContainerWrapper = document.getElementById('MediaContainerWrapper') as HTMLDivElement | null;
//         if (!MediaContainerWrapper) return;
//         const music = new Music(this.mcu);
//         const platforms = music.music();
//         this.mcu.createMediaContainer(platforms);

//         // const musicMediaContainer = mediaContainer.createMediaContainer(platforms);
//         // videoMediaContainer.style.transform = 'translateX(10%)';
//         // musicMediaContainer.style.opacity = '0';

//         // MediaContainerWrapper.appendChild(musicMediaContainer);

//         // setTimeout(() =>
//         // {
//         // musicMediaContainer.style.opacity = '1';
//         // }, 1);

//     }
// }