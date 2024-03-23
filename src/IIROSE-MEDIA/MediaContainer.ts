import { SendFetch } from "../Api";
import { Music } from "../Platform/Music";
import { IIROSE_MEDIAInput } from "./IIROSE_MEDIAInput";
import { MediaContainerNavBarPlatform, MediaContainerItem } from "./MediaContainerInterface";
import { InputEvent } from "./MediaContainerInterface";
// import { noloadGifBase64 } from "../ImageTools/Gif";
export class MediaContainer
{

    public createMediaCOntainer(platforms: MediaContainerNavBarPlatform[], mediaContainerID: string)
    {
        const MediaContainer = document.createElement('div');
        MediaContainer.id = mediaContainerID;
        MediaContainer.classList.add('MediaContainer');

        const MediaSearchBar = this.createMediaSearchBar(platforms[0].inputEvent, platforms[0].buttonBackgroundColor);
        MediaContainer.appendChild(MediaSearchBar);

        const mediaContainerNavBar = this.createMediaContainerNavBar(platforms);
        MediaContainer.appendChild(mediaContainerNavBar);

        const mediaContainerSubNavBar = this.createMediaContainerSubNavBar(platforms);
        MediaContainer.appendChild(mediaContainerSubNavBar);

        const mediaContainerContent = this.createMediaContainerContent(platforms[0].subNavBarItems[0].item, platforms[0].buttonBackgroundColor);
        MediaContainer.appendChild(mediaContainerContent);

        return MediaContainer;
    }

    private createMediaContainerNavBar(platforms: MediaContainerNavBarPlatform[])
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

    private createMediaContainerSubNavBar(item: MediaContainerNavBarPlatform[])
    {
        const MediaContainerSubNavBar = document.createElement('div');
        MediaContainerSubNavBar.classList.add('MediaContainerSubNavBar');
        MediaContainerSubNavBar.style.backgroundColor = item[0].buttonBackgroundColor;
        item[0].subNavBarItems.forEach((item, index) =>
        {
            const SubNavBarItem = document.createElement('div');
            SubNavBarItem.classList.add('SubNavBarItem');
            SubNavBarItem.id = item.id;
            SubNavBarItem.innerHTML = item.title;
            SubNavBarItem.onclick = () =>
            {
                item.onclick();
                const parent = SubNavBarItem.parentElement;
                if (parent)
                {
                    const siblings = Array.from(parent.children).filter(child => child !== SubNavBarItem);
                    siblings.forEach(sibling => sibling.classList.remove('subNavBarItemActive'));
                    SubNavBarItem.classList.add('subNavBarItemActive');
                }

            };
            if (index === 0)
            {
                SubNavBarItem.classList.add('subNavBarItemActive');
            }
            MediaContainerSubNavBar.appendChild(SubNavBarItem);
        });

        return MediaContainerSubNavBar;
    }

    public createMediaSearchBar(inputEvent: InputEvent, bgColor: string)
    {

        function createInput()
        {
            const inputWrapper = document.createElement('div');
            inputWrapper.classList.add('inputWrapper');

            const inputIcon = document.createElement('div');
            inputIcon.classList.add('inputIcon');

            const input = document.createElement('div');
            input.classList.add('mediaSearchBarInput');
            input.id = 'mediaSearchBarInput';

            inputWrapper.onclick = () =>
            {
                const iiROSE_MEDIAInput = new IIROSE_MEDIAInput();
                iiROSE_MEDIAInput.showIIROSE_MEDIAInput(inputEvent);
            };

            inputWrapper.appendChild(inputIcon);
            inputWrapper.appendChild(input);
            return inputWrapper;
        }

        function createPagination()
        {
            const paginationWrapper = document.createElement('div');
            paginationWrapper.classList.add('paginationWrapper');

            const paginationIcon = document.createElement('div');
            paginationIcon.classList.add('paginationIcon');

            const pagination = document.createElement('div');
            pagination.classList.add('pagination');
            pagination.innerText = '-/-';

            paginationWrapper.appendChild(paginationIcon);
            paginationWrapper.appendChild(pagination);

            return paginationWrapper;
        }

        function createPaginationController()
        {
            const controllerWrapper = document.createElement('div');
            controllerWrapper.classList.add('controllerWrapper');

            const prevButtonWrapper = document.createElement('div');
            prevButtonWrapper.classList.add('prevButtonWrapper');
            prevButtonWrapper.classList.add('PaginationControllerButtonWrapper');
            prevButtonWrapper.id = 'prevButtonWrapper';

            const prevIcon = document.createElement('div');
            prevIcon.classList.add('prevIcon');

            const prevButton = document.createElement('div');
            prevButton.classList.add('prevButton');
            prevButton.classList.add('PaginationControllerButton');
            prevButton.innerText = '上一页';

            prevButtonWrapper.appendChild(prevIcon);
            prevButtonWrapper.appendChild(prevButton);

            const nextButtonWrapper = document.createElement('div');
            nextButtonWrapper.classList.add('nextButtonWrapper');
            nextButtonWrapper.classList.add('PaginationControllerButtonWrapper');
            nextButtonWrapper.id = 'nextButtonWrapper';

            const nextIcon = document.createElement('div');
            nextIcon.classList.add('nextIcon');

            const nextButton = document.createElement('div');
            nextButton.classList.add('nextButton');
            nextButton.classList.add('PaginationControllerButton');

            nextButton.innerText = '下一页';

            nextButtonWrapper.appendChild(nextIcon);
            nextButtonWrapper.appendChild(nextButton);


            controllerWrapper.appendChild(prevButtonWrapper);
            controllerWrapper.appendChild(nextButtonWrapper);
            return controllerWrapper;

        }

        const MediaSearchBar = document.createElement('div');
        MediaSearchBar.classList.add('MediaSearchBar');
        MediaSearchBar.style.backgroundColor = bgColor;

        const input = createInput();
        const pagination = createPagination();
        const controller = createPaginationController();
        MediaSearchBar.appendChild(input);
        MediaSearchBar.appendChild(pagination);
        MediaSearchBar.appendChild(controller);

        return MediaSearchBar;
    }

