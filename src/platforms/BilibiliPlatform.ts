import { SendFetch } from "../Api";
import { BiliBiliCourseApi } from "../Api/BilibiliAPI/bilibili-course/BiliBiliCourseApi";
import { BiliBiliLiveApi } from "../Api/BilibiliAPI/BiliBiliLive";
import { BiliBiliSearchApi } from "../Api/BilibiliAPI/BiliBiliSearch";
import { BiliBiliVideoApi } from "../Api/BilibiliAPI/BiliBiliVideoAPI";
import { dash } from "../Api/BilibiliAPI/BiliBiliVideoAPI/StreamInterface";
import { ShowMessage } from "../iirose_func/ShowMessage";
import { Socket } from "../iirose_func/Socket";
import { Media } from "../iirose_func/Socket/Media";
import { MediaData } from "../iirose_func/Socket/Media/MediaCardInterface";
import { BiliBiliSettings } from "../settings/bilibiliSettings/BiliBiliSettings";
import { ImageTools } from "../tools/ImageTools";
import { PlatformData } from "./interfaces";



export class BilibiliPlatform
{
    bilibiliSearchApi = new BiliBiliSearchApi();
    bilibiliVideoApi = new BiliBiliVideoApi();
    bilibiliLiveApi = new BiliBiliLiveApi();
    bilibiliCourseApi = new BiliBiliCourseApi();
    showmessage = new ShowMessage();
    itemPerPage = 10;
    private timeToSeconds(timeString: string)
    {
        // 使用 ':' 分隔时间字符串
        const [minutes, seconds] = timeString.split(':').map(Number);
        // 将分钟转换为秒并加上秒数
        return minutes * 60 + seconds;
    }

    private removeEmTagsUsingDOMParser(input: string)
    {
        const parser = new DOMParser();
        const doc = parser.parseFromString(input, 'text/html');
        return doc.body.textContent || '';
    }

    public async getRecommendVideosBasicsData(refresh: number): Promise<{ platformData: PlatformData[], totalPage: number }>
    {
        try
        {
            // 等待异步请求完成
            const res = await this.bilibiliVideoApi.getRecommendVideoFromMainPage(3, 1, 10, refresh, refresh, 0);

            // 初始化 platformData 数组
            const platformData: PlatformData[] = [];

            if (res && res.code === 0 && res.data && res.data.item)
            {
                for (const item of res.data.item)
                {
                    const data: PlatformData = {
                        title: this.removeEmTagsUsingDOMParser(item.title),
                        coverImg: item.pic,
                        author: item.owner.name,
                        websiteUrl: `https://www.bilibili.com/video/${item.bvid}`,
                        duration: item.duration,
                        bilibili: {
                            bvid: item.bvid,
                            cid: item.cid,
                        }
                    };
                    platformData.push(data);
                }
            } else
            {
                throw new Error('获取推荐视频失败'); // 处理错误
            }

            const totalPage = 1;
            return { platformData, totalPage };

        } catch (error)
        {
            this.showmessage.show((error as Error).message);
            return { platformData: [], totalPage: 0 };
        }
    }

    public async searchForVideosBasicsData(keyword: string, page: number)
    {
        try
        {
            let totalPage = 0;
            let count = 0;
            const pageSize = 50;
            const res = await this.bilibiliSearchApi.getSearchRequestByTypeVideo(keyword, page, pageSize)

            const platformData: PlatformData[] = [];
            const allPlatformData: PlatformData[] = [];


            if (res && res.code === 0 && res.data && res.data.result)
            {
                for (const item of res.data.result)
                {
                    const duration = this.timeToSeconds(item.duration);

                    const data: PlatformData = {
                        title: this.removeEmTagsUsingDOMParser(item.title),
                        coverImg: item.pic,
                        author: item.author,
                        websiteUrl: item.arcurl || `https://www.bilibili.com/video/${item.bvid || `av${item.aid}`}`,
                        duration: duration,
                        bilibili: {
                            aid: item.type === 'video' ? item.aid : undefined,
                            bvid: item.type === 'video' ? item.bvid : undefined,
                            course_id: item.type === 'ketang' ? item.aid : undefined,
                        },
                        multiPage: new Promise(async (resolve) =>
                        {
                            if (item.type === 'ketang') resolve(true);
                            const res = await this.bilibiliVideoApi.getBilibiliPagesAndCids(item.aid, item.bvid);
                            if (res && res.data)
                            {
                                if (res.data.length > 1)
                                {
                                    resolve(true);
                                }
                                resolve(false);
                            } else
                            {
                                resolve(false);
                            }
                        })
                    }

                    if (count >= this.itemPerPage)
                    {
                        allPlatformData.push(data);
                    } else
                    {
                        allPlatformData.push(data);
                        platformData.push(data);
                    }

                    count++;

                }
                totalPage = Math.ceil(res.data.numResults / this.itemPerPage);
            }



            return { platformData, totalPage, allPlatformData };

        } catch (error)
        {
            this.showmessage.show((error as Error).message);
            return { platformData: [], totalPage: 0 };
        }
    }

