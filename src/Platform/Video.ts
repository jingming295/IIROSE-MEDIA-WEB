import { BiliBiliSearchApi } from "../Api/BilibiliAPI/BiliBiliSearch";
import { BiliBiliVideoApi } from "../Api/BilibiliAPI/BiliBiliVideoAPI";
import { MediaContainer } from "../IIROSE-MEDIA/MediaContainer";
import { MediaContainerItem, MediaContainerNavBarPlatform, MediaItem } from "../IIROSE-MEDIA/MediaContainerInterface";
import { Socket } from "../Socket";
import { Media } from "../Socket/Media";
import { MediaData } from "../Socket/Media/MediaCardInterface";
import { UpdateDom } from "../UpdateDOM";
import { MediaContainerDisplay } from "../UpdateDOM/MediaContainerDisplay";

export class Video
{
    public video()
    {
        const platforms: MediaContainerNavBarPlatform[] = [
            this.bilibili()
        ];
        return platforms;
    }

    private bilibili()
    {
        const BilibiliRecommandVideoitem = this.bilibiliRecommendVideoMediaContainerItem();
        return {
            id: 'BilibiliVideo',
            title: '哔哩哔哩视频 (高清视频未完成)',
            iconsrc: 'https://static.codemao.cn/rose/v0/images/system/media/video/bilibili/ic_launcher.png',
            buttonBackgroundColor: 'rgb(209, 79, 118)',
            inputEvent: {
                title: '请输入搜索关键词',
                InputAreaConfirmBtnOnClick: () =>
                {
                    const mediaSearchBarInput = document.getElementById('mediaSearchBarInput');
                    if (!mediaSearchBarInput) return;
                    const inputPlace = document.getElementById('inputPlace') as HTMLInputElement;
                    if (!inputPlace || inputPlace.value === '') return;
                    mediaSearchBarInput.innerHTML = inputPlace.value;
                    const SubNavBarItemBilibiliVideo = document.getElementById('SubNavBarItemBilibiliVideo');
                    if (!SubNavBarItemBilibiliVideo) return;
                    const subNavBarItemActive = document.querySelector('.subNavBarItemActive') as HTMLDivElement;
                    if (subNavBarItemActive)
                    {
                        if (subNavBarItemActive.classList.contains('SubNavBarItemSearch')) subNavBarItemActive.click();
                        else SubNavBarItemBilibiliVideo.click();
                    } else SubNavBarItemBilibiliVideo.click();
                }
            },
            subNavBarItems: [
                {
                    title: '首页推荐',
                    id: 'SubNavBarItemBilibiliRecommend',
                    onclick: () =>
                    {
                        const mediaContainer = new MediaContainer();
                        const BilibiliRecommandVideoitem = this.bilibiliRecommendVideoMediaContainerItem();
                        const MediaContainerContent = document.getElementById('MediaContainerContent');
                        if (!MediaContainerContent) return;
                        const newMediaContainerContent = mediaContainer.createMediaContainerContent(BilibiliRecommandVideoitem, 'rgb(221, 28, 4)');
                        const parent = MediaContainerContent.parentElement;
                        MediaContainerContent.style.opacity = '0';

                        MediaContainerContent.addEventListener('transitionend', () =>
                        {
                            MediaContainerContent.remove();
                            const currentMediaContainerContent = document.getElementById('MediaContainerContent');
                            if (currentMediaContainerContent) return;
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
                    },
                    item: BilibiliRecommandVideoitem
                }, {
                    title: '搜索视频',
                    class: 'SubNavBarItemSearch',
                    id: 'SubNavBarItemBilibiliVideo',
                    onclick: () =>
                    {
                        const mediaContainer = new MediaContainer();
                        const mediaSearchBarInput = document.getElementById('mediaSearchBarInput');
                        const MediaContainerContent = document.getElementById('MediaContainerContent');
                        if (!MediaContainerContent) return;
                        if (!mediaSearchBarInput) return;
                        if (mediaSearchBarInput.innerHTML === '')
                        {
                            const containerMsgWrapper = document.querySelector('.containerMsgWrapper');
                            if (containerMsgWrapper) return;
                            MediaContainerContent.style.opacity = '0';
                            MediaContainerContent.addEventListener('transitionend', function ()
                            {
                                const mediaContainerDisplay = new MediaContainerDisplay();
                                mediaContainerDisplay.displayPleaseSearch('rgb(221, 28, 4)');
                                return;
                            }, { once: true });
                        };
                        mediaContainer.updatePaginationNotings();
                        const keyword = mediaSearchBarInput.innerHTML;

                        const BilibiliRecommandVideoitem = this.bilibiliVideoSearchMediaContainer(keyword);
                        const newMediaContainerContent = mediaContainer.createMediaContainerContent(BilibiliRecommandVideoitem, 'rgb(221, 28, 4)');
                        const parent = MediaContainerContent.parentElement;
                        MediaContainerContent.style.opacity = '0';

                        MediaContainerContent.addEventListener('transitionend', () =>
                        {
                            MediaContainerContent.remove();
                            const currentMediaContainerContent = document.getElementById('MediaContainerContent');
                            if (currentMediaContainerContent) return;
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
                    }
                }, {
                    title: '影视 (未完成)',
                    class: 'SubNavBarItemSearch',
                    id: 'SubNavBarItemBilibiliMovie',
                    onclick: () =>
                    {
                        console.log('影视');
                    }
                }, {
                    title: '直播 (未完成)',
                    class: 'SubNavBarItemSearch',
                    id: 'SubNavBarItemBilibiliLive',
                    onclick: () =>
                    {
                        console.log('直播');
                    }
                }
            ]
        };
    }

    private formatMillisecondsToMinutes(milliseconds: number): string
    {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        // 格式化为 xx:xx 形式
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        return formattedTime;
    }

    private async bilibiliRecommendVideoMediaContainerItem(): Promise<Promise<MediaContainerItem[] | null>[] | null>
    {
        const bv = new BiliBiliVideoApi();
        const bvrcmd = await bv.getRecommendVideoFromMainPage(3, 1, 30, window.bilibili.rcmdVideo.fresh_idx_1h, window.bilibili.rcmdVideo.fresh_idx, window.bilibili.rcmdVideo.brush);
        window.bilibili.rcmdVideo.fresh_idx_1h += 1;
        window.bilibili.rcmdVideo.fresh_idx += 1;
        window.bilibili.rcmdVideo.brush += 1;

        if (!bvrcmd || !bvrcmd.data) return null;
        let index = 0;
        let x: Promise<MediaContainerItem[] | null>[] = [];
        for (const rcmdItem of bvrcmd.data.item)
        {
            const item: MediaContainerItem = {
                id: rcmdItem.id,
                title: rcmdItem.title,
                img: rcmdItem.pic,
                url: rcmdItem.uri,
                author: rcmdItem.owner.name,
                duration: this.formatMillisecondsToMinutes(rcmdItem.duration * 1000),
                MediaRequest: () =>
                {
                    const socket = new Socket();
                    const sMedia = new Media();
                    const bvResource = bv.getBilibiliVideoStream(rcmdItem.id, rcmdItem.bvid, rcmdItem.cid, 112, 'html5');
                    const updateDom = new UpdateDom();
                    updateDom.changeStatusIIROSE_MEDIA();
                    bvResource.then(bvResource =>
                    {
                        if (!bvResource || !bvResource.data || !bvResource.data.durl || !bvResource.data.quality) return null;
                        const mediaData: MediaData = {
                            type: 'video',
                            name: rcmdItem.title,
                            singer: rcmdItem.owner.name,
                            cover: rcmdItem.pic,
                            link: rcmdItem.uri,
                            url: bvResource.data.durl[0].url,
                            duration: rcmdItem.duration,
                            bitRate: bvResource.data.quality,
                            color: 'FFFFFF',
                            origin: 'bilibili'
                        };
                        socket.sendMessage(sMedia.mediaCard(mediaData));
                        socket.sendMessage(sMedia.mediaEvent(mediaData));

                    });
                }
            };
            x.push(Promise.resolve([item]));
            index += 1;
            if (index >= 10) break;
        }

        let mediaItems: MediaItem[] = [];

        for (const item of bvrcmd.data.item)
        {
            mediaItems.push({
                id: item.id,
                title: item.title,
                img: item.pic,
                url: item.uri,
                author: item.owner.name,
                duration: this.formatMillisecondsToMinutes(item.duration * 1000),
                bilibili: {
                    bvid: item.bvid,
                    cid: item.cid
                }
            });
        }

        const mediaContainer = new MediaContainer();
        mediaContainer.updatePaginationBilibiliRCMDVideo(1, mediaItems);
        return x;
    }

    /**
     * 根据mediaItems获取
     * @param currentPage 
     * @param mediaItems 
     * @returns 
     */
    public async bilibiliVideoMediaContainerItemByIDs(currentPage: number, mediaItems: MediaItem[]): Promise<Promise<MediaContainerItem[] | null>[]>
    {
        const itemPerPage = 10;
        const StartItem = (currentPage - 1) * itemPerPage;
        mediaItems = mediaItems.slice(StartItem, StartItem + itemPerPage);
        let x: Promise<MediaContainerItem[] | null>[] = [];
        for (const item of mediaItems)
        {
            if (!item.author || !item.duration || !item.id || !item.img || !item.title || !item.url) continue;
            const mediaContainerItem: MediaContainerItem = {
                id: item.id,
                title: item.title,
                img: item.img,
                url: item.url,
                author: item.author,
                duration: item.duration,
                MediaRequest()
                {
                    if (!item.bilibili || !item.bilibili.bvid || !item.bilibili.cid) return;
                    const socket = new Socket();
                    const sMedia = new Media();
                    const bv = new BiliBiliVideoApi();
                    const bvResource = bv.getBilibiliVideoStream(item.id, item.bilibili?.bvid, item.bilibili.cid, 112, 'html5');
                    const updateDom = new UpdateDom();
                    updateDom.changeStatusIIROSE_MEDIA();
                    bvResource.then(bvResource =>
                    {
                        if (!item.author || !item.duration || !item.id || !item.img || !item.title || !item.url || !item.bilibili || !item.bilibili.bvid || !item.bilibili.cid) return;

                        if (!bvResource || !bvResource.data || !bvResource.data.durl || !bvResource.data.quality) return null;
                        const mediaData: MediaData = {
                            type: 'video',
                            name: item.title,
                            singer: item.author,
                            cover: item.img,
                            link: item.url,
                            url: bvResource.data.durl[0].url,
                            duration: bvResource.data.durl[0].length / 1000,
                            bitRate: bvResource.data.quality,
                            color: 'FFFFFF',
                            origin: 'bilibili'
                        };
                        socket.sendMessage(sMedia.mediaCard(mediaData));
                        socket.sendMessage(sMedia.mediaEvent(mediaData));
                    });
                },
            };
            x.push(Promise.resolve([mediaContainerItem]));
        }


        return x;
    }

    /**
     * 搜索视频
     * @param keyword 
     * @returns 
     */
    public async bilibiliVideoSearchMediaContainer(keyword: string): Promise<Promise<MediaContainerItem[] | null>[]>
    {
        const bs = new BiliBiliSearchApi();
        const searchResult = await bs.getSearchRequestByTypeVideo(keyword, 1, 10);
        let x: Promise<MediaContainerItem[] | null>[] = [];

        if (!searchResult || !searchResult.data) return x;
        if (!searchResult || !searchResult.data || !searchResult.data.result) return x;
        for (const result of searchResult.data.result)
        {
            const bv = new BiliBiliVideoApi();
            const bvDetail = bv.getBilibiliVideoData(result.aid, result.bvid);

            const multipage = bvDetail.then(bvDetail =>
            {
                if (bvDetail && bvDetail.data)
                {
                    const pages = bvDetail.data.pages;
                    if (pages.length > 1)
                    {
                        return true;
                    } else
                    {
                        return false;
                    }
                } else
                {
                    return false;
                }
            });

            result.title = result.title.replace(/<[^>]+>/g, '');
            const mediaContainerItem: MediaContainerItem = {
                formatMillisecondsToMinutes: this.formatMillisecondsToMinutes,
                id: result.id,
                title: result.title,
                img: `https:${result.pic}`,
                url: result.arcurl,
                author: result.author,
                multipage: multipage,
                duration: result.duration,
                MediaRequest()
                {
                    if (!result.bvid) return;
                    const socket = new Socket();
                    const sMedia = new Media();
                    bvDetail.then(bvDetail =>
                    {
                        if (!bvDetail || !bvDetail.data)
                        {
                            const updateDom = new UpdateDom();
                            updateDom.changeStatusIIROSE_MEDIA();
                            return;
                        };
                        if (bvDetail.data.pages.length === 1)
                        {
                            const updateDom = new UpdateDom();
                            updateDom.changeStatusIIROSE_MEDIA();
                            const bvResource = bv.getBilibiliVideoStream(result.id, result.bvid, bvDetail.data.cid, 112, 'html5');
                            bvResource.then(bvResource =>
                            {
                                if (!bvResource || !bvResource.data || !bvResource.data.durl || !bvResource.data.quality) return null;
                                if (bvResource.data.quality === 6) bvResource.data.quality = 2;
                                const mediaData: MediaData = {
                                    type: 'video',
                                    name: result.title,
                                    singer: result.author,
                                    cover: `https:${result.pic}`,
                                    link: result.arcurl,
                                    url: bvResource.data.durl[0].url,
                                    duration: bvResource.data.durl[0].length / 1000,
                                    bitRate: bvResource.data.quality,
                                    color: 'FFFFFF',
                                    origin: 'bilibili'
                                };
                                socket.sendMessage(sMedia.mediaCard(mediaData));
                                socket.sendMessage(sMedia.mediaEvent(mediaData));
                            });
                        } else
                        {
                            const mediaItems: MediaItem[] = [];
                            const cids = bvDetail.data.pages.map((page) => page.cid);
                            for (let i = 0; i < cids.length; i++)
                            {
                                const totalSeconds = Math.floor(bvDetail.data.pages[i].duration * 1000 / 1000);
                                const minutes = Math.floor(totalSeconds / 60);
                                const seconds = totalSeconds % 60;
                                // 格式化为 xx:xx 形式
                                const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                mediaItems.push({
                                    id: result.id,
                                    keyword: keyword,
                                    title: bvDetail.data.pages[i].part,
                                    img: `https:${result.pic}`,
                                    url: `${result.arcurl}?p=${i + 1}`,
                                    author: result.author,
                                    duration: formattedTime,
                                    bilibili: {
                                        bvid: result.bvid,
                                        cid: cids[i]
                                    }
                                });
                            }

                            const videoContainer = document.getElementById('VideoContainer') as HTMLDivElement;
                            const mediaContainer = new MediaContainer();
                            mediaContainer.goMultiPage(videoContainer, mediaItems, 'rgb(221, 28, 4)');
                        }
                    });
                },
            };
            x.push(Promise.resolve([mediaContainerItem]));
        }

        const mediaItems: MediaItem[] = [];

        const pagesize = searchResult.data.pagesize;
        const currentpage = searchResult.data.page;
        const numPages = searchResult.data.numPages;

        const actualItems = numPages * pagesize;

        for (let i = 1; i <= actualItems; i++)
        {
            mediaItems.push({
                id: i,
                keyword: keyword,
            });
        }

        const mediaContainer = new MediaContainer();
        mediaContainer.updatePaginationBilibiliSearchVideo(currentpage, mediaItems);

        return x;
    }

    /**
     * 根据关键词搜索视频
     * @param currentPage 
     * @param mediaItems 
     * @returns 
     */
    public async bilibiliSearchMediaContainerItemByKeyword(currentPage: number, mediaItems: MediaItem[]): Promise<Promise<MediaContainerItem[] | null>[]>
    {
        if (!mediaItems[0].keyword) return [];

        const bs = new BiliBiliSearchApi();
        const searchResult = await bs.getSearchRequestByTypeVideo(mediaItems[0].keyword, currentPage, 10);

        let x: Promise<MediaContainerItem[] | null>[] = [];

        if (!searchResult || !searchResult.data) return x;

        if (!searchResult || !searchResult.data || !searchResult.data.result) return x;

        searchResult.data.result.forEach((result, index) =>
        {
            const bv = new BiliBiliVideoApi();
            const bvDetail = bv.getBilibiliVideoData(result.aid, result.bvid);
            result.title = result.title.replace(/<[^>]+>/g, '');
            const multipage = bvDetail.then(bvDetail =>
            {
                if (bvDetail && bvDetail.data)
                {
                    const pages = bvDetail.data.pages;
                    if (pages.length > 1)
                    {
                        return true;
                    } else
                    {
                        return false;
                    }
                } else
                {
                    return false;
                }
            });

            const mediaContainerItem: MediaContainerItem = {
                id: result.id,
                title: result.title,
                img: `https:${result.pic}`,
                url: result.arcurl,
                author: result.author,
                multipage: multipage,
                duration: result.duration,
                MediaRequest()
                {
                    if (!result.bvid) return;
                    const socket = new Socket();
                    const sMedia = new Media();
                    bvDetail.then(bvDetail =>
                    {
                        if (!bvDetail || !bvDetail.data) return;

                        if (!bvDetail || !bvDetail.data)
                        {
                            const updateDom = new UpdateDom();
                            updateDom.changeStatusIIROSE_MEDIA();
                            return;
                        };

                        if (bvDetail.data.pages.length === 1)
                        {

                            const bvResource = bv.getBilibiliVideoStream(result.id, result.bvid, bvDetail.data.cid, 112, 'html5');
                            bvResource.then(bvResource =>
                            {
                                if (!bvResource || !bvResource.data || !bvResource.data.durl || !bvResource.data.quality) return null;
                                if (bvResource.data.quality === 6) bvResource.data.quality = 2;
                                const mediaData: MediaData = {
                                    type: 'video',
                                    name: result.title,
                                    singer: result.author,
                                    cover: `https:${result.pic}`,
                                    link: result.arcurl,
                                    url: bvResource.data.durl[0].url,
                                    duration: bvResource.data.durl[0].length / 1000,
                                    bitRate: bvResource.data.quality,
                                    color: 'FFFFFF',
                                    origin: 'bilibili'
                                };
                                socket.sendMessage(sMedia.mediaCard(mediaData));
                                socket.sendMessage(sMedia.mediaEvent(mediaData));
                            });
                        } else {
                            const cids = bvDetail.data.pages.map((page) => page.cid);
                            const newMediaItems: MediaItem[] = [];
                            for (let i = 0; i < cids.length; i++)
                            {
                                const totalSeconds = Math.floor(bvDetail.data.pages[i].duration * 1000 / 1000);
                                const minutes = Math.floor(totalSeconds / 60);
                                const seconds = totalSeconds % 60;
                                // 格式化为 xx:xx 形式
                                const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                newMediaItems.push({
                                    id: result.id,
                                    keyword: mediaItems[0].keyword,
                                    title: bvDetail.data.pages[i].part,
                                    img: `https:${result.pic}`,
                                    url: `${result.arcurl}?p=${i + 1}`,
                                    author: result.author,
                                    duration: formattedTime,
                                    bilibili: {
                                        bvid: result.bvid,
                                        cid: cids[i]
                                    }
                                });
                            }
                            console.log(newMediaItems)
                            const videoContainer = document.getElementById('VideoContainer') as HTMLDivElement;
                            const mediaContainer = new MediaContainer();
                            mediaContainer.goMultiPage(videoContainer, newMediaItems, 'rgb(221, 28, 4)');
                        }
                    });

                },

            };
            x.push(Promise.resolve([mediaContainerItem]));

        });


        return x;
    }

    public async bilibiliVideoMediaContainerItemByCids(currentPage: number, mediaItems: MediaItem[]): Promise<Promise<MediaContainerItem[] | null>[]>
    {
        const itemPerPage = 10;
        const StartItem = (currentPage - 1) * itemPerPage;
        mediaItems = mediaItems.slice(StartItem, StartItem + itemPerPage);
        console.log(StartItem)
        let x: Promise<MediaContainerItem[] | null>[] = [];
        for (const item of mediaItems)
        {
            if (!item.author || !item.duration || !item.id || !item.img || !item.title || !item.url || !item.bilibili || !item.bilibili.bvid || !item.bilibili.cid) continue;
            const mediaContainerItem: MediaContainerItem = {
                id: item.id,
                title: item.title,
                img: item.img,
                url: item.url,
                author: item.author,
                duration: item.duration,
                MediaRequest()
                {
                    if (!item.author || !item.duration || !item.id || !item.img || !item.title || !item.url || !item.bilibili || !item.bilibili.bvid || !item.bilibili.cid) return;
                    const bv = new BiliBiliVideoApi();
                    const bvDetail = bv.getBilibiliVideoData(item.id, item.bilibili.bvid);
                    const socket = new Socket();
                    const sMedia = new Media();

                    const updateDom = new UpdateDom();
                    updateDom.changeStatusIIROSE_MEDIA();
                    bvDetail.then(bvDetail =>
                    {
                        if (!item.author || !item.duration || !item.id || !item.img || !item.title || !item.url || !item.bilibili || !item.bilibili.bvid || !item.bilibili.cid) return;
                        if (!bvDetail || !bvDetail.data) return;
                        const bvResource = bv.getBilibiliVideoStream(item.id, item.bilibili.bvid, item.bilibili.cid, 112, 'html5');

                        bvResource.then(bvResource =>
                        {
                            if (!item.author || !item.duration || !item.id || !item.img || !item.title || !item.url || !item.bilibili || !item.bilibili.bvid || !item.bilibili.cid) return;
                            if (!bvResource || !bvResource.data || !bvResource.data.durl || !bvResource.data.quality) return null;
                            if (bvResource.data.quality === 6) bvResource.data.quality = 2;
                            const mediaData: MediaData = {
                                type: 'video',
                                name: item.title,
                                singer: item.author,
                                cover: `${item.img}`,
                                link: item.url,
                                url: bvResource.data.durl[0].url,
                                duration: bvResource.data.durl[0].length / 1000,
                                bitRate: bvResource.data.quality,
                                color: 'FFFFFF',
                                origin: 'bilibili'
                            };
                            socket.sendMessage(sMedia.mediaCard(mediaData));
                            socket.sendMessage(sMedia.mediaEvent(mediaData));
                        });
                    });
                }
            };
            x.push(Promise.resolve([mediaContainerItem]));

        }

        return x;

    }

}