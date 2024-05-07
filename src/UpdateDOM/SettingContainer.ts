import { SettingContainer } from "../IIROSE-MEDIA/SettingContainer";
import { Setting } from "../Platform/Setting";

export class MediaSettingContainer{

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

        const setting = new Setting()
        const settingPlatforms = setting.Setting();
        const mediaContainer = new SettingContainer();
        const MediaSettingContainer = mediaContainer.createSettingContainer(settingPlatforms,'SettingContainer')
        MediaSettingContainer.style.opacity = '0';

        MediaContainerWrapper.appendChild(MediaSettingContainer);
        setTimeout(() =>
        {
            // videoMediaContainer.style.transform = 'translateX(0)';
            MediaSettingContainer.style.opacity = '1';
        }, 1);

    }
}