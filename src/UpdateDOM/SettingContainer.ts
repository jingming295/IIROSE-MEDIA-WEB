import { MediaContainer } from "../IIROSE-MEDIA/MediaContainer";

export class SettingContainer{

    public showSettingContainer(){
        const prevmediaContainer = document.querySelector('.MediaContainer') as HTMLDivElement | null;
        if(!prevmediaContainer || prevmediaContainer.id === 'SettingContainer') return;

        prevmediaContainer.style.opacity = '0';

        // 添加动画结束事件的监听器
        prevmediaContainer.addEventListener('transitionend', () =>
        {
            prevmediaContainer.remove();
        }, { once: true });

        const MediaContainerWrapper = document.getElementById('MediaContainerWrapper');
        if (!MediaContainerWrapper) return;
        const mediaContainer = new MediaContainer();
        const SettingContainer = mediaContainer.createSettingContainer('SettingContainer')
        SettingContainer.style.opacity = '0';

        MediaContainerWrapper.appendChild(SettingContainer);

        setTimeout(() =>
        {
            // videoMediaContainer.style.transform = 'translateX(0)';
            SettingContainer.style.opacity = '1';
        }, 1);

    }
}