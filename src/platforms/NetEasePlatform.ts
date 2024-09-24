import { NeteaseMusicAPI } from "../Api/NeteaseAPI/NeteaseMusic";
import { SongDetailFromBinaryify, SongDetailSong } from "../Api/NeteaseAPI/NeteaseMusic/SongDetailInterface";
import { xcSongResource } from "../Api/NeteaseAPI/NeteaseMusic/SongList";
import { NeteaseSearchAPI } from "../Api/NeteaseAPI/NeteaseSearch";
import { RecommendSongList } from "../Api/NeteaseAPI/NeteaseSearch/RecommendInterface";
import { SearchData } from "../Api/NeteaseAPI/NeteaseSearch/SearchInterface";
import { IIROSEUtils } from "../iirose_func/IIROSEUtils";
import { ShowMessage } from "../iirose_func/ShowMessage";
import { Socket } from "../iirose_func/Socket";
import { Media } from "../iirose_func/Socket/Media";
import { MediaData } from "../iirose_func/Socket/Media/MediaCardInterface";
import { NetEaseSettings } from "../settings/neteaseSettings/NetEaseSettings";
import { PlatformData } from "./interfaces";

export class NetEasePlatform
{
    neteaseSearch = new NeteaseSearchAPI();
    neteaseMusicApi = new NeteaseMusicAPI();
    pageSize = 10;
    showmessage = new ShowMessage();
    neteaseSetting = new NetEaseSettings().getNeteaseMusicSetting();
    baseHex = '00000'

    public async buildSelect(action: (select: number) => Promise<void>)
    {
        function cb(t: HTMLElement, s: string)
        {
            const selectNumber = parseInt(s);
            action(selectNumber);
        }

        function enterCB() { }

        const select = [
            [0, '正序点播', `<div class="mdi-sort-alphabetical-variant" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`],
            [1, '乱序点播', `<div class="mdi-sort" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`],
        ]

        const startElement = null;

        const multiSelect = false;

        const allowClear = false;

        const showIcon = true;

        const topHTMLELEMENT = null;

        const bottomHTMLELEMENT = null;

        const iiROSEUtils = new IIROSEUtils();

        iiROSEUtils.buildSelect2(
            startElement,
            select,
            cb,
            allowClear,
            showIcon,
            topHTMLELEMENT,
            multiSelect,
            bottomHTMLELEMENT,
            enterCB
        )

    }

    /**
     * 推荐歌单
     * @returns 
     */
    public async searchForRecommendPlayListBasicsData()
    {
        const platformData: PlatformData[] = [];
        const allPlatformData: PlatformData[] = [];
        const limit = 100;
        const xcAPI = window?.netease?.xcAPI;
        const theresaAPI = window?.netease?.theresaAPI;
        const neteaseAPI = this.neteaseSetting.api;
        let totalPage = Math.ceil(limit / this.pageSize);

        try
        {
            let res: RecommendSongList | null = null
            if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
            {
                res = await this.neteaseSearch.getNeteaseRecommandPlayListFromBinaryify(limit, neteaseAPI, false);
            } else
            {
                res = await this.neteaseSearch.getNeteaseRecommandPlayList(limit)
            }
            if (!res || !res.result)
            {
                // const res = await this.neteaseSearch.NeteaseRecommandPlayList()
                return { platformData: [], totalPage: 0 }
            }

            const playList = res.result;
            const totalResult = playList.length;
            totalPage = Math.ceil(totalResult / this.pageSize);

            let count = 0;

            for (const item of playList)
            {
                const data: PlatformData = {
                    title: item.name,
                    coverImg: item.picUrl,
                    author: `首页推荐歌单`, // 推荐歌单接口默认没有作者信息
                    websiteUrl: `https://music.163.com/#/playlist?id=${item.id}`,
                    trackCount: `${item.trackCount}`,
                    neteaseMusic: {
                        id: item.id,
                        isSongList: true
                    }
                }

                if (count >= this.pageSize)
                {
                    allPlatformData.push(data);
                } else
                {
                    allPlatformData.push(data);
                    platformData.push(data);
                }
                count++;
            }

            return { platformData, totalPage, allPlatformData }

        } catch (error)
        {
            this.showmessage.show((error as Error).message);
            this.showmessage.show('遇到了一些问题，你可以在设置中切换API以解决');
            return { platformData: [], totalPage: 0 }
        }


    }

