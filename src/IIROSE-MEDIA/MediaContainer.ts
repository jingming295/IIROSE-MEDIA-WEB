import { Video } from "../Platform/Video";
import { MediaContainerMessage } from "./elements/MediaContainerMessage";
import { MediaContainerNavBarPlatform, MediaContainerItem, MediaItem, SettingContainerNavBarPlatform } from "./interfaces/MediaContainerInterface";
import { InputEvent } from "./interfaces/MediaContainerInterface";
import { LSMediaCollectData } from "../Platform/LocalStorageCollectDataInterface";
import { Utils } from "../iirose_func/Utils";
import { Pagination } from "../UpdateDOM/Pagination/Pagination";
export class MediaContainerUtils
{

    /**
     * 
     * @param platforms 
     * @param mediaContainerID 
     * @param whichPlatform 
     * @returns 
     */
    observer: MutationObserver | null = null;
    timeout: NodeJS.Timeout | null = null;

    public createMediaContainer(platforms: MediaContainerNavBarPlatform[], MediaContainerWrapper?: HTMLDivElement, whichPlatform: number = 0)
    {
        let MediaContainer = document.querySelector('.MediaContainer') as HTMLDivElement;
        const iiroseMedia = document.getElementById('IIROSE_MEDIA');
        const MediaSearchBar = this.createMediaSearchBar(platforms[whichPlatform].inputEvent, platforms[whichPlatform].buttonBackgroundColor);
        const mediaContainerNavBar = this.createMediaContainerNavBar(platforms, whichPlatform);
        const mediaContainerSubNavBar = this.createPlatformNavigationBar(platforms, whichPlatform);

        if (!MediaContainer)
        {
            MediaContainer = document.createElement('div')
            MediaContainer.classList.add('MediaContainer');
            MediaContainer.appendChild(MediaSearchBar);
            MediaContainer.appendChild(mediaContainerNavBar);
            MediaContainer.appendChild(mediaContainerSubNavBar);
        }


        if (iiroseMedia && MediaContainerWrapper)
        {
            if (this.observer)
            {
                this.observer.disconnect();
            }
            this.observer = new MutationObserver(mutationList =>
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
            this.observer.observe(iiroseMedia, { childList: true, subtree: true });
            MediaContainerWrapper.appendChild(MediaContainer);
        } else
        {
            platforms[whichPlatform].subNavBarItems[0].onclick();

        }
    }


    /**
     * 创建媒体搜索栏 （第二排）
     * @param inputEvent 
     * @param bgColor 
     * @param id 
     * @returns 
     */
    protected createMediaSearchBar(inputEvent: InputEvent, bgColor: string, id?: string, mediaContainer?: HTMLDivElement)
    {

        function createInput()
        {
            function updateInput()
            {
                inputWrapper.onclick = () =>
                {
                    const utils = new Utils();
                    utils.sync(2, [inputEvent.title, 'none', 10000], inputEvent.InputAreaConfirmBtnOnClick);
                };
            }
            let inputWrapper = document.querySelector('.inputWrapper') as HTMLDivElement;

            if (!inputWrapper)
            {
                inputWrapper = document.createElement('div');
                inputWrapper.classList.add('inputWrapper');

                const inputIcon = document.createElement('div');
                inputIcon.classList.add('inputIcon');

                const input = document.createElement('div');
                input.classList.add('mediaSearchBarInput');
                input.id = 'mediaSearchBarInput';

                inputWrapper.appendChild(inputIcon);
                inputWrapper.appendChild(input);
                updateInput();
            } else
            {
                updateInput();
            }
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

        let MediaSearchBar = document.querySelector('.MediaSearchBar') as HTMLDivElement;

        const input = createInput();
        const pagination = createPagination();
        const controller = createPaginationController();
        if (!MediaSearchBar)
        {
            MediaSearchBar = document.createElement('div');
            MediaSearchBar.classList.add('MediaSearchBar');
            MediaSearchBar.appendChild(input);
            MediaSearchBar.appendChild(pagination);
            MediaSearchBar.appendChild(controller);
        }

        MediaSearchBar.style.backgroundColor = bgColor;
        MediaSearchBar.id = id || 'CommonMediaSearchBar';

        const clild = Array.from(MediaSearchBar.children) as HTMLElement[];
        clild.forEach((element) =>
        {
            element.style.opacity = '';
            element.style.visibility = '';
            element.style.pointerEvents = '';
        })

        return MediaSearchBar;
    }

    /**
     * 创建媒体容器导航栏，是切换平台导航栏 （第三排）
     * @param platforms 
     * @param whichPlatform 
     * @returns 
     */
    private createMediaContainerNavBar(platforms: MediaContainerNavBarPlatform[], whichPlatform: number)
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
                // const prevmediaContainer = Array.from(document.querySelectorAll('.MediaContainer')) as HTMLDivElement[] | null;
                // // if (!prevmediaContainer || prevmediaContainer.id === 'MusicContainer') return;
                // if (!prevmediaContainer || prevmediaContainer.length > 1) return;

                // // 添加动画结束事件的监听器
                // prevmediaContainer[0].addEventListener('transitionend', () =>
                // {
                //     prevmediaContainer[0].remove();
                // }, { once: true });

                // const MediaContainerWrapper = document.getElementById('MediaContainerWrapper');
                // if (!MediaContainerWrapper) return;
                this.createMediaContainer(platforms, undefined, index);

                // MediaContainerWrapper.appendChild(newMediaContainer);
            };

            // 判断是否是第一个 platform
            if (index === whichPlatform)
            {
                PlatFormSelector.style.backgroundColor = platform.buttonBackgroundColor;
            }
        });
        return PlatFormSelector;
    }

    /**
     * 创建平台导航栏 （第四排）
     * @param item 
     * @param whichPlatform 
     * @returns 
     */
    protected createPlatformNavigationBar(item: MediaContainerNavBarPlatform[] | SettingContainerNavBarPlatform[], whichPlatform: number)
    {

        function update()
        {
            MediaContainerSubNavBar.style.backgroundColor = item[whichPlatform].buttonBackgroundColor;

        }

        let MediaContainerSubNavBar = document.querySelector('.MediaContainerSubNavBar') as HTMLDivElement;

        if (!MediaContainerSubNavBar)
        {
            MediaContainerSubNavBar = document.createElement('div');
            MediaContainerSubNavBar.classList.add('MediaContainerSubNavBar');
        }

        let subNavBarItems = Array.from(MediaContainerSubNavBar.children) as HTMLDivElement[];

        if (subNavBarItems.length)
        {
            const subNavBarItemsLength = subNavBarItems.length - 1;
            subNavBarItems.forEach((item, index) =>
            {
                if (index >= subNavBarItemsLength)
                {
                    item.remove();
                }
            });
            subNavBarItems = Array.from(MediaContainerSubNavBar.children) as HTMLDivElement[];
        }


        item[whichPlatform].subNavBarItems.forEach((item, index) =>
        {

            let SubNavBarItem: HTMLDivElement;

            if (!subNavBarItems[index])
            {
                SubNavBarItem = document.createElement('div');
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
            } else
            {
                SubNavBarItem = subNavBarItems[index];
            }

            if (index === 0) SubNavBarItem.classList.add('subNavBarItemActive');
            else SubNavBarItem.classList.remove('subNavBarItemActive');

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
        });

        update()

        return MediaContainerSubNavBar;
    }

    /**
     * 创建媒体容器内容
     * @param ppMediaContainerItems 
     * @param playColor 
     * @returns 
     */
    public async createMediaContainerContent(ppMediaContainerItems: Promise<Promise<MediaContainerItem[] | null>[] | null> | undefined, playColor: string, parent: Element)
    {
        /**
         * 创建内容项，即每个视频的封面，标题，作者，时长，控件等
         * @param item 
         * @returns 
         */
        function createContentItem(item: MediaContainerItem, index: number, MediaContainerContent: HTMLDivElement)
        {
            /**
             * 设置高度等于宽度的像素值，用于图片
             */
            function setHeightToWidth()
            {
                console.log('setHeightToWidth');
                const width = contentImgCover.clientWidth; // 获取元素的实际宽度
                if (width > 0)
                    contentImgCover.style.height = width + 'px'; // 设置高度等于宽度的像素值
            }

            /**
             * 点击收藏按钮
             * @param collectIcon
             * @returns {void} 
             */
            function onclickFavorite(collectIcon: HTMLDivElement)
            {
                if (!item.collect) return;
                const ls = localStorage.getItem(item.collect.lsKeyWord);
                collectIcon.classList.toggle('collectedIcon');
                if (ls && collectIcon.classList.contains('collectedIcon'))
                {
                    const collect: LSMediaCollectData[] = JSON.parse(ls);
                    Promise.resolve(item.author).then((a) =>
                    {
                        Promise.resolve(item.multipage).then((m) =>
                        {
                            if (!item.collect) return;
                            const lsmcd: LSMediaCollectData = {
                                id: item.id,
                                title: item.title,
                                subTitle: item.subTitle,
                                img: item.img,
                                url: item.url,
                                author: a,
                                duration: item.duration,
                                multipage: m,
                                collect: item.collect,
                            };
                            collect.push(lsmcd);
                            localStorage.setItem(item.collect.lsKeyWord, JSON.stringify(collect));
                        });

                    });
                } else if (ls)
                {
                    const collect: LSMediaCollectData[] = JSON.parse(ls);
                    const index = collect.findIndex((c) => c.id === item.id);
                    collect.splice(index, 1);
                    localStorage.setItem(item.collect.lsKeyWord, JSON.stringify(collect));
                }
            }

            function update()
            {
                contentImg.onclick = () => { window.open(item.url || ''); };
                contentImg.src = '';
                contentImg.src = item.img;
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
                contentDuration.innerText = item.duration;

                contentTitle.innerText = item.title;

                if (item.subTitle)
                {
                    contentSubTitle.innerText = item.subTitle;
                } else
                {
                    contentSubTitle.innerText = '';
                }
                playButtonTitle.innerText = '点播';

                contentPlayButton.style.color = playColor;
                contentPlayButton.onclick = () =>
                {
                    if (item.MediaRequest) item.MediaRequest();
                };
                if (item.multipage)
                {
                    Promise.resolve(item.multipage).then((multipage) =>
                    {
                        if (multipage)
                        {
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
                        } else
                        {
                            playButtonIcon.classList.remove('pickButtonIcon');
                        }
                    });
                } else
                {
                    playButtonIcon.classList.remove('pickButtonIcon');
                }
                if (item.collect)
                {
                    collectIcomWrapper.style.display = '';
                    collectIcomWrapper.style.opacity = '';
                    collectText.innerText = '收藏';
                    const ls = localStorage.getItem(item.collect.lsKeyWord);
                    if (ls)
                    {
                        const collect: LSMediaCollectData[] = JSON.parse(ls);
                        const index = collect.findIndex((c) => c.id === item.id);
                        if (index !== -1)
                        {
                            collectIcon.classList.add('collectedIcon');
                        }
                    }
                    collectIcomWrapper.onclick = () =>
                    {
                        onclickFavorite(collectIcon);
                    };
                } else
                {
                    collectIcomWrapper.style.display = 'none';
                    collectIcomWrapper.style.opacity = '0';
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

                observer.observe(contentImgCover);
                window.addEventListener('resize', setHeightToWidth);
            }

            const ContentItem = document.createElement('div');
            ContentItem.classList.add('ContentItem');
            ContentItem.id = `ContentItem${index}`;
            ContentItem.style.opacity = '0';

            const contentImgCover = document.createElement('div');
            contentImgCover.classList.add('contentImgCover');

            const contentImg = document.createElement('img');
            contentImg.classList.add('contentImg');

            const infoArea = document.createElement('div');
            infoArea.classList.add('infoArea');

            const contentAuthor = document.createElement('div');
            contentAuthor.classList.add('contentAuthor');

            const contentDuration = document.createElement('div');
            contentDuration.classList.add('contentDuration');

            const contentTitleWrapper = document.createElement('div');
            contentTitleWrapper.classList.add('contentTitleWrapper');

            const contentTitle = document.createElement('div');
            contentTitle.classList.add('contentTitle');

            const contentSubTitle = document.createElement('div');
            contentSubTitle.classList.add('contentSubTitle');

            const contentPlayButton = document.createElement('div');
            contentPlayButton.classList.add('contentPlayButton');

            const playButtonIcon = document.createElement('div');
            playButtonIcon.classList.add('playButtonIcon');

            const playButtonTitle = document.createElement('div');
            playButtonTitle.classList.add('playButtonTitle');


            const collectIcomWrapper = document.createElement('div');
            collectIcomWrapper.classList.add('collectIcomWrapper');

            const collectIcon = document.createElement('div');
            collectIcon.classList.add('collectIcon');

            const collectText = document.createElement('div');
            collectText.classList.add('collectText');

            collectIcomWrapper.appendChild(collectIcon);
            collectIcomWrapper.appendChild(collectText);
            infoArea.appendChild(collectIcomWrapper);

            contentPlayButton.appendChild(playButtonIcon);
            contentPlayButton.appendChild(playButtonTitle);

            contentTitleWrapper.appendChild(contentTitle);
            contentTitleWrapper.appendChild(contentSubTitle);
            infoArea.appendChild(contentTitleWrapper);
            infoArea.appendChild(contentAuthor);
            // infoArea.appendChild(contentDuration);

            contentImgCover.appendChild(contentImg);
            contentImgCover.appendChild(contentDuration);
            ContentItem.appendChild(contentImgCover);
            ContentItem.appendChild(infoArea);
            ContentItem.appendChild(contentPlayButton);
            MediaContainerContent.appendChild(ContentItem);

            update();
            setTimeout(() =>
            {
                ContentItem.style.opacity = '1';
            }, 10);
        }

        const create = (pMediaContainerItem: Promise<MediaContainerItem[] | null>[], MediaContainerContent: HTMLDivElement, spin: HTMLDivElement | null) =>
        {
            pMediaContainerItem.forEach((Item, index) =>
            {
                Item.then(MediaContainerItem =>
                {
                    if (spin) spin.remove();
                    MediaContainerContent.style.height = '';
                    if (!MediaContainerItem) return;
                    MediaContainerItem.forEach((MediaContainerItem) =>
                    {
                        createContentItem(MediaContainerItem, index, MediaContainerContent);
                    });
                });

            });

        }

        await this.clearMediaContainerContent();

        const MediaContainerContent = document.createElement('div');
        MediaContainerContent.classList.add('MediaContainerContent');
        MediaContainerContent.id = 'MediaContainerContent';

        MediaContainerContent.style.opacity = '0';

        parent.appendChild(MediaContainerContent);


        let spin = MediaContainerContent.querySelector('.containerSpin') as HTMLDivElement;
        if (!spin)
        {
            spin = document.createElement('div');
            spin.classList.add('containerSpin');
        }

        const ContentItem = Array.from(MediaContainerContent.children) as HTMLDivElement[];

        if (ContentItem.length)
        {
            ContentItem.forEach(item =>
            {
                item.style.opacity = '0';
            });
        }

        MediaContainerContent.style.height = '100%';

        setTimeout(() =>
        {
            MediaContainerContent.style.opacity = '1';
        }, 10);
        MediaContainerContent.appendChild(spin);
        if (!ppMediaContainerItems)
        {
            return;
        };
        ppMediaContainerItems.then(pMediaContainerItem =>
        {
            if (!pMediaContainerItem || pMediaContainerItem.length === 0)
            {
                if (spin) spin.remove();
                // const showmessage = new ShowMessage();
                // showmessage.show('搜索无结果');

                const mediaContainerDisplay = new MediaContainerMessage();
                mediaContainerDisplay.displayMessage(playColor, 2, MediaContainerContent, this);
                return;
            }
            create(pMediaContainerItem, MediaContainerContent, spin);
        });

    }

    protected clearMediaContainerContent(): Promise<void>
    {
        return new Promise((resolve, reject) =>
        {
            const mediaContainerContent = document.querySelector('.MediaContainerContent') as HTMLDivElement;
            if (mediaContainerContent)
            {
                mediaContainerContent.style.opacity = '0';
                mediaContainerContent.remove();

            }
            resolve();
        });
    }


    /**
     * 切换到多集页面模式
     * @param container 
     * @param mediaItems 
     * @param rgb 
     * @returns 
     */
    public goMultiPage(container: HTMLDivElement, mediaItems: MediaItem[], rgb: string, ppMediaContainerItems: Promise<Promise<MediaContainerItem[] | null>[] | null>)
    {
        const createPaginationController = () =>
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
                paginationTextDiv.textContent = paginationText;
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
                const MediaContainerContentCollection = Array.from(document.querySelectorAll('.MediaContainer')) as HTMLDivElement[];
                // 这里判断如果有一个以上，就是进入分集了
                this.createMediaContainerContent(ppMediaContainerItems, rgb, MediaContainerContentCollection[0]);
            };

            return multipageControllerWrapper;
        }

        const items = Array.from(container.children) as HTMLElement[];
        const mediasearchBar = items[0];
        const subNavBar = items[2];

        const subnavbaritemPlaceHolder = document.createElement('div');
        const video = new Video(this);

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

        const mediaContainer = document.querySelector('.MediaContainer') as HTMLDivElement;
        const mediacontaineritem = video.bilibiliVideoMediaContainerItemByCids(1, mediaItems);
        this.createMediaContainerContent(mediacontaineritem, rgb, mediaContainer);

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
            const pagination = new Pagination(this);
            pagination.updatePaginationBilibiliMultiPageVideo(1, mediaItems);
        }, { once: true });

    }

    private DestroyItem(item: HTMLElement)
    {
        item.style.opacity = '0';
        item.addEventListener('transitionend', () =>
        {
            item.remove();
        }, { once: true });
    }

    private HideItem(item: HTMLElement)
    {
        item.style.opacity = '0';
        item.addEventListener('transitionend', () =>
        {
            this.ShowItem(item);
        }, { once: true })

    }

    private ShowItem(item: HTMLElement)
    {
        item.style.opacity = '1';
    }


}