    public async searchForLiveBasicsData(keyword: string, page: number): Promise<{ platformData: PlatformData[], totalPage: number }>
    {
        try
        {
            const res = await this.bilibiliSearchApi.getSearchRequestByTypeLiveRoom(keyword, page, this.itemPerPage);

            const platformData: PlatformData[] = [];

            let totalPage = 0;

            if (res && res.code === 0 && res.data && res.data.result)
            {
                for (const item of res.data.result)
                {
                    const data: PlatformData = {
                        title: this.removeEmTagsUsingDOMParser(item.title),
                        coverImg: item.cover,
                        author: item.uname,
                        websiteUrl: `https://live.bilibili.com/${item.roomid}`,
                        bilibiliLive: {
                            roomid: item.roomid
                        }
                    }
                    platformData.push(data);
                }
                totalPage = res.data.numPages;
            }

            return { platformData, totalPage: totalPage };

        } catch (error)
        {
            this.showmessage.show((error as Error).message);
            return { platformData: [], totalPage: 0 };
        }
    }

    public async getMultiPageBasicsData(pd: PlatformData): Promise<{ platformData: PlatformData[]; allPlatformData: PlatformData[]; totalPage: number; }>
    {
        const platformDatas: PlatformData[] = [];
        const allPlatformDatas: PlatformData[] = [];
        let count = 0;

        try
        {
            if (!pd.bilibili) throw new Error('没有 bilibili 数据');

            if (pd.bilibili.course_id)
            {
                const res = await this.bilibiliCourseApi.getBilibiliCoursePagesData(pd.bilibili.course_id, 1000);

                if (res && res.code === 0 && res.data)
                {
                    for (const item of res.data.items)
                    {
                        const data: PlatformData = {
                            title: `P${count + 1} ${item.title}`,
                            coverImg: item.cover,
                            author: pd.author,
                            websiteUrl: `https://www.bilibili.com/cheese/play/ep${item.id}`,
                            duration: item.duration,
                            bilibili: {
                                aid: item.aid,
                                cid: item.cid,
                                course_id: item.id
                            }
                        }

                        if (allPlatformDatas.length >= this.itemPerPage)
                        {
                            allPlatformDatas.push(data);
                        } else
                        {
                            allPlatformDatas.push(data);
                            platformDatas.push(data);
                        }
                        count++;
                    }
                    const totalPage = Math.ceil(res.data.items.length / this.itemPerPage);
                    return { platformData: platformDatas, allPlatformData: allPlatformDatas, totalPage: totalPage };
                } else
                {
                    throw new Error('获取课程信息失败');
                }
            }

            const bilibiliVideoDetail = await this.bilibiliVideoApi.getBilibiliVideoData(null, pd.bilibili.bvid);

            if (bilibiliVideoDetail && bilibiliVideoDetail.data && bilibiliVideoDetail.data.pages)
            {

                for (const item of bilibiliVideoDetail.data.pages)
                {
                    const data: PlatformData = {
                        title: `P${count + 1} ${item.part}`,
                        coverImg: bilibiliVideoDetail.data.pic,
                        author: bilibiliVideoDetail.data.owner.name,
                        websiteUrl: `https://www.bilibili.com/video/${pd.bilibili.bvid}?p=${item.page}`,
                        duration: item.duration,
                        bilibili: {
                            bvid: pd.bilibili.bvid,
                            cid: item.cid
                        }
                    }

                    if (allPlatformDatas.length >= this.itemPerPage)
                    {
                        allPlatformDatas.push(data);
                    } else
                    {
                        allPlatformDatas.push(data);
                        platformDatas.push(data);
                    }
                    count++;
                }

                const totalPage = Math.ceil(bilibiliVideoDetail.data.pages.length / this.itemPerPage);
                return { platformData: platformDatas, allPlatformData: allPlatformDatas, totalPage: totalPage };
            } else throw new Error('获取视频信息失败');

        } catch (error)
        {
            this.showmessage.show((error as Error).message);
            return { platformData: [], allPlatformData: [], totalPage: 0 };
        }

    }