    /**
     * 搜索歌单
     * @param keyword 
     * @param page 
     * @returns 
     */
    public async searchForMusicsBasicsData(keyword: string, page: number)
    {
        const xcAPI = window.netease?.xcAPI
        const theresaAPI = window.netease?.theresaAPI
        try
        {
            let offset = (page - 1) * 100;
            const platformData: PlatformData[] = [];
            const allPlatformData: PlatformData[] = [];
            let searchData: SearchData | null = null

            const neteaseAPI = this.neteaseSetting.api

            if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
            {
                searchData = await this.neteaseSearch.getNeteaseSearchDataFromBinaryify(keyword, 1, offset, neteaseAPI);
            } else
            {
                searchData = await this.neteaseSearch.getNeteaseMusicSearchData(keyword, 1, offset);
            }

            if (!searchData || !searchData.result || !searchData.result.songs || !searchData.result.songCount)
            {

                return { platformData: [], totalPage: 0, allPlatformData: [] }
            }

            const ids = searchData.result.songs.map((item) => item.id);

            let songDetailFromBinaryify: SongDetailFromBinaryify | null = null

            let songDetail: SongDetailSong[] | null = null

            if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
            {
                songDetailFromBinaryify = await this.neteaseMusicApi.getNeteaseSongDetailFromBinaryify(ids, neteaseAPI)
            } else
            {
                songDetail = await this.neteaseMusicApi.getNeteaseSongDetail(ids);
            }

            const totalResult = searchData.result.songCount;

            const totalPage = Math.ceil(totalResult / this.pageSize);

            let count = 0;

            if (songDetailFromBinaryify && songDetailFromBinaryify.songs)
            {
                for (const item of songDetailFromBinaryify.songs)
                {

                    const data: PlatformData = {
                        title: item.name,
                        subtitle: item?.tns?.[0] || item.alia[0],
                        coverImg: item.al.picUrl,
                        author: item.ar[0].name,
                        websiteUrl: `https://music.163.com/#/song?id=${item.id}`,
                        duration: Math.ceil((item.dt + 2000) / 1000),
                        neteaseMusic: {
                            id: item.id
                        }
                    }

                    if (count >= this.pageSize)
                    {
                        allPlatformData.push(data);
                    } else
                    {
                        allPlatformData.push(data);
                        platformData.push(data);
                    }
                    count++;
                }
            } else if (songDetail && songDetail.length > 0)
            {
                for (const item of songDetail)
                {
                    const data: PlatformData = {
                        title: item.name,
                        subtitle: item?.transNames?.[0] || item.alias[0],
                        coverImg: item.album.picUrl || item.album.blurPicUrl,
                        author: item.artists[0].name,
                        websiteUrl: `https://music.163.com/#/song?id=${item.id}`,
                        duration: Math.ceil((item.duration) / 1000),
                        neteaseMusic: {
                            id: item.id
                        }
                    }
                    if (count >= this.pageSize)
                    {
                        allPlatformData.push(data);
                    } else
                    {
                        allPlatformData.push(data);
                        platformData.push(data);
                    }
                    count++;
                }
            } else
            {
                return { platformData: [], totalPage: 0, allPlatformData: [] }
            }
            return { platformData, totalPage, allPlatformData }

        } catch (error)
        {
            this.showmessage.show((error as Error).message);
            this.showmessage.show('遇到了一些问题，你可以在设置中切换API以解决');
            return { platformData: [], totalPage: 0, allPlatformData: [] }
        }





    }

