import { NeteaseMusicAPI } from "../Api/NeteaseAPI/NeteaseMusic";
import { NeteaseSearchAPI } from "../Api/NeteaseAPI/NeteaseSearch/index";
import { IIROSE_MEDIASelectHolder } from "../IIROSE-MEDIA/IIROSE_MEDIASelectHolder";
import { MediaContainer } from "../IIROSE-MEDIA/MediaContainer";
import { MediaContainerItem, MediaContainerNavBarPlatform } from "../IIROSE-MEDIA/MediaContainerInterface";
import { SelectHolderItem } from "../IIROSE-MEDIA/SelectHolderItemInterface";
import { Socket } from "../Socket";
import { Media } from "../Socket/Media";
import { MediaData } from "../Socket/Media/MediaCardInterface";
import { UpdateDom } from "../UpdateDOM";

export class Music
{
    public music()
    {
        console.log('music');
        const platforms: MediaContainerNavBarPlatform[] = [
            this.netease()
        ];

        return platforms;
    }

    private netease()
    {
        const NetEaseRecommandPlayListitem = this.NeteaseRecommendSongListMediaContainerItem();
        return {
            id: 'Netease',
            title: '网易云音乐',
            iconsrc: 'https://static.codemao.cn/rose/v0/images/system/media/music/NeteaseMusic/logo.png',
            buttonBackgroundColor: 'rgb(221, 28, 4)',
            inputEvent: {
                title: '请输入搜索关键词',
                InputAreaConfirmBtnOnClick: () =>
                {
                    const mediaSearchBarInput = document.getElementById('mediaSearchBarInput');
                    if (!mediaSearchBarInput) return;
                    const inputPlace = document.getElementById('inputPlace') as HTMLInputElement;
                    if (!inputPlace || inputPlace.value === '') return;
                    mediaSearchBarInput.innerHTML = inputPlace.value;
                    const SubNavBarItemSearch = document.getElementById('SubNavBarItemSearch');
                    if (!SubNavBarItemSearch) return;
                    SubNavBarItemSearch.click();
                }
            },
            subNavBarItems: [
                {
                    title: '推荐歌单',
                    id: 'SubNavBarItemNeteaseRecommandPlayList',
                    onclick: () =>
                    {
                        const mediaContainer = new MediaContainer();
                        const NetEaseRecommandPlayListitem = this.NeteaseRecommendSongListMediaContainerItem();
                        const MediaContainerContent = document.getElementById('MediaContainerContent');
                        if (!MediaContainerContent) return;
                        const newMediaContainerContent = mediaContainer.createMediaContainerContent(NetEaseRecommandPlayListitem, 'rgb(221, 28, 4)');
                        const parent = MediaContainerContent.parentElement;
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
                    },
                    item: NetEaseRecommandPlayListitem
                },
                {
                    title: '搜索歌曲',
                    id: 'SubNavBarItemSearch',
                    onclick: () =>
                    {
                        const MediaContainerContent = document.getElementById('MediaContainerContent');
                        if (!MediaContainerContent) return;

                        const mediaSearchBarInput = document.getElementById('mediaSearchBarInput');
                        if (!mediaSearchBarInput) return;
                        if (mediaSearchBarInput.innerHTML === '') return;
                        const keyword = mediaSearchBarInput.innerHTML;
                        const NeteaseSearchMediaContainerItem = this.NeteaseSearchMediaContainerItem(keyword);

                        const mediaContainer = new MediaContainer();
                        const newMediaContainerContent = mediaContainer.createMediaContainerContent(NeteaseSearchMediaContainerItem, 'rgb(221, 28, 4)');
                        const parent = MediaContainerContent.parentElement;
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

    private async NeteaseRecommendSongListMediaContainerItem()
    {
        const neteaseSearchAPI = new NeteaseSearchAPI();
        let mediaContainerItem: MediaContainerItem[] = [];
        const item = neteaseSearchAPI.NeteaseRecommandPlayList();
        let x: Promise<MediaContainerItem[] | null>[] = [];
        item.then(element =>
        {
            if (!element) return;
            element.forEach((elementItem, index) =>
            {
                elementItem.MediaRequest = () =>
                {
                    const iiROSE_MEDIASelectHolder = new IIROSE_MEDIASelectHolder();
                    const item: SelectHolderItem[] = [{
                        id: 'sequence',
                        title: '正序点播',
                        onclick: () =>
                        {
                            const neteaseMusicAPI = new NeteaseMusicAPI();
                            const data = neteaseMusicAPI.getSongListDetail(elementItem.id);
                            let count = 0;
                            data.then(element =>
                            {
                                if (!element) return;
                                const socket = new Socket();
                                const sMedia = new Media();
                                element.playlist.trackIds.forEach((element, index) =>
                                {
                                    const songResource = neteaseMusicAPI.getSongResource(element.id);
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
                                            bitRate: 0,
                                            color: 'FFFFFF',
                                            lyrics: songResource.lrc_control,
                                            origin: 'netease'
                                        };
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
                };
            });
        });
        x.push(item);
        return x;
    }

    private async NeteaseSearchMediaContainerItem(keyword: string)
    {
        const neteaseSearchAPI = new NeteaseSearchAPI();
        const limit = 100;
        const searchData = await neteaseSearchAPI.getNeteaseMusicSearchData(keyword, limit);

        let mediaContainerItem: MediaContainerItem[] = [];
        if (!searchData || !searchData.result || !searchData.result.songs) return null;
        let x: Promise<MediaContainerItem[] | null>[] = [];
        let index = 0;
        for (const searchDataElement of searchData.result.songs)
        {
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
                        const songResource = neteaseMusicAPI.getSongResource(searchDataElement.id);
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
                                bitRate: 0,
                                color: 'FFFFFF',
                                lyrics: songResource.lrc_control,
                                origin: 'netease'
                            };
                            socket.sendMessage(sMedia.mediaCard(mediaData));
                            socket.sendMessage(sMedia.mediaEvent(mediaData));

                        });
                    }
                };
                return mediaContainerItem;
            });

            x.push(PromiseMediaContainerItem);
            index += 1;
            if (index >= 10) break;
        };
        const mediaContainer = new MediaContainer();
        let songCount: number;
        if (searchData.result.songCount < limit && searchData.result.songCount <= 100)
        {
            songCount = searchData.result.songCount;
        } else
        {
            songCount = limit;
        }
        let songSIDs: number[] = [];
        searchData.result.songs.forEach((element, index) =>
        {
            songSIDs.push(element.id);
        });
        mediaContainer.updatePagination(1, songSIDs);
        return x;
    }

    public async NeteaseSearchMediaContainerByIDs(currentPage: number, fullPage: number, id: number[])
    {
        const neteaseMusicAPI = new NeteaseMusicAPI();
        const itemPerPage = 10;
        const StartItem = (currentPage - 1) * itemPerPage;
        let mediaContainerItem: MediaContainerItem[] = [];
        id = id.slice(StartItem, StartItem + itemPerPage);
        let x: Promise<MediaContainerItem[] | null>[] = [];
        id.forEach((idElement, index) =>
        {
            if (index === itemPerPage) return;
            const songDetail = neteaseMusicAPI.getNeteaseSongDetailFromXC(idElement);
            const PromiseMediaContainerItem = songDetail.then(songDetailElement =>
            {
                if (!songDetailElement || ! songDetailElement.songs) return null;
                mediaContainerItem[0] = {
                    id: idElement,
                    title: songDetailElement.songs[0].name,
                    img: songDetailElement.songs[0].al.picUrl,
                    url: `https://music.163.com/#/song?id=${idElement}`,
                    author: songDetailElement.songs[0].ar[0].name,
                    duration: this.formatMillisecondsToMinutes(songDetailElement.songs[0].dt),
                    MediaRequest: () =>
                    {
                        const socket = new Socket();
                        const sMedia = new Media();
                        const neteaseMusicAPI = new NeteaseMusicAPI();
                        const songResource = neteaseMusicAPI.getSongResource(idElement);
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
                                bitRate: 0,
                                color: 'FFFFFF',
                                lyrics: songResource.lrc_control,
                                origin: 'netease'
                            };
                            socket.sendMessage(sMedia.mediaCard(mediaData));
                            socket.sendMessage(sMedia.mediaEvent(mediaData));

                        });
                    }
                };
                console.log(mediaContainerItem[0].title)
                return mediaContainerItem;
            });
            x.push(PromiseMediaContainerItem);
        });
        return x
    }
}