    public async VOD(platformData: PlatformData)
    {
        const bvSetting = new BiliBiliSettings().getBilibiliVideoSettings();
        try
        {
            if (!platformData.bilibili) throw new Error('没有 bilibili 数据');
            let { aid, bvid, cid, course_id } = platformData.bilibili;

            // 如果是课程
            if (course_id && cid)
            {
                const res = await this.bilibiliCourseApi.getBilibiliCourseStream(aid, course_id, cid, bvSetting.qn);

                if (res && res.code === 0 && res.data)
                {

                    if (res.data.dash)
                    {

                        if (!res.data.timelength || !res.data.quality) throw new Error('No video duration');

                        const imageTools = new ImageTools();

                        const { playurl, qn } = await this.getDashUrlAndQn(res.data.dash);

                        const hex = await imageTools.getAverageColorFromImageUrl(platformData.coverImg);
                        const mediaData: MediaData = {
                            type: 'video',
                            name: platformData.title,
                            singer: platformData.author,
                            cover: platformData.coverImg,
                            link: platformData.websiteUrl,
                            url: playurl,
                            duration: res.data.timelength / 1000,
                            bitRate: qn,
                            color: hex,
                            origin: 'bilibili'
                        };
                        const media = new Media();

                        const mediacard = media.mediaCard(mediaData);
                        const mediaEvent = media.mediaEvent(mediaData);

                        const socket = new Socket();
                        socket.send(mediacard);
                        socket.send(mediaEvent);
                        return;
                    } else throw new Error('获取课程播放流失败, 没有 durl');

                } else throw new Error('获取课程播放流失败');
            }

            // 如果是视频, 但是没有 cid
            if (!cid)
            {
                const res = await this.bilibiliVideoApi.getBilibiliVideoData(null, bvid);
                if (res && res.code === 0 && res.data && res.data.pages)
                {
                    cid = res.data.pages[0].cid;
                } else throw new Error('获取视频信息失败');
            }

            // 如果是视频
            let streamFormat = bvSetting.videoStreamFormat

            streamFormat = this.getStreamPlatform(streamFormat, bvSetting.qn);

            const res = await this.bilibiliVideoApi.getBilibiliVideoStream(aid, bvid, cid, bvSetting.qn, streamFormat);
            if (res && res.code === 0 && res.data)
            {
                let videoUrl = ``;
                let actuallyQn = res.data.quality || bvSetting.qn;
                if (res.data.durl && res.data.durl.length > 0)
                {
                    videoUrl = res.data.durl[0].url;
                } else if (res.data.dash)
                {
                    const { playurl, qn } = await this.getDashUrlAndQn(res.data.dash);
                    videoUrl = playurl;
                    actuallyQn = qn;
                }

                if (!res.data.timelength) throw new Error('No video duration');

                const imageTools = new ImageTools();

                const hex = await imageTools.getAverageColorFromImageUrl(platformData.coverImg);
                const mediaData: MediaData = {
                    type: 'video',
                    name: platformData.title,
                    singer: platformData.author,
                    cover: platformData.coverImg,
                    link: platformData.websiteUrl,
                    url: videoUrl,
                    duration: res.data.timelength / 1000,
                    bitRate: actuallyQn,
                    color: hex,
                    origin: 'bilibili'
                };
                const media = new Media();

                const mediacard = media.mediaCard(mediaData);
                const mediaEvent = media.mediaEvent(mediaData);

                const socket = new Socket();
                socket.send(mediacard);
                socket.send(mediaEvent);
            }


        } catch (error)
        {
            console.error(error);
            this.showmessage.show((error as Error).message);
        }

    }