    /**
     * @description 搜索歌单
     * @param keyword 
     * @param page 
     * @returns 
     */
    public async searchForMusicListBasicsData(keyword: string, page: number)
    {
        try
        {

            let offset = (page - 1) * 100;
            const xcAPI = window.netease?.xcAPI
            const theresaAPI = window.netease?.theresaAPI
            const neteaseAPI = this.neteaseSetting.api

            let searchData: SearchData | null = null

            if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
            {
                searchData = await this.neteaseSearch.getNeteaseSearchDataFromBinaryify(keyword, 1000, offset, neteaseAPI);
            } else
            {
                searchData = await this.neteaseSearch.getNeteaseMusicSearchData(keyword, 1000, offset);
            }

            if (!searchData || !searchData.result || !searchData.result.playlists || !searchData.result.playlistCount)
            {
                return { platformData: [], totalPage: 0, allPlatformData: [] }
            }

            const platformData: PlatformData[] = [];

            const allPlatformData: PlatformData[] = [];

            const totalResult = searchData.result.playlistCount;


            const totalPage = Math.ceil(totalResult / this.pageSize);

            let count = 0;

            for (const item of searchData.result.playlists)
            {
                const data: PlatformData = {
                    title: item.name,
                    coverImg: item.coverImgUrl,
                    author: item.creator.nickname,
                    websiteUrl: `https://music.163.com/#/playlist?id=${item.id}`,
                    trackCount: `${item.trackCount}`,
                    neteaseMusic: {
                        id: item.id,
                        isSongList: true
                    }
                }

                if (count >= this.pageSize)
                {
                    allPlatformData.push(data);
                } else
                {
                    allPlatformData.push(data);
                    platformData.push(data);
                }

                count++;

            }

            return { platformData, totalPage, allPlatformData }

        } catch (error)
        {
            this.showmessage.show((error as Error).message);
            this.showmessage.show('遇到了一些问题，你可以在设置中切换API以解决');
            return { platformData: [], totalPage: 0, allPlatformData: [] }
        }

    }

    /**
     * @description 搜索专辑
     * @param keyword 
     * @param page 
     * @returns 
     */
    public async searchForAlbumBasicsData(keyword: string, page: number)
    {
        try
        {
            let offset = (page - 1) * 100;

            const xcAPI = window.netease?.xcAPI
            const theresaAPI = window.netease?.theresaAPI
            const neteaseAPI = this.neteaseSetting.api

            let searchData: SearchData | null = null

            if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
            {
                searchData = await this.neteaseSearch.getNeteaseSearchDataFromBinaryify(keyword, 10, offset, neteaseAPI);
            } else
            {
                searchData = await this.neteaseSearch.getNeteaseMusicSearchData(keyword, 10, offset);
            }

            if (!searchData || !searchData.result || !searchData.result.albums || !searchData.result.albumCount)
            {
                return { platformData: [], totalPage: 0, allPlatformData: [] }
            }

            const platformData: PlatformData[] = [];

            const allPlatformData: PlatformData[] = [];

            const totalResult = searchData.result.albumCount;

            // 限制30页是因为超过30页后，数据会错误
            const totalPage = Math.min(Math.ceil(totalResult / this.pageSize), 30);

            let count = 0;

            for (const item of searchData.result.albums)
            {
                const data: PlatformData = {
                    title: item.name,
                    coverImg: item.picUrl,
                    author: item.artist.name,
                    websiteUrl: `https://music.163.com/#/album?id=${item.id}`,
                    trackCount: `${item.size}`,
                    neteaseMusic: {
                        id: item.id,
                        isAlbum: true
                    }
                }

                if (count >= this.pageSize)
                {
                    allPlatformData.push(data);
                } else
                {
                    allPlatformData.push(data);
                    platformData.push(data);
                }

                count++;

            }

            return { platformData, totalPage, allPlatformData }

        } catch (error)
        {
            this.showmessage.show((error as Error).message);
            this.showmessage.show('遇到了一些问题，你可以在设置中切换API以解决');
            return { platformData: [], totalPage: 0, allPlatformData: [] }
        }
    }

