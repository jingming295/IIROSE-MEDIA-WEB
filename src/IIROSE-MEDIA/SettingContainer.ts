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

    private createSettingContainerContent(item: settingContainerItem[]){

        function createLoginAccountSetting(cb:() => void){
            const LoginAccountSettingWrapper = document.createElement('div');
            LoginAccountSettingWrapper.classList.add('scWrapper');


            const LoginAccountTitle = document.createElement('div');
            LoginAccountTitle.classList.add('scTitle');
            LoginAccountTitle.innerText = '登陆账号: ';

            const LoginButton = document.createElement('div');
            LoginButton.classList.add('scButton');
            LoginButton.innerText = '扫码登录';

            const scHelpText = document.createElement('div');
            scHelpText.classList.add('scHelpText');
            scHelpText.innerText = '扫码登录后可点播720p画质的视频';

            LoginAccountSettingWrapper.appendChild(LoginAccountTitle);
            LoginAccountSettingWrapper.appendChild(LoginButton);
            LoginAccountSettingWrapper.appendChild(scHelpText);

            LoginButton.onclick = cb;

            return LoginAccountSettingWrapper;
        }

        const components = [createLoginAccountSetting]

        const SettingContainerContent = document.createElement('div');
        SettingContainerContent.classList.add('SettingContainerContent');
        
        item.forEach((item, index) => {
            const component = components[item.type];
            if(component){
                if(item.cb)
                SettingContainerContent.appendChild(component(item.cb));
            }
        })

        return SettingContainerContent;
    }

}