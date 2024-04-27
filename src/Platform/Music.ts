import { NeteaseMusicAPI } from "../Api/NeteaseAPI/NeteaseMusic";
import { NeteaseSearchAPI } from "../Api/NeteaseAPI/NeteaseSearch/index";
import { IIROSE_MEDIASelectHolder } from "../IIROSE-MEDIA/IIROSE_MEDIASelectHolder";
import { MediaContainer } from "../IIROSE-MEDIA/MediaContainer";
import { MediaContainerItem, MediaContainerNavBarPlatform, MediaItem } from "../IIROSE-MEDIA/MediaContainerInterface";
import { SelectHolderItem } from "../IIROSE-MEDIA/SelectHolderItemInterface";
import { Socket } from "../Socket";
import { Media } from "../Socket/Media";
import { MediaData } from "../Socket/Media/MediaCardInterface";
import { UpdateDom } from "../UpdateDOM";
import { MediaContainerDisplay } from "../UpdateDOM/MediaContainerDisplay";

export class Music
{
    public music()
    {
        const platforms: MediaContainerNavBarPlatform[] = [
            this.netease()
        ];

        return platforms;
    }

    private netease()
    {
        const NetEaseRecommandPlayListitem = this.neteaseRecommendSongListMediaContainerItem();
        return {
            id: 'Netease',
            containerID: 'MusicContainer',
            title: '网易云音乐',
            iconsrc: 'https://static.codemao.cn/rose/v0/images/system/media/music/NeteaseMusic/logo.png',
            buttonBackgroundColor: 'rgb(221, 28, 4)',
            inputEvent: {
                title: '请输入搜索关键词',
                InputAreaConfirmBtnOnClick: (userInput:string | null) =>
                {
                    const mediaSearchBarInput = document.getElementById('mediaSearchBarInput');
                    if (!mediaSearchBarInput) return;
                    if (!userInput) return;
                    mediaSearchBarInput.innerHTML = userInput;
                    const SubNavBarItemSearchMusic = document.getElementById('SubNavBarItemSearchMusic');
                    if (!SubNavBarItemSearchMusic) return;
                    const subNavBarItemActive = document.querySelector('.subNavBarItemActive') as HTMLDivElement;
                    if(subNavBarItemActive){
                        if(subNavBarItemActive.classList.contains('SubNavBarItemSearch')) subNavBarItemActive.click();
                        else SubNavBarItemSearchMusic.click();
                    } else SubNavBarItemSearchMusic.click();
                    
                }
            },
            subNavBarItems: [
                {
                    title: '推荐歌单',
                    id: 'SubNavBarItemNeteaseRecommandPlayList',
                    onclick: () =>
                    {
                        const mediaContainer = new MediaContainer();
                        const NetEaseRecommandPlayListitem = this.neteaseRecommendSongListMediaContainerItem();
                        const MediaContainerContent = document.getElementById('MediaContainerContent');
                        if (!MediaContainerContent) return;
                        mediaContainer.updatePaginationNotings()
                        const newMediaContainerContent = mediaContainer.createMediaContainerContent(NetEaseRecommandPlayListitem, 'rgb(221, 28, 4)');
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
                    item: NetEaseRecommandPlayListitem
                },
                {
                    title: '搜索歌曲',
                    class: 'SubNavBarItemSearch',
                    id: 'SubNavBarItemSearchMusic',
                    onclick: () =>
                    {
                        const mediaContainer = new MediaContainer();
                        const MediaContainerContent = document.getElementById('MediaContainerContent');
                        if (!MediaContainerContent) return;

                        const mediaSearchBarInput = document.getElementById('mediaSearchBarInput');
                        if (!mediaSearchBarInput) return;
                        if (mediaSearchBarInput.innerHTML === '') {
                            const containerMsgWrapper = document.querySelector('.containerMsgWrapper');
                            if(containerMsgWrapper) return;
                            MediaContainerContent.style.opacity = '0'
                            MediaContainerContent.addEventListener('transitionend', function(){
                                const mediaContainerDisplay = new MediaContainerDisplay();
                                mediaContainerDisplay.displayMessage('rgb(221, 28, 4)', 1);
                                return
                            }, {once:true});
                            return
                        }
                        mediaContainer.updatePaginationNotings()
                        const keyword = mediaSearchBarInput.innerHTML;
                        const NeteaseSearchMediaContainerItem = this.NeteaseSearchMediaContainerItem(keyword);
                        const newMediaContainerContent = mediaContainer.createMediaContainerContent(NeteaseSearchMediaContainerItem, 'rgb(221, 28, 4)');
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

                }
            ]
        }
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
     * 推荐歌单
     * @returns 
     */
    private async neteaseRecommendSongListMediaContainerItem()
    {
        const neteaseSearchAPI = new NeteaseSearchAPI();
        const limit = 100;
        const RecommandPlayList = await neteaseSearchAPI.getNeteaseRecommandPlayListXC(limit);
        const x: Promise<MediaContainerItem[] | null>[] = [];

        let index = 0;

        
        if (!RecommandPlayList || !RecommandPlayList.result) return null;
        for (const resultElement of RecommandPlayList.result)
        {
            const mediaContainerItem: MediaContainerItem[] = [];
            const neteaseMusicApi = new NeteaseMusicAPI();
            const songListDetail = neteaseMusicApi.getSongListDetail(resultElement.id);
            const PromiseMediaContainerItem = songListDetail.then(songListDetailElement =>
            {
                if (!songListDetailElement || !songListDetailElement.playlist.creator) return null;
                const item: MediaContainerItem = {
                    id: resultElement.id || 0,
                    title: resultElement.name,
                    img: resultElement.picUrl,
                    url: `https://music.163.com/#/playlist?id=${resultElement.id}`,
                    author: songListDetailElement.playlist.creator.nickname,
                    duration: `歌单/${resultElement.trackCount}首`,
                    MediaRequest: () =>
                    {
                        const iiROSE_MEDIASelectHolder = new IIROSE_MEDIASelectHolder();
                        const item: SelectHolderItem[] = [{
                            id: 'sequence',
                            title: '正序点播',
                            onclick: () =>
                            {
                                const neteaseMusicAPI = new NeteaseMusicAPI();
                                const data = neteaseMusicAPI.getSongListDetail(resultElement.id);
                                let count = 0;
                                data.then(element =>
                                {
                                    if (!element) return;
                                    const socket = new Socket();
                                    const sMedia = new Media();
                                    element.playlist.trackIds.forEach((element) =>
                                    {
                                        const songResource = neteaseMusicAPI.getSongResource(element.id, 'jymaster');
                                        songResource.then(songResource =>
                                        {

                                            if (!element) return;
                                            if (!songResource) return;
                                            console.log(count += 1);
                                            const mediaData: MediaData = {
                                                type: 'music',
                                                name: songResource.name,
                                                singer: songResource.auther,
                                                cover: songResource.pic,
                                                link: `https://music.163.com/#/song?id=${element.id}`,
                                                url: songResource.url,
                                                duration: songResource.time / 1000,
                                                bitRate: Math.floor(songResource.br / 1000),
                                                color: 'FFFFFF',
                                                lyrics: songResource.lrc_control,
                                                origin: 'netease'
                                            }
                                            // 开了这个，速度大打折扣
                                            // const iImageTools = new ImageTools()
                                            // iImageTools.getImageAverageColor(mediaData.cover, 0.5).then(color => {
                                            //     mediaData.color = color
                                            //     console.log(color)
                                            //     socket.sendMessage(sMedia.mediaCard(mediaData), color)
                                            // })
                                            // console.log(mediaData)
                                            socket.sendMessage(sMedia.mediaCard(mediaData));
                                            socket.sendMessage(sMedia.mediaEvent(mediaData));

                                        });


                                    });
                                    return;
                                });
                            }
                        }, {
                            id: 'random',
                            title: '乱序点播',
                            onclick: () =>
                            {
                                console.log('乱序点播');
                            }
                        }];
                        iiROSE_MEDIASelectHolder.showIIROSE_MEDIASelectHolder(item);
                    }
                }
                mediaContainerItem.push(item);
                return mediaContainerItem;
            });
            x.push(PromiseMediaContainerItem);
            index += 1;
            if (index >= 10) break;
        }

        const mediaItem: MediaItem[] = [];
        const mediaContainer = new MediaContainer();
        RecommandPlayList.result.forEach((element, index) =>
        {
            mediaItem[index] = {
                id: element.id,
                title: element.name,
                img: element.picUrl,
                url: `https://music.163.com/#/playlist?id=${element.id}`,
            }
        });
        mediaContainer.updatePaginationNeteasePlayList(1, mediaItem);
        return x;
    }

    /**
     * 搜索歌曲
     * @param keyword 
     * @returns 
     */
    private async NeteaseSearchMediaContainerItem(keyword: string)
    {
        const neteaseSearchAPI = new NeteaseSearchAPI();
        const limit = 100;
        const searchData = await neteaseSearchAPI.getNeteaseMusicSearchData(keyword, limit);
        if (!searchData || !searchData.result || !searchData.result.songs) return null;
        const x: Promise<MediaContainerItem[] | null>[] = [];
        let index = 0;
        for (const searchDataElement of searchData.result.songs)
        {
            const mediaContainerItem: MediaContainerItem[] = [];
            const neteaseMusicApi = new NeteaseMusicAPI();
            const songDetail = neteaseMusicApi.getNeteaseSongDetailFromXC(searchDataElement.id);
            const PromiseMediaContainerItem = songDetail.then(songDetailElement =>
            {
                if (!songDetailElement || !songDetailElement.songs) return null;
                mediaContainerItem[0] = {
                    id: searchDataElement.id,
                    title: searchDataElement.name,
                    img: songDetailElement.songs[0].al.picUrl,
                    url: `https://music.163.com/#/song?id=${searchDataElement.id}`,
                    author: songDetailElement.songs[0].ar[0].name,
                    duration: this.formatMillisecondsToMinutes(songDetailElement.songs[0].dt),
                    MediaRequest: () =>
                    {
                        const socket = new Socket();
                        const sMedia = new Media();
                        const neteaseMusicAPI = new NeteaseMusicAPI();
                        const songResource = neteaseMusicAPI.getSongResource(searchDataElement.id, 'jymaster');
                        const updateDom = new UpdateDom();
                        updateDom.changeStatusIIROSE_MEDIA();
                        songResource.then(songResource =>
                        {
                            if (!songDetailElement || !songDetailElement.songs) return null;
                            if (!songResource) return null;
                            const mediaData: MediaData = {
                                type: 'music',
                                name: searchDataElement.name,
                                singer: songDetailElement.songs[0].ar[0].name,
                                cover: songDetailElement.songs[0].al.picUrl,
                                link: `https://music.163.com/#/song?id=${searchDataElement.id}`,
                                url: songResource.url,
                                duration: songDetailElement.songs[0].dt / 1000,
                                bitRate: Math.floor(songResource.br / 1000),
                                color: 'FFFFFF',
                                lyrics: songResource.lrc_control,
                                origin: 'netease'
                            }
                            socket.sendMessage(sMedia.mediaCard(mediaData));
                            socket.sendMessage(sMedia.mediaEvent(mediaData));

                        });
                    }
                }
                return mediaContainerItem;
            });
            x.push(PromiseMediaContainerItem);
            index += 1;
            if (index >= 10) break;
        }
        const mediaContainer = new MediaContainer();
        let songCount: number;
        if (searchData.result.songCount < limit && searchData.result.songCount <= 100)
        {
            songCount = searchData.result.songCount;
        } else
        {
            songCount = limit;
        }
        const MediaItem: MediaItem[] = [];
        searchData.result.songs.forEach((element, index) =>
        {
            MediaItem[index] = {
                id: element.id,
                title: element.name,
                author: element.artists[0].name,
                duration: this.formatMillisecondsToMinutes(element.duration),
            }
        });
        mediaContainer.updatePaginationNeteaseMusic(1, MediaItem);
        return x;
    }

    /**
     * 根据歌曲ID获取歌曲信息
     * @param currentPage 
     * @param fullPage 
     * @param id 
     * @returns 
     */
    public async NeteaseSearchMediaContainerByIDs(currentPage: number, mediaItems: MediaItem[])
    {
        const neteaseMusicAPI = new NeteaseMusicAPI();
        const itemPerPage = 10;
        const StartItem = (currentPage - 1) * itemPerPage;
        const mediaContainerItem: MediaContainerItem[] = [];
        mediaItems = mediaItems.slice(StartItem, StartItem + itemPerPage);
        const x: Promise<MediaContainerItem[] | null>[] = [];
        mediaItems.forEach((mediaItem, index) =>
        {
            if (index === itemPerPage) return;
            const songDetail = neteaseMusicAPI.getNeteaseSongDetailFromXC(mediaItem.id);
            const PromiseMediaContainerItem = songDetail.then(songDetailElement =>
            {
                if (!songDetailElement || !songDetailElement.songs) return null;
                mediaContainerItem[0] = {
                    id: mediaItem.id,
                    title: songDetailElement.songs[0].name,
                    img: songDetailElement.songs[0].al.picUrl,
                    url: `https://music.163.com/#/song?id=${mediaItem.id}`,
                    author: songDetailElement.songs[0].ar[0].name,
                    duration: this.formatMillisecondsToMinutes(songDetailElement.songs[0].dt),
                    MediaRequest: () =>
                    {
                        const socket = new Socket();
                        const sMedia = new Media();
                        const neteaseMusicAPI = new NeteaseMusicAPI();
                        const songResource = neteaseMusicAPI.getSongResource(mediaItem.id, 'jymaster');
                        const updateDom = new UpdateDom();
                        updateDom.changeStatusIIROSE_MEDIA();
                        songResource.then(songResource =>
                        {
                            if (!songDetailElement || !songDetailElement.songs) return null;
                            if (!songResource) return null;
                            const mediaData: MediaData = {
                                type: 'music',
                                name: songResource.name,
                                singer: songDetailElement.songs[0].ar[0].name,
                                cover: songDetailElement.songs[0].al.picUrl,
                                link: `https://music.163.com/#/song?id=${songResource.id}`,
                                url: songResource.url,
                                duration: songDetailElement.songs[0].dt / 1000,
                                bitRate: Math.floor(songResource.br / 1000),
                                color: 'FFFFFF',
                                lyrics: songResource.lrc_control,
                                origin: 'netease'
                            }
                            socket.sendMessage(sMedia.mediaCard(mediaData));
                            socket.sendMessage(sMedia.mediaEvent(mediaData));

                        });
                    }
                }
                console.log(mediaContainerItem[0].title);
                return mediaContainerItem;
            });
            x.push(PromiseMediaContainerItem);
        });
        return x;
    }

    /**
     * 根据歌单ID获取歌单信息
     * @param currentPage 
     * @param fullPage 
     * @param ids 
     * @returns 
     */
    public async NeteaseRecommendSongListMediaContainerItemByIDs(currentPage: number, mediaItems: MediaItem[]){
        const itemPerPage = 10;
        const StartItem = (currentPage - 1) * itemPerPage;
        mediaItems = mediaItems.slice(StartItem, StartItem + itemPerPage);
        const x: Promise<MediaContainerItem[] | null>[] = [];
        for (const mediaItem of mediaItems)
        {
            const mediaContainerItem: MediaContainerItem[] = [];
            const neteaseMusicApi = new NeteaseMusicAPI();
            const songListDetail = neteaseMusicApi.getSongListDetail(mediaItem.id);
            const PromiseMediaContainerItem = songListDetail.then(songListDetailElement =>
            {
                if (!songListDetailElement || !songListDetailElement.playlist.creator) return null;
                const item: MediaContainerItem = {
                    id: mediaItem.id || 0,
                    title: songListDetailElement.playlist.name,
                    img: songListDetailElement.playlist.coverImgUrl,
                    url: `https://music.163.com/#/playlist?id=${mediaItem.id}`,
                    author: songListDetailElement.playlist.creator.nickname,
                    duration: `歌单/${songListDetailElement.playlist.trackCount}首`,
                    MediaRequest: () =>
                    {
                        const iiROSE_MEDIASelectHolder = new IIROSE_MEDIASelectHolder();
                        const item: SelectHolderItem[] = [{
                            id: 'sequence',
                            title: '正序点播',
                            onclick: () =>
                            {
                                const neteaseMusicAPI = new NeteaseMusicAPI();
                                const data = neteaseMusicAPI.getSongListDetail(mediaItem.id);
                                let count = 0;
                                data.then(element =>
                                {
                                    if (!element) return;
                                    const socket = new Socket();
                                    const sMedia = new Media();
                                    element.playlist.trackIds.forEach((element) =>
                                    {
                                        const songResource = neteaseMusicAPI.getSongResource(element.id, 'jymaster');
                                        songResource.then(songResource =>
                                        {

                                            if (!element) return;
                                            if (!songResource) return;
                                            console.log(count += 1);
                                            const mediaData: MediaData = {
                                                type: 'music',
                                                name: songResource.name,
                                                singer: songResource.auther,
                                                cover: songResource.pic,
                                                link: `https://music.163.com/#/song?id=${element.id}`,
                                                url: songResource.url,
                                                duration: songResource.time / 1000,
                                                bitRate: Math.floor(songResource.br / 1000),
                                                color: 'FFFFFF',
                                                lyrics: songResource.lrc_control,
                                                origin: 'netease'
                                            }
                                            // 开了这个，速度大打折扣
                                            // const iImageTools = new ImageTools()
                                            // iImageTools.getImageAverageColor(mediaData.cover, 0.5).then(color => {
                                            //     mediaData.color = color
                                            //     console.log(color)
                                            //     socket.sendMessage(sMedia.mediaCard(mediaData), color)
                                            // })
                                            // console.log(mediaData)
                                            socket.sendMessage(sMedia.mediaCard(mediaData));
                                            socket.sendMessage(sMedia.mediaEvent(mediaData));

                                        });


                                    });
                                    return;
                                });
                            }
                        }, {
                            id: 'random',
                            title: '乱序点播',
                            onclick: () =>
                            {
                                console.log('乱序点播');
                            }
                        }];
                        iiROSE_MEDIASelectHolder.showIIROSE_MEDIASelectHolder(item);
                    }
                }
                mediaContainerItem.push(item);
                return mediaContainerItem;
            });
            x.push(PromiseMediaContainerItem);
        }
        return x;
    }
}