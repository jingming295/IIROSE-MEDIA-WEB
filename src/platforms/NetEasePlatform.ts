import { NeteaseMusicAPI } from "../Api/NeteaseAPI/NeteaseMusic";
import { NeteaseSearchAPI } from "../Api/NeteaseAPI/NeteaseSearch";
import { IIROSEUtils } from "../iirose_func/IIROSEUtils";
import { ShowMessage } from "../iirose_func/ShowMessage";
import { Socket } from "../iirose_func/Socket";
import { Media } from "../iirose_func/Socket/Media";
import { MediaData } from "../iirose_func/Socket/Media/MediaCardInterface";
import { NetEaseSettings } from "../settings/neteaseSettings/NetEaseSettings";
import { ImageTools } from "../tools/ImageTools";
import { PlatformData } from "./interfaces";

export class NetEasePlatform
{
    neteaseSearch = new NeteaseSearchAPI();
    neteaseMusicApi = new NeteaseMusicAPI();
    pageSize = 10;
    showmessage = new ShowMessage();
    neteaseSetting = new NetEaseSettings().getNeteaseMusicSetting();

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

    public async searchForRecommendPlayListBasicsData()
    {
        const platformData: PlatformData[] = [];
        const allPlatformData: PlatformData[] = [];
        const limit = 100;
        let totalPage = Math.ceil(limit / this.pageSize);

        try
        {
            const res = await this.neteaseSearch.getNeteaseRecommandPlayListXC(limit, false);
            if (!res || !res.result) return { platformData: [], totalPage: 0 };
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

            return { platformData, totalPage, allPlatformData };

        } catch (error)
        {
            this.showmessage.show((error as Error).message);
            return { platformData: [], totalPage: 0 };
        }


    }

    public async searchForMusicsBasicsData(keyword: string, page: number)
    {
        try
        {
            const platformData: PlatformData[] = [];
            const allPlatformData: PlatformData[] = [];

            const res = await this.neteaseSearch.getNeteaseMusicSearchData(keyword);

            if (!res || !res.result || !res.result.songs) return { platformData: [], totalPage: 0, allPlatformData: [] };

            const ids = res.result.songs.map((item) => item.id);

            const songDetail = await this.neteaseMusicApi.getNeteaseSongDetailFromXC(ids);

            if (!songDetail || !songDetail.songs) return { platformData: [], totalPage: 0, allPlatformData: [] };

            const totalResult = res.result.songs.length;

            const totalPage = Math.ceil(totalResult / this.pageSize);

            let count = 0;

            for (const item of songDetail.songs)
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

            return { platformData, totalPage, allPlatformData };

        } catch (error)
        {
            this.showmessage.show((error as Error).message);
            return { platformData: [], totalPage: 0, allPlatformData: [] };
        }





    }

    public async MLOD(platformData: PlatformData)
    {

        const MLODACTION = async (select: number) =>
        {
            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');
            const id = platformData.neteaseMusic.id;
            const songListDetail = await this.neteaseMusicApi.getSongListDetail(id);
            if (!songListDetail) throw new Error('获取歌单详情失败');

            const trackIds = songListDetail.playlist.trackIds;
            let trackID = trackIds.map((item) => item.id);

            if (select === 1)
            {
                trackID = trackID.sort(() => Math.random() - 0.5);
            }

            const songDetail = await this.neteaseMusicApi.getNeteaseSongDetailFromXC(trackID);
            if (!songDetail || !songDetail.songs) throw new Error('获取歌曲详情失败');

            const imageTools = new ImageTools();

            let count = 0;

            for (const item of songDetail.songs)
            {
                const songResource = await this.neteaseMusicApi.getSongResource(trackID[count], this.neteaseSetting.quality);
                const socket = new Socket();
                const media = new Media();
                if (!songResource) return;
                const hex = await imageTools.getAverageColorFromImageUrl(item.al.picUrl);
                const mediaData: MediaData = {
                    type: 'music',
                    name: item.name,
                    singer: item.ar[0].name,
                    cover: item.al.picUrl,
                    link: `https://music.163.com/#/song?id=${item.id}`,
                    url: songResource.url,
                    duration: item.dt / 1000,
                    bitRate: Math.floor(songResource.br / 1000),
                    color: hex,
                    lyrics: songResource.lrc_control,
                    origin: 'netease'
                }

                const mediacard = media.mediaCard(mediaData);
                const mediaEvent = media.mediaEvent(mediaData);

                socket.send(mediacard);
                socket.send(mediaEvent);
                count++;
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

    public async MOD(platformData: PlatformData)
    {

        try
        {
            if (!platformData.neteaseMusic) throw new Error('没有网易云音乐数据');

            const res = await this.neteaseMusicApi.getSongResource(platformData.neteaseMusic.id, this.neteaseSetting.quality);

            if (!res) throw new Error('获取歌曲资源失败');

            const imageTools = new ImageTools()

            const hex = await imageTools.getAverageColorFromImageUrl(platformData.coverImg);

            const media = new Media();


            const mediaData: MediaData = {
                type: 'music',
                name: platformData.title,
                singer: platformData.author,
                cover: platformData.coverImg,
                link: platformData.websiteUrl,
                url: res.url,
                duration: res.time / 1000,
                bitRate: Math.floor(res.br / 1000),
                color: hex,
                lyrics: res.lrc_control,
                origin: 'netease'
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