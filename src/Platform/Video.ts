import { SendFetch } from "../Api";
import { BiliBiliLiveApi } from "../Api/BilibiliAPI/BiliBiliLive";
import { BiliBiliSearchApi } from "../Api/BilibiliAPI/BiliBiliSearch";
import { live_roomResult, VideoResult } from "../Api/BilibiliAPI/BiliBiliSearch/SearchRequestInterface";
import { BiliBiliVideoApi } from "../Api/BilibiliAPI/BiliBiliVideoAPI";
import { BVideoDetail } from "../Api/BilibiliAPI/BiliBiliVideoAPI/VideoDetailInterface";
import { MediaContainer } from "../IIROSE-MEDIA/MediaContainer";
import { MediaContainerItem, MediaContainerNavBarPlatform, MediaItem } from "../IIROSE-MEDIA/MediaContainerInterface";
import { Socket } from "../Socket";
import { Media } from "../Socket/Media";
import { MediaData } from "../Socket/Media/MediaCardInterface";
import { UpdateDom } from "../UpdateDOM";
import { MediaContainerDisplay } from "../UpdateDOM/MediaContainerDisplay";
import { showMessage } from "../IIROSE/ShowMessage";

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
            containerID: 'VideoContainer',
            title: '哔哩哔哩视频 (高清视频未完成)',
            iconsrc: 'https://static.codemao.cn/rose/v0/images/system/media/video/bilibili/ic_launcher.png',
            buttonBackgroundColor: 'rgb(209, 79, 118)',
            inputEvent: {
                title: '请输入搜索关键词',
                InputAreaConfirmBtnOnClick: (userInput:string | null) =>
                {
                    const mediaSearchBarInput = document.getElementById('mediaSearchBarInput');
                    if (!mediaSearchBarInput) return;
                    if(!userInput) return;
                    mediaSearchBarInput.innerHTML = userInput;
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
                        const newMediaContainerContent = mediaContainer.createMediaContainerContent(BilibiliRecommandVideoitem, 'rgb(209, 79, 118)');
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
                        this.bilibiliOnclickSubNavBarNeedSearchItem(this.bilibiliVideoSearchMediaContainer.bind(this));
                    }
                }, {
                    title: '搜索直播',
                    class: 'SubNavBarItemSearch',
                    id: 'SubNavBarItemBilibiliLive',
                    onclick: () =>
                    {
                        this.bilibiliOnclickSubNavBarNeedSearchItem(this.bilibiliSearchLiveMediaContainerItemByKeyword.bind(this));
                    }
                }
            ]
        };
    }


    /**
     * 这些也做成一个函数了
     * @param VideoContainerFunc 
     * @returns 
     */
    private bilibiliOnclickSubNavBarNeedSearchItem(VideoContainerFunc: (keyword: string) => Promise<Promise<MediaContainerItem[] | null>[]>)
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
                mediaContainerDisplay.displayMessage('rgb(209, 79, 118)', 1);
                return;
            }, { once: true });
            return;
        }
        mediaContainer.updatePaginationNotings();
        const keyword = mediaSearchBarInput.innerHTML;

        const BilibiliRecommandVideoitem = VideoContainerFunc(keyword);
        const newMediaContainerContent = mediaContainer.createMediaContainerContent(BilibiliRecommandVideoitem, 'rgb(209, 79, 118)');
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

    private formatMillisecondsToMinutes(milliseconds: number): string
    {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        // 格式化为 xx:xx 形式
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        return formattedTime;
    }

    /**
     * 获取首页推荐视频
     * @returns 
     */
    private async bilibiliRecommendVideoMediaContainerItem(): Promise<Promise<MediaContainerItem[] | null>[] | null>
    {
        const bv = new BiliBiliVideoApi();
        const bvrcmd = await bv.getRecommendVideoFromMainPage(3, 1, 30, window.bilibili.rcmdVideo.fresh_idx_1h, window.bilibili.rcmdVideo.fresh_idx, window.bilibili.rcmdVideo.brush);
        window.bilibili.rcmdVideo.fresh_idx_1h += 1;
        window.bilibili.rcmdVideo.fresh_idx += 1;
        window.bilibili.rcmdVideo.brush += 1;

        if (!bvrcmd || !bvrcmd.data) return null;
        let index = 0;
        const x: Promise<MediaContainerItem[] | null>[] = [];
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

        const mediaItems: MediaItem[] = [];

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
        const x: Promise<MediaContainerItem[] | null>[] = [];
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
     * 根据关键词搜索获取视频，用于第一页
     * @param keyword 
     * @returns 
     */
    public async bilibiliVideoSearchMediaContainer(keyword: string): Promise<Promise<MediaContainerItem[] | null>[]>
    {
        const bs = new BiliBiliSearchApi();
        const searchResult = await bs.getSearchRequestByTypeVideo(keyword, 1, 10);
        const x: Promise<MediaContainerItem[] | null>[] = [];
        if (!searchResult || !searchResult.data || searchResult.data.v_voucher) return x;
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
            const mediaContainerItem = this.processMediaContainerItemWhenKeyword(keyword, result, bvDetail, multipage);
            x.push(mediaContainerItem);
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
     * 根据关键词搜索获取视频，用于分页
     * @param currentPage 
     * @param mediaItems 
     * @returns 
     */
    public async bilibiliSearchMediaContainerItemByKeyword(currentPage: number, mediaItems: MediaItem[]): Promise<Promise<MediaContainerItem[] | null>[]>
    {
        if (!mediaItems[0].keyword) return [];

        const bs = new BiliBiliSearchApi();
        const searchResult = await bs.getSearchRequestByTypeVideo(mediaItems[0].keyword, currentPage, 10);

        const x: Promise<MediaContainerItem[] | null>[] = [];

        if (!searchResult || !searchResult.data) return x;

        if (!searchResult || !searchResult.data || !searchResult.data.result) return x;

        searchResult.data.result.forEach((result) =>
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

            const mediaContainerItem = this.processMediaContainerItemWhenKeyword(mediaItems[0].keyword, result, bvDetail, multipage);
            if (mediaContainerItem) x.push(mediaContainerItem);

        });
        return x;
    }

    /**
     * 根据cids获取视频，用于第一页和分页
     * @param currentPage 
     * @param mediaItems 
     * @returns 
     */
    public async bilibiliVideoMediaContainerItemByCids(currentPage: number, mediaItems: MediaItem[]): Promise<Promise<MediaContainerItem[] | null>[]>
    {
        const itemPerPage = 10;
        const StartItem = (currentPage - 1) * itemPerPage;
        mediaItems = mediaItems.slice(StartItem, StartItem + itemPerPage);
        console.log(StartItem);
        const x: Promise<MediaContainerItem[] | null>[] = [];
        for (const item of mediaItems)
        {
            const mediaContainerItem = this.processMediaContainerItem(item);
            if (mediaContainerItem) x.push(mediaContainerItem);
        }

        return x;

    }

    public async bilibiliSearchLiveMediaContainerItemByKeyword(keyword: string)
    {
        const bs = new BiliBiliSearchApi();
        const searchResult = await bs.getSearchRequestByTypeLiveRoom(keyword, 1, 10);
        const x: Promise<MediaContainerItem[] | null>[] = [];
        if (!searchResult || !searchResult.data || searchResult.data.v_voucher) return x;
        if (!searchResult || !searchResult.data || !searchResult.data.result) return x;
        const mediaItems: MediaItem[] = [];
        searchResult.data.result.forEach((result) =>
        {
            const mediaContainerItem = this.processLiveMediaContainerItem(result);
            x.push(mediaContainerItem);
        });

        const actualItems = searchResult.data.numResults;

        for (let i = 1; i <= actualItems; i++)
        {
            mediaItems.push({
                id: i,
                keyword: keyword,
            });
        }

        const mediaContainer = new MediaContainer();
        mediaContainer.updatePaginationBilibiliLive(1, mediaItems);

        return x;
    }

    public async bilibiliLiveMediaContainerItemByIDs(currentPage: number, mediaItems: MediaItem[])
    {

        const itemPerPage = 10;
        const StartItem = (currentPage - 1) * itemPerPage;
        mediaItems = mediaItems.slice(StartItem, StartItem + itemPerPage);
        const x: Promise<MediaContainerItem[] | null>[] = [];
        if (!mediaItems[0].keyword) return x;
        const blsearchResult = await new BiliBiliSearchApi().getSearchRequestByTypeLiveRoom(mediaItems[0].keyword, currentPage, 10);
        if (!blsearchResult || !blsearchResult.data || !blsearchResult.data.result) return x;

        for (const result of blsearchResult.data.result)
        {
            const mediaContainerItem = this.processLiveMediaContainerItem(result);
            if (mediaContainerItem) x.push(mediaContainerItem);
        }

        return x;

    }

    /**
     * 处理mediaContainerItem，根据mediaItem的方式
     * @param item 
     * @returns 
     */
    public async processMediaContainerItem(item: MediaItem)
    {
        if (!item.id || !item.title || !item.img || !item.url || !item.author || !item.duration || !item.bilibili || !item.bilibili.bvid || !item.bilibili.cid) return null;
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

        return Promise.resolve([mediaContainerItem]);
    }

    public async processLiveMediaContainerItem(result: live_roomResult)
    {
        result.title = result.title.replace(/<[^>]+>/g, '');
        const mediaContainerItem: MediaContainerItem = {
            id: result.roomid,
            title: result.title,
            img: `https:${result.user_cover}`,
            url: `https://live.bilibili.com/${result.roomid}`,
            author: result.uname,
            duration: `${result.online} 人正在观看`,
            MediaRequest: () =>
            {
                const socket = new Socket();
                const sMedia = new Media();
                const bl = new BiliBiliLiveApi();
                const updateDom = new UpdateDom();
                updateDom.changeStatusIIROSE_MEDIA();
                const blstream = bl.getLiveStream(result.roomid, 'h5', null, 30000);

                blstream.then(async blstream =>
                {
                    if (!blstream || !blstream.data || !blstream.data.durl) return null;
                    const sendfetch = new SendFetch();
                    let done = false;
                    for (const durl of blstream.data.durl)
                    {
                        const playurlresult = await sendfetch.tryget(durl.url);
                        if (playurlresult && !done && blstream && blstream.data && blstream.data.current_qn)
                        {
                            const mediaData: MediaData = {
                                type: 'video',
                                name: result.title,
                                singer: result.uname,
                                cover: `https:${result.user_cover}`,
                                link: `https://live.bilibili.com/${result.roomid}`,
                                url: durl.url,
                                duration: 43200,
                                bitRate: blstream.data.current_qn,
                                color: 'FFFFFF',
                                origin: 'bilibililive'
                            };
                            socket.sendMessage(sMedia.mediaCard(mediaData));
                            socket.sendMessage(sMedia.mediaEvent(mediaData));
                            done = true;
                        }
                    }
                    if (!done)
                    {
                        const showmessage = new showMessage();
                        showmessage.showMessage('获取直播流失败');
                    }
                });

            }
        };
        return Promise.resolve([mediaContainerItem]);
    }

    /**
     * 出路mediaContainerItem，根据关键词搜索的方式
     * @param keyword 
     * @param result 
     * @param bvDetail 
     * @param multipage 
     * @returns 
     */
    public async processMediaContainerItemWhenKeyword(keyword: string | undefined, result: VideoResult, bvDetail: Promise<BVideoDetail | null>, multipage: Promise<boolean>)
    {
        if (!keyword) return null;
        const bv = new BiliBiliVideoApi();
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
                    }

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
                        console.log(newMediaItems);
                        const videoContainer = document.getElementById('VideoContainer') as HTMLDivElement;
                        const mediaContainer = new MediaContainer();
                        mediaContainer.goMultiPage(videoContainer, newMediaItems, 'rgb(221, 28, 4)');
                    }
                });

            },

        };
        return Promise.resolve([mediaContainerItem]);
    }

}