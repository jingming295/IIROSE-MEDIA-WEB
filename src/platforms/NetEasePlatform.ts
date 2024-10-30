import { NeteaseMusicAPI } from "../Api/NeteaseAPI/NeteaseMusic";
import { AlbumData } from "../Api/NeteaseAPI/NeteaseMusic/AlbumInterface";
import { MVDetail } from "../Api/NeteaseAPI/NeteaseMusic/MVInterfaces";
import { SongDetailFromBinaryify, SongDetailSong, SongsFromBinaryify } from "../Api/NeteaseAPI/NeteaseMusic/SongDetailInterface";
import { SongList, xcSongResource } from "../Api/NeteaseAPI/NeteaseMusic/SongList";
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
                    multiAction: true,
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

    private async Search(keyword: string, page: number, type: 'song' | 'playlist' | 'album' | 'mv' | 'radio')
    {
        let ids: number[] = [];
        let totalResult = 0;
        let totalPage = 0;
        let mediaCardData: PlatformData[] = [];
        const neteaseAPI = this.neteaseSetting.api
        const xcAPI = window.netease?.xcAPI
        const theresaAPI = window.netease?.theresaAPI
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


                if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
                {
                    songListDetail = await this.neteaseMusicApi.getNeteaseSongListDetailFromBinaryify(id, neteaseAPI);
                } else
                {
                    songListDetail = await this.neteaseMusicApi.getSongListDetail(id);
                }

                if (!songListDetail) return null;
                const playList = songListDetail.playlist;
                mediaCardData = [{
                    title: playList.name,
                    coverImg: playList.coverImgUrl,
                    author: playList.creator?.nickname || '无法获取',
                    websiteUrl: `https://music.163.com/#/playlist?id=${playList.id}`,
                    trackCount: `${playList.trackCount}`,
                    multiAction: true,
                    neteaseMusic: {
                        id: playList.id,
                        isSongList: true
                    }
                }]
                return { ids, totalPage: 1, mediaCardData }
            } else if (type === 'album')
            {
                let albumDetail: AlbumData | null = null;
                if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
                {
                    albumDetail = await this.neteaseMusicApi.getNeteaseAlbumDetailFromBinaryify(id, neteaseAPI);
                } else
                {
                    albumDetail = await this.neteaseMusicApi.getAlbumDetail(id);
                }

                if (!albumDetail) return null;
                const album = albumDetail.album;
                mediaCardData = [{
                    title: album.name,
                    coverImg: album.picUrl,
                    author: album.artist.name,
                    websiteUrl: `https://music.163.com/#/album?id=${album.id}`,
                    trackCount: `${album.size}`,
                    multiAction: true,
                    neteaseMusic: {
                        id: album.id,
                        isAlbum: true
                    }
                }]
                return { ids, totalPage: 1, mediaCardData }
            } else if (type === 'mv')
            {

                let mvDetail: MVDetail | null = null;
                mvDetail = await this.neteaseMusicApi.getNeteaseMVDetailFromBinaryify(id, 'xc');

                if (!mvDetail || !mvDetail.data) return null;

                const mv = mvDetail.data;

                mediaCardData = [{
                    title: mv.name,
                    coverImg: mv.cover,
                    author: mv.artistName || mv.artists[0].name,
                    websiteUrl: `https://music.163.com/#/mv?id=${mv.id}`,
                    neteaseMusic: {
                        id: mv.id,
                        isMV: true
                    }
                }]
                return { ids, totalPage: 1, mediaCardData }
            }
        }

        if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
        {
            searchData = await this.neteaseSearch.getNeteaseSearchDataFromBinaryify(keyword, searchType, offset, neteaseAPI);
        } else
        {
            searchData = await this.neteaseSearch.getNeteaseMusicSearchData(keyword, searchType, offset);
        }

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
                    multiAction: true,
                    neteaseMusic: {
                        id: item.id,
                        isSongList: true
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
                    multiAction: true,
                    neteaseMusic: {
                        id: item.id,
                        isAlbum: true
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
                        isMV: true
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
                        isDjRadios: true
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

    public async getNeteasePlatformData(ids: number[], type: 'song' | 'playlist' | 'album' | 'mv' | 'radio')
    {

        const xcAPI = window.netease?.xcAPI
        const theresaAPI = window.netease?.theresaAPI
        const neteaseAPI = this.neteaseSetting.api
        const PlatformData: PlatformData[] = []

        if (type === 'song')
        {

            if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
            {
                const songDetail = await this.neteaseMusicApi.getNeteaseSongDetailFromBinaryify(ids, neteaseAPI)

                if (!songDetail) return null;

                for (const item of songDetail)
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
                    PlatformData.push(data);
                }

                return PlatformData;

            } else
            {
                const songDetail = await this.neteaseMusicApi.getNeteaseSongDetail(ids);

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
                            id: item.id
                        }
                    }
                    PlatformData.push(data);
                }

                return PlatformData;

            }
        } else if (type === 'playlist')
        {
            let songListDetail: SongList | null = null;
            if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
            {
                songListDetail = await this.neteaseMusicApi.getNeteaseSongListDetailFromBinaryify(ids[0], neteaseAPI);
            } else
            {
                songListDetail = await this.neteaseMusicApi.getSongListDetail(ids[0]);
            }

            if (!songListDetail) throw new Error('获取歌单详情失败');

            const platformData: PlatformData = {
                title: songListDetail.playlist.name,
                coverImg: songListDetail.playlist.coverImgUrl,
                author: songListDetail.playlist.creator?.nickname || '无法获取',
                websiteUrl: `https://music.163.com/#/playlist?id=${songListDetail.playlist.id}`,
                trackCount: `${songListDetail.playlist.trackCount}`,
                multiAction: true,
                neteaseMusic: {
                    id: songListDetail.playlist.id,
                    isSongList: true
                }
            }

            return [platformData]
        } else if (type === 'album')
        {
            let albumDetails: AlbumData | null = null;
            if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
            {
                albumDetails = await this.neteaseMusicApi.getNeteaseAlbumDetailFromBinaryify(ids[0], neteaseAPI);
            } else
            {
                albumDetails = await this.neteaseMusicApi.getAlbumDetail(ids[0]);
            }

            if (!albumDetails) throw new Error('获取专辑详情失败');
            const platformData: PlatformData = {
                title: albumDetails.album.name,
                coverImg: albumDetails.album.picUrl,
                author: albumDetails.album.artist.name,
                websiteUrl: `https://music.163.com/#/album?id=${albumDetails.album.id}`,
                trackCount: `${albumDetails.album.size}`,
                multiAction: true,
                neteaseMusic: {
                    id: albumDetails.album.id,
                    isAlbum: true
                }

            }
            return [platformData]
        } else if (type === 'mv')
        {
            let mvDetail: MVDetail | null = null;
            mvDetail = await this.neteaseMusicApi.getNeteaseMVDetailFromBinaryify(ids[0], 'xc');

            if (!mvDetail || !mvDetail.data) throw new Error('获取MV详情失败');

            const mv = mvDetail.data;

            const platformData: PlatformData = {
                title: mv.name,
                coverImg: mv.cover,
                author: mv.artistName || mv.artists[0].name,
                websiteUrl: `https://music.163.com/#/mv?id=${mv.id}`,
                neteaseMusic: {
                    id: mv.id,
                    isMV: true
                },
                duration: Math.ceil((mv.duration) / 1000)


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
    public async searchForMusicsBasicsData(keyword: string, page: number)
    {
        try
        {
            const platformData: PlatformData[] = [];
            const allPlatformData: PlatformData[] = [];

            const searchData = await this.Search(keyword, page, 'song');

            if (!searchData) return { platformData: [], totalPage: 0, allPlatformData: [] }

            const ids = searchData.ids;
            const totalPage = searchData.totalPage;

            const pfd = await this.getNeteasePlatformData(ids, 'song');

            if (!pfd) return { platformData: [], totalPage: 0, allPlatformData: [] }

            let count = 0;

            for (const item of pfd)
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

            const offset = (page - 1) * 100;
            const xcAPI = window.netease?.xcAPI
            const theresaAPI = window.netease?.theresaAPI
            const neteaseAPI = this.neteaseSetting.api

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
            const offset = (page - 1) * 100;

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

    public async getSongListMultiPageData(platformData: PlatformData)
    {
        try
        {
            const xcAPI = window.netease?.xcAPI;
            const theresaAPI = window.netease?.theresaAPI;

            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');

            let songListDetail: SongList | null = null;

            const id = platformData.neteaseMusic.id;

            const neteaseAPI = this.neteaseSetting.api;

            if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
            {
                songListDetail = await this.neteaseMusicApi.getNeteaseSongListDetailFromBinaryify(id, neteaseAPI);
            } else
            {
                songListDetail = await this.neteaseMusicApi.getSongListDetail(id);
            }

            if (!songListDetail) throw new Error('获取歌单详情失败');
            const ids = songListDetail.playlist.trackIds.map((item) => item.id)

            return this.processSongPlatformData(ids, neteaseAPI, xcAPI, theresaAPI);

        } catch (error)
        {
            this.showmessage.show((error as Error).message)
            this.showmessage.show('遇到了一些问题，你可以在设置中切换API以解决');
            return { platformData: [], totalPage: 0, allPlatformData: [] }
        }
    }

    public async getAlbumMultiPageData(platformData: PlatformData)
    {
        try
        {
            const xcAPI = window.netease?.xcAPI;
            const theresaAPI = window.netease?.theresaAPI;

            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');


            let albumDetails: AlbumData | null = null;

            const id = platformData.neteaseMusic.id;

            const neteaseAPI = this.neteaseSetting.api;

            if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
            {
                albumDetails = await this.neteaseMusicApi.getNeteaseAlbumDetailFromBinaryify(id, neteaseAPI);
            } else
            {
                albumDetails = await this.neteaseMusicApi.getAlbumDetail(id);
            }

            if (!albumDetails) throw new Error('获取专辑详情失败');

            const ids = albumDetails.songs.map((item) => item.id);

            return this.processSongPlatformData(ids, neteaseAPI, xcAPI, theresaAPI);

        } catch (error)
        {
            this.showmessage.show((error as Error).message)
            this.showmessage.show('遇到了一些问题，你可以在设置中切换API以解决');
            return { platformData: [], totalPage: 0, allPlatformData: [] }
        }
    }

    async processSongPlatformData(trackID: number[], neteaseAPI: 'xc' | 'theresa' | 'default', xcAPI?: string, theresaAPI?: string)
    {
        const platformData: PlatformData[] = [];

        const allPlatformData: PlatformData[] = [];

        const totalResult = trackID.length;

        const totalPage = Math.ceil(totalResult / this.pageSize);

        let count = 0;

        if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
        {
            const songDetail = await this.neteaseMusicApi.getNeteaseSongDetailFromBinaryify(trackID, neteaseAPI);
            if (!songDetail) throw new Error('获取歌曲详情失败');

            for (const item of songDetail)
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

        } else
        {
            const songDetail = await this.neteaseMusicApi.getNeteaseSongDetail(trackID);
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

        }

        return { platformData: platformData, totalPage, allPlatformData: allPlatformData }
    }

    /**
     * @description 合并歌词
     * @param jpLyrics 
     * @param cnLyrics 
     * @returns 
     */
    private mergeLyrics(jpLyrics: string, cnLyrics: string): string
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
    public async MLOD(platformData: PlatformData)
    {

        const MLODACTION = async (select: number) =>
        {
            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');
            const id = platformData.neteaseMusic.id;
            const neteaseAPI = this.neteaseSetting.api
            const xcAPI = window.netease?.xcAPI
            const theresaAPI = window.netease?.theresaAPI


            let songListDetail: SongList | null = null;

            if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
            {
                songListDetail = await this.neteaseMusicApi.getNeteaseSongListDetailFromBinaryify(id, neteaseAPI);
            } else
            {
                songListDetail = await this.neteaseMusicApi.getSongListDetail(id);
            }

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
            const id = platformData.neteaseMusic.id;
            const neteaseAPI = this.neteaseSetting.api
            const xcAPI = window.netease?.xcAPI
            const theresaAPI = window.netease?.theresaAPI


            let albumDetails: AlbumData | null = null;

            if ((xcAPI || theresaAPI) && neteaseAPI !== 'default')
            {
                albumDetails = await this.neteaseMusicApi.getNeteaseAlbumDetailFromBinaryify(id, neteaseAPI);
            } else
            {
                albumDetails = await this.neteaseMusicApi.getAlbumDetail(id)
            }

            if (!albumDetails) throw new Error('获取歌单详情失败');

            const Songs = albumDetails.songs;
            let songsID = Songs.map((item) => item.id);

            if (select === 1)
            {
                songsID = songsID.sort(() => Math.random() - 0.5);
            }

            this.finalODSONG(songsID);
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
            const id = platformData.neteaseMusic.id
            this.finalODSONG([id]);
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

            // const xcAPI = window.netease?.xcAPI
            // let xcRes: xcSongResource | null = null
            const id = platformData.neteaseMusic.id

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

    private async finalODSONG(songsID: number[])
    {
        const xcAPI = window.netease?.xcAPI;
        const theresaAPI = window.netease?.theresaAPI;
        const neteaseAPI = this.neteaseSetting.api;
        const media = new Media();
        const socket = new Socket();
        if ((xcAPI) && neteaseAPI !== 'default')
        {
            const songDetail = await this.neteaseMusicApi.getNeteaseSongDetailFromBinaryify(songsID, neteaseAPI);
            if (!songDetail) throw new Error('获取歌曲详情失败');
            let count = 0;
            for (const item of songDetail)
            {
                const songResource = await this.neteaseMusicApi.getSongResource(songsID[count], this.neteaseSetting.quality);

                if (!songResource) throw new Error('获取歌曲资源失败');

                const lyricOption = this.neteaseSetting.lyricOption;
                let lyric = ``;
                if (lyricOption === 'off') lyric = '';

                if (lyricOption === 'original') lyric = songResource.lrc;

                if (lyricOption === 'translated') lyric = songResource.lrc_translation;

                if (lyricOption === 'both') lyric = songResource.lrc_control;

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
                    lyrics: lyric,
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
            let songDetailSongs: SongDetailSong[] | null = null;
            let songDetailFromBinaryify: SongsFromBinaryify[] | null = null;
            if (theresaAPI && neteaseAPI !== 'default')
            {
                songDetailFromBinaryify = await this.neteaseMusicApi.getNeteaseSongDetailFromBinaryify(songsID, neteaseAPI);
            } else
            {
                songDetailSongs = await this.neteaseMusicApi.getNeteaseSongDetail(songsID);
            }
            if (!songDetailSongs && !songDetailFromBinaryify) throw new Error('获取歌单详情失败');

            if (songDetailSongs)
            {
                for (const item of songDetailSongs)
                {
                    const playUrl = `https://v.iarc.top/?server=netease&type=url&id=${item.id}#.mp3`

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
            } else if (songDetailFromBinaryify)
            {
                for (const item of songDetailFromBinaryify)
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
                        singer: item.ar[0].name,
                        cover: item.al.picUrl,
                        link: `https://music.163.com/#/song?id=${item.id}`,
                        url: playUrl,
                        duration: item.dt / 1000,
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

}