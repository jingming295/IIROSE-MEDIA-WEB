import { MediaContainer } from "./MediaContainer";
import { settingContainerItem, SettingContainerNavBarPlatform } from "./MediaContainerInterface";

export class SettingContainer extends MediaContainer
{


    public createSettingContainer(platforms: SettingContainerNavBarPlatform[], mediaContainerID: string, whichPlatform: number = 0)
    {
        const MediaContainer = document.createElement('div');
        MediaContainer.id = mediaContainerID;
        MediaContainer.classList.add('MediaContainer');

        const mediaContainerNavBar = this.createSettingMediaContainerNavBar(platforms);
        MediaContainer.appendChild(mediaContainerNavBar);

        const mediaContainerSubNavBar = this.createMediaContainerSubNavBar(platforms);
        MediaContainer.appendChild(mediaContainerSubNavBar);

        const mediaContainerContent = this.createSettingContainerContent(platforms[whichPlatform].subNavBarItems[0].item);
        MediaContainer.appendChild(mediaContainerContent);



        return MediaContainer;
    }

    private createSettingMediaContainerNavBar(platforms: SettingContainerNavBarPlatform[])
    {
        const PlatFormSelector = document.createElement('div');
        PlatFormSelector.classList.add('PlatformSelector');

        platforms.forEach((platform, index) =>
        {
            const PlatformButton = document.createElement('div');
            PlatformButton.classList.add('PlatformButton');
            PlatformButton.id = `${platform.id}Button`;
            PlatformButton.style.backgroundColor = platform.buttonBackgroundColor;

            const PlatformIcon = document.createElement('img');
            PlatformIcon.classList.add('PlatformIcon');
            PlatformIcon.id = `${platform.id}Icon`;
            PlatformIcon.src = platform.iconsrc;

            const PlatformTitle = document.createElement('div');
            PlatformTitle.classList.add('PlatformTitle');
            PlatformTitle.innerText = platform.title;

            PlatformButton.onclick = () =>
            {
                const prevmediaContainer = Array.from(document.querySelectorAll('.MediaContainer')) as HTMLDivElement[] | null;
                // if (!prevmediaContainer || prevmediaContainer.id === 'MusicContainer') return;
                if (!prevmediaContainer || prevmediaContainer.length > 1) return;
                prevmediaContainer[0].style.opacity = '0';

                // 添加动画结束事件的监听器
                prevmediaContainer[0].addEventListener('transitionend', () =>
                {
                    prevmediaContainer[0].remove();
                }, { once: true });

                const MediaContainerWrapper = document.getElementById('MediaContainerWrapper');
                if (!MediaContainerWrapper) return;
                const sc = new SettingContainer();
                const scc = sc.createSettingContainer(platforms, platform.containerID, index);
                scc.style.opacity = '0';

                MediaContainerWrapper.appendChild(scc);

                setTimeout(() =>
                {
                    scc.style.opacity = '1';
                }, 1);
            };

            PlatformButton.appendChild(PlatformIcon);
            PlatformButton.appendChild(PlatformTitle);
            PlatFormSelector.appendChild(PlatformButton);

            // 判断是否是第一个 platform
            if (index === 0)
            {
                PlatformButton.style.opacity = '1';
                PlatFormSelector.style.backgroundColor = platform.buttonBackgroundColor;
            }
        });

        return PlatFormSelector;
    }

    private createSettingContainerContent(items: settingContainerItem[])
    {

        function createContainerContent(titleText: string, titleIcon: string, actionType: string, cb?: ((htmlElement: HTMLElement) => void), selectOption?: () => (string | number)[][])
        {
            const ContainerContent = document.createElement('div');
            ContainerContent.classList.add('ContainerContent');

            const titleWrapper = document.createElement('div');
            titleWrapper.classList.add('titleWrapper');

            const Icon = document.createElement('div');
            Icon.classList.add('titleIcon');
            Icon.classList.add(titleIcon);

            const title = document.createElement('div');
            title.classList.add('title');
            title.innerText = titleText;

            titleWrapper.appendChild(Icon);
            titleWrapper.appendChild(title);

            const actionWrapper = document.createElement('div');
            actionWrapper.classList.add('actionWrapper');

            const action = document.createElement('div');
            action.classList.add('action');
            action.classList.add(actionType);
            if(selectOption){
                action.innerText = selectOption()[0][1].toString();
            }

            actionWrapper.appendChild(action);
            if (cb)
            {
                actionWrapper.onclick = () =>
                {
                    cb(action);
                };
            }

            ContainerContent.appendChild(titleWrapper);
            ContainerContent.appendChild(actionWrapper);

            return ContainerContent;
        }

        const SettingContainerContent = document.createElement('div');
        SettingContainerContent.classList.add('SettingContainerContent');

        items.forEach((item) =>
        {
            let actionType = '';
            if (item.type === 0) actionType = 'buttonAction';
            if (item.type === 1) actionType = 'textAction';
            const container = createContainerContent(item.title, 'settingIcon', actionType, item.cb, item.getSelectOption);
            SettingContainerContent.appendChild(container);
        });

        return SettingContainerContent;

    }
}