    public async LOD(platformData: PlatformData)
    {
        const bvSetting = new BiliBiliSettings().getBilibiliVideoSettings();
        try
        {
            if (!platformData.bilibiliLive) throw new Error('没有 bilibiliLive 数据');
            const res = await this.bilibiliLiveApi.getLiveStream(platformData.bilibiliLive.roomid, 'web', bvSetting.streamqn);

            if (res && res.code === 0 && res.data && res.data.durl)
            {
                let videoUrl = ``;

                const durl = res.data.durl;

                let testResult = false

                for (const item of durl)
                {
                    const sendfetch = new SendFetch();
                    const res = await sendfetch.tryGetWhithXhr(item.url);
                    if (res)
                    {
                        videoUrl = item.url;
                        testResult = true;
                        break;
                    }
                }

                if (!testResult) throw new Error('获取直播流失败');

                const imageTools = new ImageTools();

                const hex = await imageTools.getAverageColorFromImageUrl(platformData.coverImg);

                const br = res.data.current_qn;

                const mediaData: MediaData = {
                    type: 'video',
                    name: platformData.title,
                    singer: platformData.author,
                    cover: platformData.coverImg,
                    link: platformData.websiteUrl,
                    url: videoUrl,
                    duration: bvSetting.streamSeconds,
                    bitRate: br,
                    color: hex,
                    origin: 'bilibililive'
                };
                const media = new Media();

                const mediacard = media.mediaCard(mediaData);
                const mediaEvent = media.mediaEvent(mediaData);

                const socket = new Socket();
                socket.send(mediacard);
                socket.send(mediaEvent);
            }
        } catch (error)
        {
            this.showmessage.show((error as Error).message)
        }


    }

    private async getDashUrlAndQn(data: dash)
    {

        const bvSetting = new BiliBiliSettings().getBilibiliVideoSettings();
        const sendfetch = new SendFetch()
        let playurl: string | null = null;
        let audiourl: string | null = null;
        let qn: number | null = null;

        for (const video of data.video)
        {
            if (video.id === bvSetting.qn && video.codecid === 13)
            {
                const res = await sendfetch.tryGetWhithXhr(video.baseUrl || video.base_url);
                if (res)
                {
                    playurl = video.base_url || video.baseUrl;
                    qn = video.id;
                    break;
                }
            }
        }

        if (!playurl)
        {

            for (const video of data.video)
            {
                if (video.codecid === 13 || video.codecid === 7)
                {
                    const res = await sendfetch.tryGetWhithXhr(video.baseUrl || video.base_url);
                    if (res)
                    {
                        playurl = video.base_url || video.baseUrl;
                        qn = video.id;
                        break;
                    }
                }
            }
        }

        if (!playurl) throw new Error('获取Dash视频流失败, 找不到合适的视频流, 可能是因为视频是付费的');

        if (!qn) qn = bvSetting.qn;

        const audioArray = data.audio;

        for (const audio of audioArray)
        {
            const res = await sendfetch.tryGetWhithXhr(audio.baseUrl || audio.base_url);
            if (res)
            {
                audiourl = audio.base_url || audio.baseUrl;
                break;
            }
        }

        if (!audiourl) throw new Error('获取Dash视频流失败, 找不到合适的音频流, 可能是因为视频是付费的');

        playurl = `${playurl}#audio=${audiourl}`;
        return { playurl, qn };


    }

    private getStreamPlatform(platform: number, qn: number)
    {
        switch (platform)
        {
            case 0:
                return 1;
            case 1:
                return 4048;
            case 2:
                if (qn <= 64) return 1
                else return 4048
            default:
                return 1;
        }
    }
}
