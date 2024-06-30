import { NeteaseMusicAPI } from "../Api/NeteaseAPI/NeteaseMusic";
import { NeteaseSearchAPI } from "../Api/NeteaseAPI/NeteaseSearch/index";
import { IIROSE_MEDIASelectHolder } from "../IIROSE-MEDIA/elements/IIROSE_MEDIASelectHolder";
import { MediaContainerUtils } from "../IIROSE-MEDIA/MediaContainer";
import { Pagination } from "../UpdateDOM/Pagination/Pagination";
import { MediaContainerItem, MediaContainerNavBarPlatform, MediaItem } from "../IIROSE-MEDIA/interfaces/MediaContainerInterface";
import { SelectHolderItem } from "../IIROSE-MEDIA/interfaces/SelectHolderItemInterface";
import { Socket } from "../Socket";
import { Media } from "../Socket/Media";
import { MediaData } from "../Socket/Media/MediaCardInterface";
import { UpdateDom } from "../UpdateDOM";
import { MediaContainerMessage } from "../IIROSE-MEDIA/elements/MediaContainerMessage";
import { NeteaseSetting } from "./SettingInterface";

export class Music
{
    neteaseSetting = this.getNeteaseSetting();
    neteaseSongListCollectLSKeyWord = 'neteaseSongListCollect';
    neteaseSongCollectLSKeyword = 'neteaseSongCollect';
    pagination: Pagination
    mcu: MediaContainerUtils

    constructor(mcu: MediaContainerUtils)
    {
        this.mcu = mcu;
        this.pagination = new Pagination(mcu)
    }

    public music()
    {
        const platforms: MediaContainerNavBarPlatform[] = [
            this.netease()
        ];

        return platforms;
    }

    private netease()
    {
        return {
            id: 'Netease',
            containerID: 'MusicContainer',
            title: '网易云音乐',
            iconsrc: 'https://static.codemao.cn/rose/v0/images/system/media/music/NeteaseMusic/logo.png',
            buttonBackgroundColor: 'rgb(221, 28, 4)',
            inputEvent: {
                title: '请输入搜索关键词',
                InputAreaConfirmBtnOnClick: (userInput: string | null) =>
                {
                    const mediaSearchBarInput = document.getElementById('mediaSearchBarInput');
                    if (!mediaSearchBarInput) return;
                    if (!userInput) return;
                    mediaSearchBarInput.innerHTML = userInput;
                    const SubNavBarItemSearchMusic = document.getElementById('SubNavBarItemSearchMusic');
                    if (!SubNavBarItemSearchMusic) return;
                    const subNavBarItemActive = document.querySelector('.subNavBarItemActive') as HTMLDivElement;
                    if (subNavBarItemActive)
                    {
                        if (subNavBarItemActive.classList.contains('SubNavBarItemSearch')) subNavBarItemActive.click();
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
                        let MediaContainerContent = document.getElementById('MediaContainerContent');
                        const mediaContainers = document.querySelectorAll('.MediaContainer');
                        const NetEaseRecommandPlayListitem = this.neteaseRecommendSongListMediaContainerItem();



                        if (mediaContainers.length > 1)
                        {
                            MediaContainerContent = null;
                        }
                        const parent = mediaContainers[1] ? mediaContainers[1] : mediaContainers[0];
                        if (!parent) return;
                        if (!MediaContainerContent)
                        {
                            this.mcu.createMediaContainerContent(NetEaseRecommandPlayListitem, 'rgb(221, 28, 4)', parent);
                        } else
                        {
                            this.pagination.updatePaginationNotings();
                            this.mcu.createMediaContainerContent(NetEaseRecommandPlayListitem, 'rgb(221, 28, 4)', parent);
                        }

                    }
                },
                {
                    title: '搜索歌曲',
                    class: 'SubNavBarItemSearch',
                    id: 'SubNavBarItemSearchMusic',
                    onclick: () =>
                    {
                        const MediaContainerContent = document.getElementById('MediaContainerContent');
                        if (!MediaContainerContent) return;

                        const mediaSearchBarInput = document.getElementById('mediaSearchBarInput');
                        if (!mediaSearchBarInput) return;
                        if (mediaSearchBarInput.innerHTML === '')
                        {
                            // const containerMsgWrapper = document.querySelector('.containerMsgWrapper');
                            // if (containerMsgWrapper) return;
                            MediaContainerContent.style.opacity = '0';
                            MediaContainerContent.addEventListener('transitionend', () =>
                            {
                                const mediaContainerDisplay = new MediaContainerMessage();
                                mediaContainerDisplay.displayMessage('rgb(221, 28, 4)', 1, MediaContainerContent, this.mcu);
                                return;
                            }, { once: true });
                            return;
                        }
                        this.pagination.updatePaginationNotings();
                        const keyword = mediaSearchBarInput.innerHTML;
                        const NeteaseSearchMediaContainerItem = this.NeteaseSearchMediaContainerItem(keyword);
                        const parent = MediaContainerContent.parentElement;
                        if (!parent) return;
                        this.mcu.createMediaContainerContent(NeteaseSearchMediaContainerItem, 'rgb(221, 28, 4)', parent);

                    }

                }
            ]
        };
    }