    /**
     * @description 搜索MV
     * @param keyword 
     * @param page 
     * @returns 
     */
    public async searchForMVBasicsData(keyword: string, page: number)
    {
        try
        {

            let offset = (page - 1) * 100;
            const xcAPI = window.netease?.xcAPI
            const theresaAPI = window.netease?.theresaAPI
            const neteaseAPI = this.neteaseSetting.api

            let searchData: SearchData | null = null

            if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
            {
                searchData = await this.neteaseSearch.getNeteaseSearchDataFromBinaryify(keyword, 1004, offset, neteaseAPI);
            } else
            {
                searchData = await this.neteaseSearch.getNeteaseMusicSearchData(keyword, 1004, offset);
            }

            if (!searchData || !searchData.result || !searchData.result.mvs || !searchData.result.mvCount)
            {
                return { platformData: [], totalPage: 0, allPlatformData: [] }
            }

            const platformData: PlatformData[] = [];

            const allPlatformData: PlatformData[] = [];

            const totalResult = searchData.result.mvCount;

            const totalPage = Math.ceil(totalResult / this.pageSize);

            let count = 0;


            for (const item of searchData.result.mvs)
            {
                const data: PlatformData = {
                    title: item.name,
                    coverImg: item.cover,
                    duration: item.duration / 1000,
                    author: item.artistName || item.artists[0].name,
                    websiteUrl: `https://music.163.com/#/mv?id=${item.id}`,
                    neteaseMusic: {
                        id: item.id,
                        isMV: true
                    }
                }

                if (count >= this.pageSize)
                {
                    allPlatformData.push(data);
                } else
                {
                    allPlatformData.push(data);
                    platformData.push(data);
                }

                count++;
            }
            return { platformData, totalPage, allPlatformData }

        } catch (error)
        {
            this.showmessage.show((error as Error).message);
            this.showmessage.show('遇到了一些问题，你可以在设置中切换API以解决');
            return { platformData: [], totalPage: 0, allPlatformData: [] }
        }

    }

    /**
     * @description 搜索电台
     * @param keyword 
     * @param page 
     */
    public async searchForRadioBasicsData(keyword: string, page: number)
    {
        try
        {
            let offset = (page - 1) * 100;

            const xcAPI = window.netease?.xcAPI
            const theresaAPI = window.netease?.theresaAPI
            const neteaseAPI = this.neteaseSetting.api

            let searchData: SearchData | null = null

            if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
            {
                searchData = await this.neteaseSearch.getNeteaseSearchDataFromBinaryify(keyword, 1009, offset, neteaseAPI);
            } else
            {
                searchData = await this.neteaseSearch.getNeteaseMusicSearchData(keyword, 1009, offset);
            }

            if (!searchData || !searchData.result || !searchData.result.mvs || !searchData.result.mvCount)
            {
                return { platformData: [], totalPage: 0, allPlatformData: [] }
            }


            if (!searchData || !searchData.result || !searchData.result.djRadios)
            {
                return { platformData: [], totalPage: 0, allPlatformData: [] }
            }

            const platformData: PlatformData[] = [];

            const allPlatformData: PlatformData[] = [];

            const totalResult = searchData.result.djRadios.length;

            const totalPage = Math.ceil(totalResult / this.pageSize);

            let count = 0;

            for (const item of searchData.result.djRadios)
            {
                const data: PlatformData = {
                    title: item.name,
                    coverImg: item.picUrl,
                    author: item.dj.nickname,
                    websiteUrl: `https://music.163.com/#/djradio?id=${item.id}`,
                    multiPage: Promise.resolve(true),
                    neteaseMusic: {
                        id: item.id,
                        isDjRadios: true
                    },
                    trackCount: `${item.programCount}`
                }

                if (count >= this.pageSize)
                {
                    allPlatformData.push(data);
                } else
                {
                    allPlatformData.push(data);
                    platformData.push(data);
                }
                count++;
            }
            return { platformData, totalPage, allPlatformData }
        } catch (error)
        {
            this.showmessage.show((error as Error).message);
            this.showmessage.show('遇到了一些问题，你可以在设置中切换API以解决');
            return { platformData: [], totalPage: 0, allPlatformData: [] }
        }
    }

