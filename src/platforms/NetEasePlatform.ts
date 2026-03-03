import { NeteaseMusicAPI } from "../Api/NeteaseAPI/NeteaseMusic";
import { NeteaseSearchAPI } from "../Api/NeteaseAPI/NeteaseSearch";
import { SearchData } from "../Api/NeteaseAPI/NeteaseSearch/SearchInterface";
import { IIROSEUtils } from "../iirose_func/IIROSEUtils";
import { ShowMessage } from "../iirose_func/ShowMessage";
import { Socket } from "../iirose_func/Socket";
import { Media } from "../iirose_func/Socket/Media";
import { NetEaseSettings } from "../settings/neteaseSettings/NetEaseSettings";

export class NetEasePlatform
{
    static pageSize = 10;
    static neteaseSetting = NetEaseSettings.getNeteaseMusicSetting();
    static baseHex = '00000'

    public static buildSelect = (action: (select: number) => Promise<void>) =>
    {
        function cb(_t: HTMLElement, s: string)
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


        IIROSEUtils.buildSelect2(
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

    private static Search = async (keyword: string, page: number, type: 'song' | 'playlist' | 'album' | 'mv' | 'radio') =>
    {
        let ids: number[] = [];
        let totalResult = 0;
        let totalPage = 0;
        let mediaCardData: PlatformData[] = [];
        const offset = (page - 1) * 100;
        let searchType = 1;

        if (type === 'song') searchType = 1;
        if (type === 'playlist') searchType = 1000;
        if (type === 'album') searchType = 10;
        if (type === 'mv') searchType = 1004;
        if (type === 'radio') searchType = 1009;

        let searchData: SearchData | null = null


        if (keyword.includes('id='))
        {
            const id = parseInt(keyword.split('id=')[1])
            ids.push(id)

            if (type === 'song')
            {
                return { ids, totalPage: 1 }
            } else if (type === 'playlist')
            {
                let songListDetail: SongList | null = null;
                songListDetail = await NeteaseMusicAPI.getSongListDetail(id);
                if (!songListDetail) return null;
                const playList = songListDetail.playlist;
                mediaCardData = [{
                    title: playList.name,
                    coverImg: playList.coverImgUrl,
                    author: playList.creator?.nickname || '无法获取',
                    websiteUrl: `https://music.163.com/#/playlist?id=${playList.id}`,
                    trackCount: `${playList.trackCount}`,
                    multiPage: Promise.resolve({ platform: 'neteasemusic' }),
                    neteaseMusic: {
                        id: playList.id,
                        isSongList: true,
                        fee: 0
                    }
                }]
                return { ids, totalPage: 1, mediaCardData }
            } else if (type === 'album')
            {
                let albumDetail: AlbumData | null = null;
                albumDetail = await NeteaseMusicAPI.getAlbumDetail(id);


                if (!albumDetail) return null;
                const album = albumDetail.album;
                mediaCardData = [{
                    title: album.name,
                    coverImg: album.picUrl,
                    author: album.artist.name,
                    websiteUrl: `https://music.163.com/#/album?id=${album.id}`,
                    trackCount: `${album.size}`,
                    multiPage: Promise.resolve({ platform: 'neteasemusic' }),
                    neteaseMusic: {
                        id: album.id,
                        isAlbum: true,
                        fee: albumDetail.songs[0].fee
                    }
                }]
                return { ids, totalPage: 1, mediaCardData }
            }
        }

        searchData = await NeteaseSearchAPI.getNeteaseMusicSearchData(keyword, searchType, offset);


        if (!searchData || !searchData.result)
        {

            return null
        }

        const result = searchData.result;

        if (result.songs && result.songCount)
        {
            ids = result.songs.map((item) => item.id);
            totalResult = result.songCount;
        } else if (result.playlists && result.playlistCount)
        {
            ids = result.playlists.map((item) => item.id);
            totalResult = result.playlistCount;
            mediaCardData = result.playlists.map((item) =>
            {
                return {
                    title: item.name,
                    coverImg: item.coverImgUrl,
                    author: item.creator.nickname,
                    websiteUrl: `https://music.163.com/#/playlist?id=${item.id}`,
                    trackCount: `${item.trackCount}`,
                    multiPage: Promise.resolve({ platform: 'neteasemusic' }),
                    neteaseMusic: {
                        id: item.id,
                        isSongList: true,
                        fee: 0
                    }
                }
            })
        } else if (result.albums && result.albumCount)
        {
            ids = result.albums.map((item) => item.id);
            totalResult = result.albumCount;
            mediaCardData = result.albums.map((item) =>
            {
                return {
                    title: item.name,
                    coverImg: item.picUrl,
                    author: item.artist.name,
                    websiteUrl: `https://music.163.com/#/album?id=${item.id}`,
                    trackCount: `${item.size}`,
                    multiPage: Promise.resolve({ platform: 'neteasemusic' }),
                    neteaseMusic: {
                        id: item.id,
                        isAlbum: true,
                        fee: 0
                    }
                }
            })

        } else if (result.mvs && result.mvCount)
        {
            ids = result.mvs.map((item) => item.id);
            totalResult = result.mvCount;
            mediaCardData = result.mvs.map((item) =>
            {
                return {
                    title: item.name,
                    coverImg: item.cover,
                    author: item.artistName || item.artists[0].name,
                    websiteUrl: `https://music.163.com/#/mv?id=${item.id}`,
                    neteaseMusic: {
                        id: item.id,
                        isMV: true,
                        fee: 0
                    }
                }
            }
            )
        } else if (result.djRadios)
        {
            ids = result.djRadios.map((item) => item.id);

            mediaCardData = result.djRadios.map((item) =>
            {
                return {
                    title: item.name,
                    coverImg: item.picUrl,
                    author: item.dj.nickname,
                    websiteUrl: `https://music.163.com/#/djradio?id=${item.id}`,
                    trackCount: `${item.programCount}`,
                    neteaseMusic: {
                        id: item.id,
                        isDjRadios: true,
                        fee: 0
                    }
                }
            }
            )

        } else
        {
            return null
        }

        totalPage = Math.ceil(totalResult / this.pageSize);


        return { ids, totalPage, result: searchData.result, mediaCardData }

    }

    public static getNeteasePlatformData = async (ids: number[], type: 'song' | 'playlist' | 'album' | 'mv' | 'radio') =>
    {

        const PlatformData: PlatformData[] = []

        if (type === 'song')
        {

            const songDetail = await NeteaseMusicAPI.getNeteaseSongDetail(ids);

            if (!songDetail) return null;

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
                        id: item.id,
                        fee: item.fee
                    }
                }
                PlatformData.push(data);
            }
            return PlatformData;
        } else if (type === 'playlist')
        {
            let songListDetail: SongList | null = null;
            songListDetail = await NeteaseMusicAPI.getSongListDetail(ids[0]);


            if (!songListDetail) throw new Error('获取歌单详情失败');

            const platformData: PlatformData = {
                title: songListDetail.playlist.name,
                coverImg: songListDetail.playlist.coverImgUrl,
                author: songListDetail.playlist.creator?.nickname || '无法获取',
                websiteUrl: `https://music.163.com/#/playlist?id=${songListDetail.playlist.id}`,
                trackCount: `${songListDetail.playlist.trackCount}`,
                multiPage: Promise.resolve({ platform: 'neteasemusic' }),
                neteaseMusic: {
                    id: songListDetail.playlist.id,
                    isSongList: true,
                    fee: songListDetail.privileges[0]?.fee || 0
                }
            }

            return [platformData]
        } else if (type === 'album')
        {
            let albumDetails: AlbumData | null = null;
            albumDetails = await NeteaseMusicAPI.getAlbumDetail(ids[0]);


            if (!albumDetails) throw new Error('获取专辑详情失败');
            const platformData: PlatformData = {
                title: albumDetails.album.name,
                coverImg: albumDetails.album.picUrl,
                author: albumDetails.album.artist.name,
                websiteUrl: `https://music.163.com/#/album?id=${albumDetails.album.id}`,
                trackCount: `${albumDetails.album.size}`,
                multiPage: Promise.resolve({ platform: 'neteasemusic' }),
                neteaseMusic: {
                    id: albumDetails.album.id,
                    isAlbum: true,
                    fee: albumDetails.songs[0]?.fee || 0
                }

            }
            return [platformData]
        }
    }

    /**
     * 搜索歌单
     * @param keyword
     * @param page
     * @returns
     */
    public static searchForMusicsBasicsData = async (keyword: string, page: number) =>
    {
        try
        {
            const platformData: PlatformData[] = [];
            const allPlatformData: PlatformData[] = [];

            const searchData = await this.Search(keyword, page, 'song');

            if (!searchData) return { platformData: [], totalPage: 0, allPlatformData: [] }

            const ids = searchData.ids;
            const totalPage = searchData.totalPage;

            const pd = await this.getNeteasePlatformData(ids, 'song');

            if (!pd) return { platformData: [], totalPage: 0, allPlatformData: [] }

            let count = 0;

            for (const item of pd)
            {
                const data = item;
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
            ShowMessage.show((error as Error).message);
            ShowMessage.show('遇到了一些问题，你可以在设置中切换API以解决');
            return { platformData: [], totalPage: 0, allPlatformData: [] }
        }
    }

    /**
     * @description 搜索歌单
     * @param keyword
     * @param page
     * @returns
     */
    public static searchForMusicListBasicsData = async (keyword: string, page: number) =>
    {
        try
        {
            const searchData = await this.Search(keyword, page, 'playlist');
            if (!searchData) return { platformData: [], totalPage: 0, allPlatformData: [] }

            const mediaCardData = searchData.mediaCardData;

            const totalPage = searchData.totalPage;

            const platformData: PlatformData[] = [];

            const allPlatformData: PlatformData[] = [];

            let count = 0;


            if (!mediaCardData) return { platformData: [], totalPage: 0, allPlatformData: [] }

            for (const item of mediaCardData)
            {
                const data = item;

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
            ShowMessage.show((error as Error).message);
            ShowMessage.show('遇到了一些问题，你可以在设置中切换API以解决');
            return { platformData: [], totalPage: 0, allPlatformData: [] }
        }

    }

    /**
     * @description 搜索专辑
     * @param keyword
     * @param page
     * @returns
     */
    public static searchForAlbumBasicsData = async (keyword: string, page: number) =>
    {
        try
        {
            const platformData: PlatformData[] = [];

            const allPlatformData: PlatformData[] = [];

            const searchData = await this.Search(keyword, page, 'album');
            if (!searchData) return { platformData: [], totalPage: 0, allPlatformData: [] }

            const totalPage = searchData.totalPage;

            const mediaCardData = searchData.mediaCardData;

            if (!mediaCardData) return { platformData: [], totalPage: 0, allPlatformData: [] }

            let count = 0;

            for (const item of mediaCardData)
            {
                const data = item;
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
            ShowMessage.show((error as Error).message);
            ShowMessage.show('遇到了一些问题，你可以在设置中切换API以解决');
            return { platformData: [], totalPage: 0, allPlatformData: [] }
        }
    }

    /**
     * @description 搜索MV
     * @param keyword
     * @param page
     * @returns
     */
    public static searchForMVBasicsData = async (keyword: string, page: number) =>
    {
        try
        {

            const platformData: PlatformData[] = [];

            const allPlatformData: PlatformData[] = [];

            const searchData = await this.Search(keyword, page, 'mv');

            if (!searchData) return { platformData: [], totalPage: 0, allPlatformData: [] }

            const totalPage = searchData.totalPage;

            const mediaCardData = searchData.mediaCardData;

            if (!mediaCardData) return { platformData: [], totalPage: 0, allPlatformData: [] }

            let count = 0;


            for (const item of mediaCardData)
            {
                const data = item;

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
            ShowMessage.show((error as Error).message);
            ShowMessage.show('遇到了一些问题，你可以在设置中切换API以解决');
            return { platformData: [], totalPage: 0, allPlatformData: [] }
        }

    }

    public static getSongListMultiPageData = async (platformData: PlatformData) =>
    {
        try
        {

            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');

            let songListDetail: SongList | null = null;

            const id = platformData.neteaseMusic.id;

            const neteaseAPI = this.neteaseSetting.api;

            songListDetail = await NeteaseMusicAPI.getSongListDetail(id);

            if (!songListDetail) throw new Error('获取歌单详情失败');
            const ids = songListDetail.playlist.trackIds.map((item) => item.id)

            return this.processSongPlatformData(ids);

        } catch (error)
        {
            ShowMessage.show((error as Error).message)
            ShowMessage.show('遇到了一些问题，你可以在设置中切换API以解决');
            return { platformData: [], totalPage: 0, allPlatformData: [] }
        }
    }

    public static getAlbumMultiPageData = async (platformData: PlatformData) =>
    {
        try
        {

            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');


            let albumDetails: AlbumData | null = null;

            const id = platformData.neteaseMusic.id;

            albumDetails = await NeteaseMusicAPI.getAlbumDetail(id);


            if (!albumDetails) throw new Error('获取专辑详情失败');

            const ids = albumDetails.songs.map((item) => item.id);

            return this.processSongPlatformData(ids);

        } catch (error)
        {
            ShowMessage.show((error as Error).message)
            ShowMessage.show('遇到了一些问题，你可以在设置中切换API以解决');
            return { platformData: [], totalPage: 0, allPlatformData: [] }
        }
    }

    public static processSongPlatformData = async (trackID: number[]) =>
    {
        const platformData: PlatformData[] = [];

        const allPlatformData: PlatformData[] = [];

        const totalResult = trackID.length;

        const totalPage = Math.ceil(totalResult / this.pageSize);

        let count = 0;

        const songDetail = await NeteaseMusicAPI.getNeteaseSongDetail(trackID);
        if (!songDetail) throw new Error('获取歌单详情失败');

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
                    id: item.id,
                    fee: item.fee
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

        return { platformData: platformData, totalPage, allPlatformData: allPlatformData }
    }

    /**
     * @description 合并歌词
     * @param jpLyrics
     * @param cnLyrics
     * @returns
     */
    private static mergeLyrics = (jpLyrics: string, cnLyrics: string): string =>
    {
        const lyricOption = this.neteaseSetting.lyricOption;

        if (lyricOption === 'off') return '';

        if (lyricOption === 'original') return jpLyrics;

        if (lyricOption === 'translated') return cnLyrics;

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
    public static MLOD = (platformData: PlatformData) =>
    {

        const MLODACTION = async (select: number) =>
        {
            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');
            const id = platformData.neteaseMusic.id;
            const neteaseAPI = this.neteaseSetting.api
            let songListDetail: SongList | null = null;

            songListDetail = await NeteaseMusicAPI.getSongListDetail(id);

            if (!songListDetail) throw new Error('获取歌单详情失败');

            const trackIds = songListDetail.playlist.trackIds;
            let trackID = trackIds.map((item) => item.id);

            if (select === 1)
            {
                trackID = trackID.sort(() => Math.random() - 0.5);
            }
            this.finalODSONG(trackID);
        }

        try
        {
            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');
            this.buildSelect(MLODACTION);

        } catch (error)
        {
            ShowMessage.show((error as Error).message);
        }
    }

    /**
     * @description 点播专辑
     * @param platformData
     */
    public static AOD = (platformData: PlatformData) =>
    {

        const AODACTION = async (select: number) =>
        {
            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');
            const id = platformData.neteaseMusic.id;
            const neteaseAPI = this.neteaseSetting.api
            let albumDetails: AlbumData | null = null;

            albumDetails = await NeteaseMusicAPI.getAlbumDetail(id)

            if (!albumDetails) throw new Error('获取歌单详情失败');

            const Songs = albumDetails.songs;
            let songsID = Songs.map((item) => item.id);

            if (select === 1)
            {
                songsID = songsID.sort(() => Math.random() - 0.5);
            }

            NetEasePlatform.finalODSONG(songsID);
        }

        try
        {
            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');
            this.buildSelect(AODACTION);
        } catch (error)
        {
            ShowMessage.show((error as Error).message);
        }
    }

    /**
     * @description 点播歌曲
     * @param platformData
     */
    public static MOD = (platformData: PlatformData) =>
    {

        try
        {
            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');
            const id = platformData.neteaseMusic.id
            this.finalODSONG([id]);
        } catch (error)
        {
            ShowMessage.show((error as Error).message);
        }


    }

    public static MVOD = async (platformData: PlatformData) =>
    {

        try
        {
            if (!platformData.neteaseMusic || !platformData.duration) throw new Error('没有网易云音乐数据');

            // const xcAPI = window.netease?.xcAPI
            // let xcRes: xcSongResource | null = null
            const id = platformData.neteaseMusic.id

            const res = await NeteaseMusicAPI.getMVPlayURL(id);

            if (!res || !res.data) throw new Error('获取MV资源失败');

            if (res.data.msg) throw new Error(res.data.msg);

            const playUrl = res.data.url;

            const media = new Media();

            const mediaData: MediaData = {
                type: 'video',
                name: platformData.title,
                singer: platformData.author,
                cover: await platformData.coverImg,
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
            ShowMessage.show((error as Error).message);
        }

    }

    private static finalODSONG = async (songsID: number[]) =>
    {

        const media = new Media();
        const socket = new Socket();

        let songDetailSongs: SongDetailSong[] | null = null;
        let songDetailFromBinaryify: SongsFromBinaryify[] | null = null;
        songDetailSongs = await NeteaseMusicAPI.getNeteaseSongDetail(songsID);
        if (!songDetailSongs && !songDetailFromBinaryify) throw new Error('获取歌单详情失败');

        if (songDetailSongs)
        {
            for (const item of songDetailSongs)
            {
                if (item.noCopyrightRcmd)
                {
                    ShowMessage.show(`歌曲《${item.name}》可能为无版权歌曲，已跳过播放`);
                    continue;
                }
                let playUrl = '';
                playUrl = `https://v.iarc.top/?type=url&id=${item.id}#.mp3`;
                // playUrl = `https://1309510434-k3dderqeb9.ap-guangzhou.tencentscf.com/musicstreamlink/?platform=netease&id=${item.id}&quality=320&vip=${item.fee}#.mp3`;
                const lyrdata = await NeteaseMusicAPI.getLyric(item.id);

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

}