    private getNeteaseSetting(): NeteaseSetting
    {
        const neteaseSetting = localStorage.getItem('neteaseSetting');
        if (neteaseSetting)
        {
            return JSON.parse(neteaseSetting) as NeteaseSetting;
        } else
        {
            return {
                quality: 'lossless'
            };
        }
    }

    private formatMillisecondsToMinutes(sec: number): string
    {
        const totalSeconds = Math.floor(sec);
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
        const limit = 100; const RecommandPlayList = await neteaseSearchAPI.getNeteaseRecommandPlayListXC(limit, false);
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

                const author = songListDetailElement.playlist.creator.nickname;

                const item: MediaContainerItem = {
                    id: resultElement.id || 0,
                    title: resultElement.name,
                    img: resultElement.picUrl,
                    url: `https://music.163.com/#/playlist?id=${resultElement.id}`,
                    author: author,
                    duration: `歌单/${resultElement.trackCount}首`,
                    collect: {
                        collectFolder: '歌单默认收藏夹',
                        lsKeyWord: this.neteaseSongListCollectLSKeyWord
                    },
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
                                data.then(element =>
                                {
                                    if (!element) return;
                                    const socket = new Socket();
                                    const sMedia = new Media();
                                    element.playlist.trackIds.forEach((element) =>
                                    {
                                        const songDetail = this.processSongDetail(element.id);
                                        const songResource = this.ProcessSongResource(element.id);
                                        songDetail.then(songDetailElement =>
                                        {
                                            songResource.then(songResource =>
                                            {

                                                if (!element) return;
                                                if (!songResource) return;
                                                if (!songDetailElement) return;
                                                const name = songDetailElement.singer;
                                                const pic = songDetailElement.cover;
                                                const duration = songDetailElement.duration;
                                                const mediaData: MediaData = {
                                                    type: 'music',
                                                    name: name,
                                                    singer: author,
                                                    cover: pic,
                                                    link: `https://music.163.com/#/song?id=${element.id}`,
                                                    url: songResource.url,
                                                    duration: duration,
                                                    bitRate: songResource.br,
                                                    color: 'FFFFFF',
                                                    lyrics: songResource.lyric,
                                                    origin: 'netease'
                                                };
                                                // 开了这个，速度大打折扣
                                                // const iImageTools = new ImageTools()
                                                // iImageTools.getImageAverageColor(mediaData.cover, 0.5).then(color => {
                                                //     mediaData.color = color
                                                //     console.log(color)
                                                //     socket.send(sMedia.mediaCard(mediaData), color)
                                                // })
                                                // console.log(mediaData)
                                                socket.send(sMedia.mediaCard(mediaData));
                                                socket.send(sMedia.mediaEvent(mediaData));

                                            });
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
                };
                mediaContainerItem.push(item);
                return mediaContainerItem;
            });
            x.push(PromiseMediaContainerItem);
            index += 1;
            if (index >= 10) break;
        }

        const mediaItem: MediaItem[] = [];
        RecommandPlayList.result.forEach((element, index) =>
        {
            mediaItem[index] = {
                id: element.id,
                title: element.name,
                img: element.picUrl,
                url: `https://music.163.com/#/playlist?id=${element.id}`,
            };
        });
        this.pagination.updatePaginationNeteasePlayList(1, mediaItem);
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
            const songDetail = this.processSongDetail(searchDataElement.id);
            const PromiseMediaContainerItem = songDetail.then(songDetailElement =>
            {
                if (!songDetailElement) return null;
                const singer = songDetailElement.singer;
                const img = songDetailElement.cover;
                const duration = songDetailElement.duration;
                let name = songDetailElement.name;
                const subTitle = songDetailElement.subTitle;
                mediaContainerItem[0] = {
                    id: searchDataElement.id,
                    title: name,
                    subTitle: subTitle,
                    img: img,
                    url: `https://music.163.com/#/song?id=${searchDataElement.id}`,
                    author: singer,
                    duration: this.formatMillisecondsToMinutes(duration),
                    collect: {
                        collectFolder: '歌曲默认收藏夹',
                        lsKeyWord: this.neteaseSongCollectLSKeyword
                    },
                    MediaRequest: () =>
                    {
                        const socket = new Socket();
                        const sMedia = new Media();
                        const updateDom = new UpdateDom();
                        updateDom.changeStatusIIROSE_MEDIA();
                        const songResource = this.ProcessSongResource(searchDataElement.id);
                        songResource.then(songResource =>
                        {
                            if (!songDetailElement) return null;
                            if (!songResource) return null;
                            let linkname = name;
                            if (subTitle)
                            {
                                linkname = `${name} - ${subTitle}`;
                            }
                            const mediaData: MediaData = {
                                type: 'music',
                                name: linkname,
                                singer: singer,
                                cover: img,
                                link: `https://music.163.com/#/song?id=${searchDataElement.id}`,
                                url: songResource.url,
                                duration: duration,
                                bitRate: songResource.br,
                                color: 'FFFFFF',
                                lyrics: songResource.lyric,
                                origin: 'netease'
                            };
                            socket.send(sMedia.mediaCard(mediaData));
                            socket.send(sMedia.mediaEvent(mediaData));

                        });
                    }
                };
                return mediaContainerItem;
            });
            x.push(PromiseMediaContainerItem);
            index += 1;
            if (index >= 10) break;
        }
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
            };
        });
        this.pagination.updatePaginationNeteaseMusic(1, MediaItem);
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
        const itemPerPage = 10;
        const StartItem = (currentPage - 1) * itemPerPage;
        const mediaContainerItem: MediaContainerItem[] = [];
        mediaItems = mediaItems.slice(StartItem, StartItem + itemPerPage);
        const x: Promise<MediaContainerItem[] | null>[] = [];
        mediaItems.forEach((mediaItem, index) =>
        {
            if (index === itemPerPage) return;
            const songDetail = this.processSongDetail(mediaItem.id);
            const PromiseMediaContainerItem = songDetail.then(songDetailElement =>
            {
                if (!songDetailElement) return null;
                const singer = songDetailElement.singer;
                const img = songDetailElement.cover;
                const duration = songDetailElement.duration;
                let name = songDetailElement.name;
                const subTitle = songDetailElement.subTitle;
                mediaContainerItem[0] = {
                    id: mediaItem.id,
                    title: songDetailElement.name,
                    img: img,
                    subTitle: subTitle,
                    url: `https://music.163.com/#/song?id=${mediaItem.id}`,
                    author: singer,
                    duration: this.formatMillisecondsToMinutes(duration),
                    collect: {
                        collectFolder: '歌曲默认收藏夹',
                        lsKeyWord: this.neteaseSongCollectLSKeyword
                    },
                    MediaRequest: () =>
                    {
                        const socket = new Socket();
                        const sMedia = new Media();
                        const updateDom = new UpdateDom();
                        updateDom.changeStatusIIROSE_MEDIA();

                        const sr = this.ProcessSongResource(mediaItem.id);

                        sr.then((data) =>
                        {
                            if (!data) return;
                            let linkname = name;
                            if (subTitle) linkname = `${name} - ${subTitle}`;
                            const mediaData: MediaData = {
                                type: 'music',
                                name: linkname,
                                singer: singer,
                                cover: img,
                                link: `https://music.163.com/#/song?id=${mediaItem.id}`,
                                url: data.url,
                                duration: duration,
                                bitRate: data.br,
                                color: 'FFFFFF',
                                lyrics: data.lyric,
                                origin: 'netease'
                            };

                            socket.send(sMedia.mediaCard(mediaData));
                            socket.send(sMedia.mediaEvent(mediaData));

                        });
                    }
                };
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
    public async NeteaseRecommendSongListMediaContainerItemByIDs(currentPage: number, mediaItems: MediaItem[])
    {
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
                                data.then(element =>
                                {
                                    if (!element) return;
                                    const socket = new Socket();
                                    const sMedia = new Media();
                                    element.playlist.trackIds.forEach((element) =>
                                    {
                                        const songResource = this.ProcessSongResource(element.id);
                                        const songdetail = this.processSongDetail(element.id);
                                        songdetail.then(songDetailElement =>
                                        {
                                            songResource.then(songResource =>
                                            {

                                                if (!element) return;
                                                if (!songResource) return;
                                                if (!songdetail) return;
                                                const mediaData: MediaData = {
                                                    type: 'music',
                                                    name: songDetailElement.name,
                                                    singer: songDetailElement.singer,
                                                    cover: songDetailElement.cover,
                                                    link: `https://music.163.com/#/song?id=${element.id}`,
                                                    url: songResource.url,
                                                    duration: songDetailElement.duration,
                                                    bitRate: songResource.br,
                                                    color: 'FFFFFF',
                                                    lyrics: songResource.lyric,
                                                    origin: 'netease'
                                                };
                                                // 开了这个，速度大打折扣
                                                // const iImageTools = new ImageTools()
                                                // iImageTools.getImageAverageColor(mediaData.cover, 0.5).then(color => {
                                                //     mediaData.color = color
                                                //     console.log(color)
                                                //     socket.send(sMedia.mediaCard(mediaData), color)
                                                // })
                                                // console.log(mediaData)
                                                socket.send(sMedia.mediaCard(mediaData));
                                                socket.send(sMedia.mediaEvent(mediaData));

                                            });
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
                };
                mediaContainerItem.push(item);
                return mediaContainerItem;
            });
            x.push(PromiseMediaContainerItem);
        }
        return x;
    }

    public async ProcessSongResource(id: number)
    {
        const neteaseMusicAPI = new NeteaseMusicAPI();
        if (window.netease && window.netease.xc)
        {

            const songResource = await neteaseMusicAPI.getSongResource(id, this.neteaseSetting.quality);
            if (!songResource) return null;

            const url = songResource.url;
            const lyric = songResource.lrc_control;
            const br = Math.floor(songResource.br / 1000);

            return { url, lyric, br };
        } else
        {

            const songResource = await neteaseMusicAPI.imoeGetSongResource(id);
            let url;
            let br;
            let lyric = ``;
            // if(!songResource) {
            //     url = `https://cors-anywhere-iirose-uest-web-gjtxhfvear.cn-beijing.fcapp.run/https://v.iarc.top//?server=netease&type=url&id=${id}#.mp3`;
            //     br = 320;
            //     const lyrdata = await neteaseMusicAPI.getLyric(id);
            //     if (lyrdata && lyrdata.lrc && lyrdata.tlyric)
            //     {
            //         lyric = this.mergeLyrics(lyrdata.lrc.lyric, lyrdata.tlyric.lyric);
            //     } else if (lyrdata && lyrdata.lrc)
            //     {
            //         lyric = lyrdata.lrc.lyric;
            //     }
            // }else {
            //     url = songResource.url;
            //     br = songResource.br;
            //     if (songResource.lrc)
            //     {
            //         lyric = songResource.lrc_control;
            //     }
            // }  

            url = `https://cors-anywhere-iirose-uest-web-gjtxhfvear.cn-beijing.fcapp.run/https://v.iarc.top//?server=netease&type=url&id=${id}#.mp3`;
            br = 320;
            const lyrdata = await neteaseMusicAPI.getLyric(id);
            if (lyrdata && lyrdata.lrc && lyrdata.tlyric)
            {
                lyric = this.mergeLyrics(lyrdata.lrc.lyric, lyrdata.tlyric.lyric);
            } else if (lyrdata && lyrdata.lrc)
            {
                lyric = lyrdata.lrc.lyric;
            }

            return { url, lyric, br };
        }


    }

    private mergeLyrics(jpLyrics: string, cnLyrics: string): string
    {
        const jpLines = jpLyrics.split('\n');
        const cnLines = cnLyrics.split('\n');

        const jpEntries: { [key: string]: string; } = {};
        const cnEntries: { [key: string]: string; } = {};

        // Parse Japanese lyrics
        for (const line of jpLines)
        {
            const timeRegex = /\[(\d+:\d+\.\d+)\]/;
            const timeMatch = line.match(timeRegex);
            if (timeMatch)
            {
                const time = timeMatch[1];
                const content = line.replace(timeRegex, '').trim();
                jpEntries[time] = content;
            }
        }

        // Parse Chinese lyrics
        for (const line of cnLines)
        {
            const timeRegex = /\[(\d+:\d+\.\d+)\]/;
            const timeMatch = line.match(timeRegex);
            if (timeMatch)
            {
                const time = timeMatch[1];
                const content = line.replace(timeRegex, '').trim();
                cnEntries[time] = content;
            }
        }

        // Merge and format
        const mergedLines: { time: string; content: string; translation: string; }[] = [];
        for (const time in jpEntries)
        {
            const jpContent = jpEntries[time];
            const cnContent = cnEntries[time] || ''; // Use empty string if no translation

            mergedLines.push({ time, content: jpContent, translation: cnContent });
        }

        // Format the merged lines
        const mergedOutput = mergedLines.map(line =>
        {
            const { time, content, translation } = line;
            let outputLine = `[${time}] ${content}`;
            if (translation)
            {
                outputLine += ` | ${translation}`;
            }
            return outputLine;
        }).join('\n');

        return mergedOutput;
    }

    public async processSongDetail(id: number)
    {
        const neteaseMusicAPI = new NeteaseMusicAPI();
        const songDetail = await neteaseMusicAPI.getNeteaseSongDetailFromXC(id);

        let name = '';
        let singer = '';
        let cover = '';
        let subTitle: string | undefined = undefined;
        let duration = 0;
        if (songDetail)
        {
            if (songDetail && songDetail.songs)
            {
                name = `${songDetail.songs[0].name}`;
                subTitle = songDetail.songs[0]?.tns?.[0] || songDetail.songs[0].alia[0];
                singer = songDetail.songs[0].ar[0].name;
                cover = songDetail.songs[0].al.picUrl;
                duration = (songDetail.songs[0].dt + 2000) / 1000;
            }
        } else
        {
            const songDetail = await neteaseMusicAPI.getNeteaseSongDetail(id);
            if (songDetail)
            {
                if (songDetail && songDetail.songs)
                {
                    name = `${songDetail.songs[0].name}`;
                    subTitle = songDetail.songs[0].transName || songDetail.songs[0].alias[0];
                    singer = songDetail.songs[0].artists[0].name;
                    cover = songDetail.songs[0].album.picUrl;
                    duration = (songDetail.songs[0].duration + 2000) / 1000;
                }
            }
        }
        return { name, singer, cover, duration, subTitle };

    }

}