    public async getRadioMultiPageData(platformData: PlatformData)
    {

        try
        {
            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');

        } catch (error)
        {
            this.showmessage.show((error as Error).message)
            this.showmessage.show('遇到了一些问题，你可以在设置中切换API以解决');
        }

    }

    /**
     * @description 合并歌词
     * @param jpLyrics 
     * @param cnLyrics 
     * @returns 
     */
    private mergeLyrics(jpLyrics: string, cnLyrics: string): string
    {
        const jpLines = jpLyrics.split('\n');
        const cnLines = cnLyrics.split('\n');

        const jpEntries: { [key: string]: string; } = {}
        const cnEntries: { [key: string]: string; } = {}

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

    /**
     * @description 点播歌单
     * @param platformData 
     */
    public async MLOD(platformData: PlatformData)
    {

        const MLODACTION = async (select: number) =>
        {
            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');
            const xcAPI = window.netease?.xcAPI;
            const socket = new Socket();
            const media = new Media();
            const neteaseAPI = this.neteaseSetting.api;
            const id = platformData.neteaseMusic.id;
            const songListDetail = await this.neteaseMusicApi.getSongListDetail(id);
            if (!songListDetail) throw new Error('获取歌单详情失败');

            const trackIds = songListDetail.playlist.trackIds;
            let trackID = trackIds.map((item) => item.id);

            if (select === 1)
            {
                trackID = trackID.sort(() => Math.random() - 0.5);
            }

            if ((xcAPI) && neteaseAPI !== 'default')
            {
                const songDetail = await this.neteaseMusicApi.getNeteaseSongDetailFromBinaryify(trackID, neteaseAPI);
                if (!songDetail || !songDetail.songs) throw new Error('获取歌曲详情失败');
                let count = 0;
                for (const item of songDetail.songs)
                {
                    const songResource = await this.neteaseMusicApi.getSongResource(trackID[count], this.neteaseSetting.quality);

                    if (!songResource) throw new Error('获取歌曲资源失败');
                    const mediaData: MediaData = {
                        type: 'music',
                        name: item.name,
                        singer: item.ar[0].name,
                        cover: item.al.picUrl,
                        link: `https://music.163.com/#/song?id=${item.id}`,
                        url: songResource.url,
                        duration: item.dt / 1000,
                        bitRate: Math.floor(songResource.br / 1000),
                        color: this.baseHex,
                        lyrics: songResource.lrc_control,
                        origin: 'netease'
                    }

                    const mediacard = media.mediaCard(mediaData);
                    const mediaEvent = media.mediaEvent(mediaData);

                    socket.send(mediacard);
                    socket.send(mediaEvent);
                    count++
                }
            } else
            {
                const songDetailSongs = await this.neteaseMusicApi.getNeteaseSongDetail(trackID);
                if (!songDetailSongs) throw new Error('获取歌单详情失败');
                for (const item of songDetailSongs)
                {
                    const playUrl = `https://v.iarc.top//?server=netease&type=url&id=${item.id}#.mp3`

                    const lyrdata = await this.neteaseMusicApi.getLyric(item.id);

                    let lyric = ``;

                    if (lyrdata && lyrdata.lrc && lyrdata.tlyric)
                    {
                        lyric = this.mergeLyrics(lyrdata.lrc.lyric, lyrdata.tlyric.lyric);
                    } else if (lyrdata && lyrdata.lrc)
                    {
                        lyric = lyrdata.lrc.lyric;
                    }


                    const mediaData: MediaData = {
                        type: 'music',
                        name: item.name,
                        singer: item.artists[0].name,
                        cover: item.album.picUrl,
                        link: `https://music.163.com/#/song?id=${item.id}`,
                        url: playUrl,
                        duration: item.duration / 1000,
                        bitRate: 320,
                        color: this.baseHex,
                        lyrics: lyric,
                        origin: 'netease'
                    }

                    const mediacard = media.mediaCard(mediaData);
                    const mediaEvent = media.mediaEvent(mediaData);

                    socket.send(mediacard);
                    socket.send(mediaEvent);
                }

            }

        }

        try
        {
            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');
            this.buildSelect(MLODACTION);

        } catch (error)
        {
            this.showmessage.show((error as Error).message);
        }
    }

    /**
     * @description 点播专辑
     * @param platformData 
     */
    public async AOD(platformData: PlatformData)
    {

        const AODACTION = async (select: number) =>
        {
            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');
            const xcAPI = window.netease?.xcAPI;
            const socket = new Socket();
            const media = new Media();
            const neteaseAPI = this.neteaseSetting.api;
            const theresaAPI = window.netease?.theresaAPI;
            const id = platformData.neteaseMusic.id;
            const albumDetails = await this.neteaseMusicApi.getAlbumDetail(id)

            if (!albumDetails) throw new Error('获取歌单详情失败');

            const Songs = albumDetails.songs;
            let songsID = Songs.map((item) => item.id);

            if (select === 1)
            {
                songsID = songsID.sort(() => Math.random() - 0.5);
            }

            if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
            {
                const songDetail = await this.neteaseMusicApi.getNeteaseSongDetailFromBinaryify(songsID, neteaseAPI);
                if (!songDetail || !songDetail.songs) throw new Error('获取歌曲详情失败');
                let count = 0;
                for (const item of songDetail.songs)
                {
                    const songResource = await this.neteaseMusicApi.getSongResource(songsID[count], this.neteaseSetting.quality);

                    if (!songResource) throw new Error('获取歌曲资源失败');
                    const mediaData: MediaData = {
                        type: 'music',
                        name: item.name,
                        singer: item.ar[0].name,
                        cover: item.al.picUrl,
                        link: `https://music.163.com/#/song?id=${item.id}`,
                        url: songResource.url,
                        duration: item.dt / 1000,
                        bitRate: Math.floor(songResource.br / 1000),
                        color: this.baseHex,
                        lyrics: songResource.lrc_control,
                        origin: 'netease'
                    }

                    const mediacard = media.mediaCard(mediaData);
                    const mediaEvent = media.mediaEvent(mediaData);

                    socket.send(mediacard);
                    socket.send(mediaEvent);
                    count++
                }
            } else
            {
                const songDetailSongs = await this.neteaseMusicApi.getNeteaseSongDetail(songsID);
                if (!songDetailSongs) throw new Error('获取歌单详情失败');
                for (const item of songDetailSongs)
                {
                    const playUrl = `https://v.iarc.top//?server=netease&type=url&id=${item.id}#.mp3`

                    const lyrdata = await this.neteaseMusicApi.getLyric(item.id);

                    let lyric = ``;

                    if (lyrdata && lyrdata.lrc && lyrdata.tlyric)
                    {
                        lyric = this.mergeLyrics(lyrdata.lrc.lyric, lyrdata.tlyric.lyric);
                    } else if (lyrdata && lyrdata.lrc)
                    {
                        lyric = lyrdata.lrc.lyric;
                    }


                    const mediaData: MediaData = {
                        type: 'music',
                        name: item.name,
                        singer: item.artists[0].name,
                        cover: item.album.picUrl,
                        link: `https://music.163.com/#/song?id=${item.id}`,
                        url: playUrl,
                        duration: item.duration / 1000,
                        bitRate: 320,
                        color: this.baseHex,
                        lyrics: lyric,
                        origin: 'netease'
                    }

                    const mediacard = media.mediaCard(mediaData);
                    const mediaEvent = media.mediaEvent(mediaData);

                    socket.send(mediacard);
                    socket.send(mediaEvent);
                }

            }

        }

        try
        {
            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');
            this.buildSelect(AODACTION);
        } catch (error)
        {
            this.showmessage.show((error as Error).message);
        }
    }

    /**
     * @description 点播歌曲
     * @param platformData 
     */
    public async MOD(platformData: PlatformData)
    {

        try
        {
            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');
            const xcAPI = window.netease?.xcAPI
            let xcRes: xcSongResource | null = null
            const id = platformData.neteaseMusic.id
            if (xcAPI)
            {
                xcRes = await this.neteaseMusicApi.getSongResource(id, this.neteaseSetting.quality);
                if (!xcRes) throw new Error('获取歌曲资源失败');
                const media = new Media();

                const mediaData: MediaData = {
                    type: 'music',
                    name: platformData.title,
                    singer: platformData.author,
                    cover: platformData.coverImg,
                    link: platformData.websiteUrl,
                    url: xcRes.url,
                    duration: xcRes.time / 1000,
                    bitRate: Math.floor(xcRes.br / 1000),
                    color: this.baseHex,
                    lyrics: xcRes.lrc_control,
                    origin: 'netease'
                }

                const mediacard = media.mediaCard(mediaData);
                const mediaEvent = media.mediaEvent(mediaData);
                const socket = new Socket();
                socket.send(mediacard);
                socket.send(mediaEvent);

            } else
            {

                const playUrl = `https://v.iarc.top//?server=netease&type=url&id=${id}#.mp3`
                let duration = 0

                if (platformData.duration)
                {
                    duration = platformData.duration
                } else
                {
                    duration = 100000
                }

                const lyrdata = await this.neteaseMusicApi.getLyric(id);
                let lyric = ``;
                if (lyrdata && lyrdata.lrc && lyrdata.tlyric)
                {
                    lyric = this.mergeLyrics(lyrdata.lrc.lyric, lyrdata.tlyric.lyric);
                } else if (lyrdata && lyrdata.lrc)
                {
                    lyric = lyrdata.lrc.lyric;
                }
                const media = new Media();

                const mediaData: MediaData = {
                    type: 'music',
                    name: platformData.title,
                    singer: platformData.author,
                    cover: platformData.coverImg,
                    link: platformData.websiteUrl,
                    url: playUrl,
                    duration: duration,
                    bitRate: 320,
                    color: this.baseHex,
                    lyrics: lyric,
                    origin: 'netease'
                }

                const mediacard = media.mediaCard(mediaData);
                const mediaEvent = media.mediaEvent(mediaData);
                const socket = new Socket();
                socket.send(mediacard);
                socket.send(mediaEvent);
            }


        } catch (error)
        {
            this.showmessage.show((error as Error).message);
        }


    }

    public async MVOD(platformData: PlatformData)
    {

        try
        {
            if (!platformData.neteaseMusic || !platformData.duration) throw new Error('没有网易云音乐数据');

            const xcAPI = window.netease?.xcAPI
            let xcRes: xcSongResource | null = null
            const id = platformData.neteaseMusic.id
            if (xcAPI)
            { } else
            { }

            const res = await this.neteaseMusicApi.getMVPlayURL(id);

            if (!res || !res.data) throw new Error('获取MV资源失败');

            if (res.data.msg) throw new Error(res.data.msg);

            const playUrl = res.data.url;

            const media = new Media();

            const mediaData: MediaData = {
                type: 'video',
                name: platformData.title,
                singer: platformData.author,
                cover: platformData.coverImg,
                link: platformData.websiteUrl,
                url: playUrl,
                duration: platformData.duration,
                bitRate: 1080,
                color: this.baseHex,
                origin: 'netEaseMV'
            }

            const mediacard = media.mediaCard(mediaData);

            const mediaEvent = media.mediaEvent(mediaData);

            const socket = new Socket();

            socket.send(mediacard);
            socket.send(mediaEvent);

        } catch (error)
        {
            this.showmessage.show((error as Error).message);
        }

    }

}