    public createMediaContainerContent(ppMediaContainerItems: Promise<Promise<MediaContainerItem[] | null>[] | null> | undefined, playColor: string)
    {
        function createContentItem(item: MediaContainerItem)
        {
            function setHeightToWidth()
            {
                const width = contentImg.clientWidth; // 获取元素的实际宽度
                if(width > 0)
                contentImg.style.height = width + 'px'; // 设置高度等于宽度的像素值
            }
            const ContentItem = document.createElement('div');
            ContentItem.classList.add('ContentItem');

            const contentImgCover = document.createElement('div');
            contentImgCover.classList.add('contentImgCover');
            contentImgCover.onclick = () => { window.open(item.url || ''); };

            const contentImg = document.createElement('img');
            contentImg.classList.add('contentImg');

            requestAnimationFrame(setHeightToWidth);
            window.addEventListener('resize', setHeightToWidth);
            // contentImg.src = noloadGifBase64;

            // const sendfetch = new SendFetch();
            const headers = new Headers();
            headers.append('Referer', 'https://music.163.com/');
            headers.append('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            // const httpsImgUrl = item.img.replace(/^http:/, 'https:');
            // sendfetch.sendGet(httpsImgUrl, new URLSearchParams(), headers).then((res) =>
            // {
            //     contentImg.src = item.img;
            // });
            contentImg.src = item.img;
            const infoArea = document.createElement('div');
            infoArea.classList.add('infoArea');

            const contentAuthor = document.createElement('div');
            contentAuthor.classList.add('contentAuthor');
            contentAuthor.innerText = '...';

            Promise.resolve(item.author).then((author) =>
            {
                // 将字符串拆分为单个字符的数组
                const characters = author.split('');
                // 初始化一个空字符串用于逐个添加字符
                let displayedText = '';

                // 逐个字符添加到 contentAuthor.innerText
                characters.forEach((char, index) =>
                {
                    // 使用 setTimeout 设置延迟
                    setTimeout(() =>
                    {
                        displayedText += char;
                        contentAuthor.innerText = displayedText;
                    }, index * (50)); // 设置延迟的时间间隔，这里是每个字符之间的间隔时间
                });
            }).catch((error) =>
            {
                console.error('Error fetching author:', error);
                contentAuthor.innerText = '无法获取'; // 默认值
            });

            const contentDuration = document.createElement('div');
            contentDuration.classList.add('contentDuration');
            contentDuration.innerText = item.duration;


            const contentTitle = document.createElement('div');
            contentTitle.classList.add('contentTitle');
            contentTitle.innerText = item.title;

            if (item.duration)
            {
                const contentDuration = document.createElement('div');
                contentDuration.classList.add('contentDuration');
                contentDuration.innerText = item.duration;
            }


            const contentPlayButton = document.createElement('div');
            contentPlayButton.classList.add('contentPlayButton');
            contentPlayButton.onclick = () =>
            {
                if (item.MediaRequest) item.MediaRequest();
            };

            contentPlayButton.style.color = playColor;

            const playButtonIcon = document.createElement('div');
            playButtonIcon.classList.add('playButtonIcon');

            const playButtonTitle = document.createElement('div');
            playButtonTitle.classList.add('playButtonTitle');
            playButtonTitle.innerText = '点播';

            contentPlayButton.appendChild(playButtonIcon);
            contentPlayButton.appendChild(playButtonTitle);

            infoArea.appendChild(contentTitle);
            infoArea.appendChild(contentAuthor);
            // infoArea.appendChild(contentDuration);

            contentImgCover.appendChild(contentImg);
            contentImgCover.appendChild(contentDuration);
            ContentItem.appendChild(contentImgCover);
            ContentItem.appendChild(infoArea);
            ContentItem.appendChild(contentPlayButton);
            return ContentItem;
        }
        const MediaContainerContent = document.createElement('div');
        MediaContainerContent.classList.add('MediaContainerContent');
        MediaContainerContent.id = 'MediaContainerContent';

        const spin = document.createElement('div');
        spin.classList.add('containerSpin');

        MediaContainerContent.appendChild(spin);
        if (!ppMediaContainerItems) return MediaContainerContent;
        ppMediaContainerItems.then(pMediaContainerItem =>
        {
            if (!pMediaContainerItem) return;
            pMediaContainerItem.forEach(pMediaContainerItem =>
            {
                pMediaContainerItem.then(MediaContainerItem =>
                {
                    if (spin) spin.remove();
                    if (!MediaContainerItem) return;
                    MediaContainerItem.forEach((MediaContainerItem) =>
                    {
                        const ContentItem = createContentItem(MediaContainerItem);
                        ContentItem.style.opacity = '0';
                        MediaContainerContent.appendChild(ContentItem);
                        setTimeout(() =>
                        {
                            ContentItem.style.opacity = '1';
                        }, 1);
                    });

                });

            });
        });

        return MediaContainerContent;
    }

    public updatePagination(currentPage: number, songIds: number[])
    {
        const pagination = document.querySelector('.pagination') as HTMLDivElement;
        const prevButton = document.getElementById('prevButtonWrapper') as HTMLDivElement;
        const nextButton = document.getElementById('nextButtonWrapper') as HTMLDivElement;
        const totalPage = Math.ceil(songIds.length / 10);
        
        if (!pagination || !prevButton || !nextButton) return;
        pagination.innerText = `${currentPage}/${totalPage}`;
        prevButton.onclick = () =>
        {
            const MediaContainerContent = document.getElementById('MediaContainerContent');
            if(!MediaContainerContent) return;
            if (currentPage === 1) return;
            currentPage--
            const parent = MediaContainerContent.parentElement;
            const music = new Music()
            const NeteaseSearchMediaContainerByIDs = music.NeteaseSearchMediaContainerByIDs(currentPage, totalPage, songIds);
            const newMediaContainerContent = this.createMediaContainerContent(NeteaseSearchMediaContainerByIDs, 'rgb(221, 28, 4)');
            pagination.innerText = `${currentPage}/${totalPage}`;
            MediaContainerContent.style.opacity = '0';
            MediaContainerContent.addEventListener('transitionend', () =>
            {
                MediaContainerContent.remove();
                if (parent)
                {
                    
                    newMediaContainerContent.style.opacity = '0';
                    parent.appendChild(newMediaContainerContent);
                    setTimeout(() =>
                    {
                        newMediaContainerContent.style.opacity = '1';
                    }, 1);
                }
            }, { once: true });
        };

        nextButton.onclick = () =>
        {
            const MediaContainerContent = document.getElementById('MediaContainerContent');
            if(!MediaContainerContent) return;
            if (currentPage === totalPage) return;
            currentPage++;
            const parent = MediaContainerContent.parentElement;
            const music = new Music()
            const NeteaseSearchMediaContainerByIDs = music.NeteaseSearchMediaContainerByIDs(currentPage, totalPage, songIds);
            pagination.innerText = `${currentPage}/${totalPage}`;
            const newMediaContainerContent = this.createMediaContainerContent(NeteaseSearchMediaContainerByIDs, 'rgb(221, 28, 4)');
            MediaContainerContent.style.opacity = '0';
            MediaContainerContent.addEventListener('transitionend', () =>
            {
                
                MediaContainerContent.remove();
                
                if (parent)
                {
                    newMediaContainerContent.style.opacity = '0';
                    parent.appendChild(newMediaContainerContent);
                    setTimeout(() =>
                    {
                        newMediaContainerContent.style.opacity = '1';
                    }, 1);
                }
            }, { once: true });
        };

    }

}