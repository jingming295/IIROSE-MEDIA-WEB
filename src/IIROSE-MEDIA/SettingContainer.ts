import { MediaContainerUtils } from "./MediaContainer";
import { settingContainerItem, SettingContainerNavBarPlatform } from "./interfaces/MediaContainerInterface";

export class SettingContainer extends MediaContainerUtils
{
    public createSettingContainer(platforms: SettingContainerNavBarPlatform[], whichPlatform: number = 0)
    {
        let MediaContainer = document.querySelector('.MediaContainer') as HTMLDivElement;
        const mediaContainerNavBar = this.createSettingMediaContainerNavBar(platforms, whichPlatform);
        const mediaContainerSubNavBar = this.createPlatformNavigationBar(platforms, whichPlatform);
        this.updateMediaSearchBar(platforms[whichPlatform].buttonBackgroundColor);
        if (!MediaContainer)
        {
            MediaContainer = document.createElement('div')
            MediaContainer.classList.add('MediaContainer');
            MediaContainer.appendChild(mediaContainerNavBar);
            MediaContainer.appendChild(mediaContainerSubNavBar);
        }

        const iiroseMedia = document.getElementById('IIROSE_MEDIA');
        if (iiroseMedia)
        {
            const observer = new MutationObserver(mutationList =>
                mutationList.filter(m => m.type === 'childList').forEach(m =>
                {
                    m.addedNodes.forEach(node =>
                    {
                        if (node === MediaContainer)
                        {
                            platforms[whichPlatform].subNavBarItems[0].onclick();
                        }
                    });
                }));
            observer.observe(iiroseMedia, { childList: true, subtree: true });
        };
        platforms[whichPlatform].subNavBarItems[0].onclick();
    }

    private updateMediaSearchBar(bgColor: string)
    {
        let MediaSearchBar = document.querySelector('.MediaSearchBar') as HTMLDivElement;
        if (!MediaSearchBar) return;

        MediaSearchBar.style.backgroundColor = bgColor;

        const clild = Array.from(MediaSearchBar.children) as HTMLElement[];

        clild.forEach((element) =>
        {
            element.style.opacity = '0';
            element.style.visibility = 'hidden';
            element.style.pointerEvents = 'none'; // 禁止点击
        });


    }

    private createSettingMediaContainerNavBar(platforms: SettingContainerNavBarPlatform[], whichPlatform: number)
    {
        let PlatFormSelector = document.querySelector('.PlatformSelector') as HTMLDivElement;

        if (!PlatFormSelector)
        {
            PlatFormSelector = document.createElement('div');
            PlatFormSelector.classList.add('PlatformSelector');
        }

        let PlatformButtonGroup = document.querySelectorAll('.PlatformButton') as NodeListOf<HTMLDivElement>;
        if (PlatformButtonGroup.length)
        {
            const platformLength = platforms.length;

            // Convert NodeList to Array to avoid issues with static NodeList
            Array.from(PlatformButtonGroup).forEach((element, index) =>
            {
                if (index >= platformLength)
                {
                    element.parentNode?.removeChild(element);
                }
            });

            // Re-query the DOM to get the updated list of elements
            PlatformButtonGroup = document.querySelectorAll('.PlatformButton') as NodeListOf<HTMLDivElement>;
        }

        platforms.forEach((platform, index) =>
        {
            let PlatformButton: HTMLDivElement;
            let PlatformIcon: HTMLImageElement;
            let PlatformTitle: HTMLDivElement;

            if (!PlatformButtonGroup[index])
            {
                PlatformButton = document.createElement('div');
                PlatformButton.classList.add('PlatformButton');
                PlatformIcon = document.createElement('img');
                PlatformIcon.classList.add('PlatformIcon');
                PlatformTitle = document.createElement('div');
                PlatformTitle.classList.add('PlatformTitle');
                PlatformButton.appendChild(PlatformIcon);
                PlatformButton.appendChild(PlatformTitle);
                PlatFormSelector.appendChild(PlatformButton);
            } else
            {
                PlatformButton = PlatformButtonGroup[index];
                PlatformIcon = PlatformButton.querySelector('.PlatformIcon') as HTMLImageElement;
                PlatformTitle = PlatformButton.querySelector('.PlatformTitle') as HTMLDivElement;
            }

            PlatformButton.id = `${platform.id}Button`;
            PlatformIcon.id = `${platform.id}Icon`;
            PlatformIcon.src = platform.iconsrc;

            PlatformTitle.innerText = platform.title;

            PlatformButton.onclick = () =>
            {
                this.createSettingContainer(platforms, index);
            };

            // 判断是否是第一个 platform
            if (index === whichPlatform)
            {
                PlatformButton.style.opacity = '1';
                PlatFormSelector.style.backgroundColor = platform.buttonBackgroundColor;
            }
        });

        return PlatFormSelector;
    }

    public async createSettingContainerContent(items: settingContainerItem[], parent: HTMLElement)
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
            if (selectOption)
            {
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


        await this.clearMediaContainerContent()
        const SettingContainerContent = document.createElement('div');
        SettingContainerContent.classList.add('MediaContainerContent');
        SettingContainerContent.id = 'MediaContainerContent';
        SettingContainerContent.style.opacity = '0';
        items.forEach((item) =>
        {
            let actionType = '';
            if (item.type === 0) actionType = 'buttonAction';
            if (item.type === 1) actionType = 'textAction';
            const container = createContainerContent(item.title, item?.mdiClass || 'settingIcon', actionType, item.cb, item.getSelectOption);
            SettingContainerContent.appendChild(container);
        });

        parent.appendChild(SettingContainerContent);

        setTimeout(() =>
        {
            SettingContainerContent.style.opacity = '1';
        }, 10);

    }
}