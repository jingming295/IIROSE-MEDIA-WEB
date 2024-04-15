import { Music } from "../Platform/Music";
import { Video } from "../Platform/Video";
import { IIROSE_MEDIAInput } from "./IIROSE_MEDIAInput";
import { MediaContainerNavBarPlatform, MediaContainerItem, MediaItem } from "./MediaContainerInterface";
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
            if (item.class) SubNavBarItem.classList.add(item.class);
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

    public createMediaSearchBar(inputEvent: InputEvent, bgColor: string, id?: string)
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
        MediaSearchBar.id = id || 'CommonMediaSearchBar';

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
                const width = contentImgCover.clientWidth; // 获取元素的实际宽度
                if (width > 0)
                    contentImgCover.style.height = width + 'px'; // 设置高度等于宽度的像素值
            }
            const observer = new IntersectionObserver(entries =>
            {
                entries.forEach(entry =>
                {
                    if (entry.isIntersecting)
                    {
                        // 当 contentImgCover 进入视口时调用 setHeightToWidth
                        requestAnimationFrame(setHeightToWidth);

                        // 停止观察，因为我们只关心第一次出现在视口中的情况
                        observer.unobserve(entry.target);
                    }
                });
            });
            const ContentItem = document.createElement('div');
            ContentItem.classList.add('ContentItem');

            const contentImgCover = document.createElement('div');
            contentImgCover.classList.add('contentImgCover');
            contentImgCover.onclick = () => { window.open(item.url || ''); };

            const contentImg = document.createElement('img');
            contentImg.classList.add('contentImg');

            observer.observe(contentImgCover);
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

            if (item.multipage)
            {
                Promise.resolve(item.multipage).then((multipage) =>
                {
                    if (multipage)
                    {
                        playButtonIcon.classList.remove('playButtonIcon');
                        playButtonIcon.classList.add('pickButtonIcon');
                        playButtonTitle.innerText = '';
                        let index = 0;
                        const text = '选集';
                        const interval = 100;
                        const timer = setInterval(() =>
                        {
                            playButtonTitle.innerText += text[index];
                            index++;
                            if (index >= text.length)
                            {
                                clearInterval(timer);
                            }
                        }, interval);
                    }
                });
            }


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

        MediaContainerContent.style.height = '100%';
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
                    MediaContainerContent.style.height = '';
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

    public goMultiPage(container: HTMLDivElement | null, mediaItems: MediaItem[], rgb: string)
    {
        function createPaginationController()
        {
            const multipageControllerWrapper = document.createElement('div');
            multipageControllerWrapper.classList.add('controllerWrapper');
            multipageControllerWrapper.classList.add('multipageComponent');

            const returnButtonWrapper = document.createElement('div');
            returnButtonWrapper.classList.add('returnButtonWrapper');
            returnButtonWrapper.classList.add('PaginationControllerButtonWrapper');
            returnButtonWrapper.id = 'returnButtonWrapper';

            const returnIcon = document.createElement('div');
            returnIcon.classList.add('returnIcon');

            const returnButton = document.createElement('div');
            returnButton.classList.add('returnButton');
            returnButton.classList.add('PaginationControllerButton');
            returnButton.innerText = '返回';

            returnButtonWrapper.appendChild(returnIcon);
            returnButtonWrapper.appendChild(returnButton);

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

            multipageControllerWrapper.appendChild(returnButtonWrapper);
            multipageControllerWrapper.appendChild(prevButtonWrapper);
            multipageControllerWrapper.appendChild(nextButtonWrapper);

            returnButtonWrapper.onclick = () =>
            {
                multipageControllerWrapper.style.opacity = '0';
                paginationTextDiv.textContent = paginationText;
                multipageControllerWrapper.addEventListener('transitionend', () =>
                {
                    subNavBarItems.forEach(item =>
                    {
                        item.style.display = '';
                        item.style.opacity = '';
                    });
                    subnavbaritemPlaceHolder.remove();
                    multipageControllerWrapper.remove();
                    inputWrapper.style.display = '';
                    controllerWrapper.style.display = '';

                    inputWrapper.style.opacity = '';
                    controllerWrapper.style.opacity = '';
                    subNavBar.style.opacity = '';
                }, { once: true });

                const MediaContainerContentCollection = Array.from(document.querySelectorAll('.MediaContainerContent')) as HTMLDivElement[];
                // 这里判断如果有一个以上，就是进入分集了
                if (MediaContainerContentCollection.length > 1)
                {
                    const multipageMediaContainerContentI = MediaContainerContentCollection[1];
                    multipageMediaContainerContentI.style.opacity = '0';
                    multipageMediaContainerContentI.addEventListener('transitionend', () =>
                    {
                        multipageMediaContainerContentI.remove();
                        mediaContainerContent.style.display = '';
                        setTimeout(() =>
                        {
                            mediaContainerContent.style.opacity = '1';
                        }, 1);
                    });
                }

            };

            return multipageControllerWrapper;
        }
        if (!container) return;
        const items = Array.from(container.children) as HTMLElement[];
        const mediasearchBar = items[0];
        const subNavBar = items[2];

        const subnavbaritemPlaceHolder = document.createElement('div');
        const video = new Video();

        subnavbaritemPlaceHolder.classList.add('subNavBarItemPlaceHolder');
        subNavBar.appendChild(subnavbaritemPlaceHolder);

        const subNavBarItems = Array.from(subNavBar.children) as HTMLElement[];

        const mediaContainerContent = items[3];

        const mediasearchBarSubItem = Array.from(mediasearchBar.children) as HTMLElement[];

        const inputWrapper = mediasearchBarSubItem[0];

        const paginationWrapper = mediasearchBarSubItem[1];

        const paginationTextDiv = paginationWrapper.children[1] as HTMLDivElement;

        const paginationText = paginationTextDiv.innerText;

        const controllerWrapper = mediasearchBarSubItem[2];

        inputWrapper.style.opacity = '0';

        controllerWrapper.style.opacity = '0';

        mediaContainerContent.style.opacity = '0';

        const mediacontaineritem = video.bilibiliVideoMediaContainerItemByCids(1, mediaItems);
        const multipageMediaContainerContent = this.createMediaContainerContent(mediacontaineritem, rgb);

        subNavBarItems.forEach(item =>
        {
            if (item.classList.contains('subNavBarItemPlaceHolder')) return;
            item.style.opacity = '0';
            item.addEventListener('transitionend', () =>
            {
                item.style.display = 'none';
            }, { once: true });

        });

        controllerWrapper.addEventListener('transitionend', () =>
        {
            inputWrapper.style.display = 'none';
            controllerWrapper.style.display = 'none';

            const multipageComponent = createPaginationController();
            mediasearchBar.appendChild(multipageComponent);
            this.updatePaginationBilibiliMultiPageVideo(1, mediaItems);
        }, { once: true });

        mediaContainerContent.addEventListener('transitionend', () =>
        {
            mediaContainerContent.style.display = 'none';
            multipageMediaContainerContent.style.opacity = '0';
            container.appendChild(multipageMediaContainerContent);
            setTimeout(() =>
            {
                multipageMediaContainerContent.style.opacity = '1';
            }, 1);
        }, { once: true });

    }

    public updatePaginationNeteasePlayList(currentPage: number, mediaItems: MediaItem[])
    {
        const music = new Music();
        this.PaginationAction(currentPage, mediaItems, music.NeteaseRecommendSongListMediaContainerItemByIDs.bind(music));
    }

    public updatePaginationNeteaseMusic(currentPage: number, mediaItems: MediaItem[])
    {
        const music = new Music();
        this.PaginationAction(currentPage, mediaItems, music.NeteaseSearchMediaContainerByIDs.bind(music));
    }

    public updatePaginationBilibiliRCMDVideo(currentPage: number, mediaItems: MediaItem[])
    {
        const video = new Video();
        this.PaginationAction(currentPage, mediaItems, video.bilibiliVideoMediaContainerItemByIDs.bind(video));
    }

    public updatePaginationBilibiliSearchVideo(currentPage: number, mediaItems: MediaItem[])
    {
        const video = new Video();
        this.PaginationAction(currentPage, mediaItems, video.bilibiliSearchMediaContainerItemByKeyword.bind(video));
    }

    public updatePaginationBilibiliMultiPageVideo(currentPage: number, mediaItems: MediaItem[])
    {
        const video = new Video();
        this.PaginationAction(currentPage, mediaItems, video.bilibiliVideoMediaContainerItemByCids.bind(video));
    }

    public updatePaginationNotings()
    {
        this.PaginationAction();
    }

    private PaginationAction(
        currentPage?: number,
        mediaItems?: MediaItem[],
        func?: (
            currentPage: number,
            mediaItem: MediaItem[]
        ) => Promise<Promise<MediaContainerItem[] | null>[]>
    )
    {
        let pagination: HTMLDivElement | undefined = undefined;
        let prevButton: HTMLDivElement | undefined = undefined;
        let nextButton: HTMLDivElement | undefined = undefined;

        const paginationList = Array.from(document.querySelectorAll('.pagination')) as HTMLDivElement[];
        const prevButtonList = Array.from(document.querySelectorAll('.prevButtonWrapper')) as HTMLDivElement[];
        const nextButtonList = Array.from(document.querySelectorAll('.nextButtonWrapper')) as HTMLDivElement[];
        if (paginationList.length > 1)
        {
            // 使用 for...of 循环遍历 NodeListOf
            for (const item of paginationList)
            {
                if (item.parentElement?.parentElement?.parentElement?.style.opacity === '1')
                {
                    pagination = item;
                    break; // 找到符合条件的元素后立即退出循环
                }
            }

            for (const item of prevButtonList)
            {
                if (item.parentElement?.parentElement?.parentElement?.style.opacity === '1')
                {
                    prevButton = item;
                    break; // 找到符合条件的元素后立即退出循环
                }
            }

            for (const item of nextButtonList)
            {
                if (item.parentElement?.parentElement?.parentElement?.style.opacity === '1')
                {
                    nextButton = item;
                    break; // 找到符合条件的元素后立即退出循环
                }
            }
        } else
        {
            pagination = paginationList[0];

            // 这里判断如果有一个以上，就是进入分集了
            if (prevButtonList.length > 1 && nextButtonList.length > 1)
            {
                prevButton = prevButtonList[1];
                nextButton = nextButtonList[1];
            } else
            {
                prevButton = prevButtonList[0];
                nextButton = nextButtonList[0];
            }
        }

        if(!pagination || !prevButton || !nextButton) return;

        if (func && currentPage && mediaItems)
        {
            const totalPage = Math.ceil(mediaItems.length / 10);
            pagination.innerText = `${currentPage}/${totalPage}`;
            prevButton.onclick = () =>
            {
                if (!currentPage) return;
                const MediaContainerContentCollection = Array.from(document.querySelectorAll('.MediaContainerContent')) as HTMLDivElement[];
                let MediaContainerContent: HTMLDivElement | undefined = undefined;
                // 这里判断如果有一个以上，就是进入分集了
                if (MediaContainerContentCollection.length > 1)
                {
                    MediaContainerContent = MediaContainerContentCollection[1];
                } else
                {
                    MediaContainerContent = MediaContainerContentCollection[0];
                }
                if (!MediaContainerContent) return;
                if (currentPage === 1) return;
                currentPage--;
                const parent = MediaContainerContent.parentElement;

                const NeteaseSearchMediaContainerByIDs = func(currentPage, mediaItems);
                const newMediaContainerContent = this.createMediaContainerContent(NeteaseSearchMediaContainerByIDs, 'rgb(221, 28, 4)');
                pagination.innerText = `${currentPage}/${totalPage}`;
                MediaContainerContent.style.opacity = '0';
                MediaContainerContent.addEventListener('transitionend', () =>
                {
                    MediaContainerContent.remove();
                    // 这里判断如果有一个以上，就是进入分集了
                    if (MediaContainerContentCollection.length === 1)
                    {
                        const currentMediaContainerContent = document.getElementById('MediaContainerContent');
                        if (currentMediaContainerContent) return;
                    } else
                    {
                        const currentMediaContainerContent = Array.from(document.querySelectorAll('.MediaContainerContent')) as HTMLDivElement[];
                        if (currentMediaContainerContent.length > 1) return;
                    }
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
                if (!currentPage) return;
                const MediaContainerContentCollection = Array.from(document.querySelectorAll('.MediaContainerContent')) as HTMLDivElement[];
                let MediaContainerContent: HTMLDivElement | undefined = undefined;
                // 这里判断如果有一个以上，就是进入分集了
                if (MediaContainerContentCollection.length > 1)
                {
                    MediaContainerContent = MediaContainerContentCollection[1];
                } else
                {
                    MediaContainerContent = MediaContainerContentCollection[0];
                }
                if (!MediaContainerContent) return;
                if (currentPage === totalPage) return;
                currentPage++;
                const parent = MediaContainerContent.parentElement;

                const NeteaseSearchMediaContainerByIDs = func(currentPage, mediaItems);
                pagination.innerText = `${currentPage}/${totalPage}`;
                const newMediaContainerContent = this.createMediaContainerContent(NeteaseSearchMediaContainerByIDs, 'rgb(221, 28, 4)');
                MediaContainerContent.style.opacity = '0';
                MediaContainerContent.addEventListener('transitionend', () =>
                {
                    MediaContainerContent.remove();
                    // 这里判断如果有一个以上，就是进入分集了
                    if (MediaContainerContentCollection.length === 1)
                    {
                        const currentMediaContainerContent = document.getElementById('MediaContainerContent');
                        if (currentMediaContainerContent) return;
                    } else
                    {
                        const currentMediaContainerContent = Array.from(document.querySelectorAll('.MediaContainerContent')) as HTMLDivElement[];
                        console.log(currentMediaContainerContent.length);
                        if (currentMediaContainerContent.length > 1) return;
                    }

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
        } else
        {
            pagination.innerText = `-/-`;
            prevButton.onclick = () => { return; };
            nextButton.onclick = () => { return; };
        }
    }

}