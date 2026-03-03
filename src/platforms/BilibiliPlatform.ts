import { SendFetch } from "../Api";
import { BiliBiliCourseApi } from "../Api/BilibiliAPI/bilibili-course/BiliBiliCourseApi";
import { BiliBiliLiveApi } from "../Api/BilibiliAPI/BiliBiliLive";
import { BiliBiliSearchApi } from "../Api/BilibiliAPI/BiliBiliSearch";
import { BiliBiliVideoApi } from "../Api/BilibiliAPI/BiliBiliVideoAPI";
import { IIROSEUtils } from "../iirose_func/IIROSEUtils";
import { ShowMessage } from "../iirose_func/ShowMessage";
import { Socket } from "../iirose_func/Socket";
import { Media } from "../iirose_func/Socket/Media";
import { BiliBiliSettings } from "../settings/bilibiliSettings/BiliBiliSettings";



export class BilibiliPlatform
{
    itemPerPage = 10;
    baseHex = '000000';
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
            const res = await BiliBiliVideoApi.getRecommendVideoFromMainPage(3, 1, 10, refresh, refresh, 0);

            // 初始化 platformData 数组
            const platformData: PlatformData[] = [];

            if (res && res.code === 0 && res.data && res.data.item)
            {
                for (const item of res.data.item)
                {
                    if (item.id === 0) continue; // 过滤掉不是视频的数据
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
                    }
                    platformData.push(data);
                }
            } else
            {
                throw new Error('获取推荐视频失败'); // 处理错误
            }

            const totalPage = 1;
            return { platformData, totalPage }

        } catch (error)
        {
            ShowMessage.show((error as Error).message);
            return { platformData: [], totalPage: 0 }
        }
    }

    public async searchForVideosBasicsData(keyword: string, page: number)
    {
        try
        {
            let totalPage = 0;
            let count = 0;
            const pageSize = 50;
            const res = await BiliBiliSearchApi.getSearchRequestByTypeVideo(keyword, page, pageSize)

            const platformData: PlatformData[] = [];
            const allPlatformData: PlatformData[] = [];

            if (res.data?.v_voucher) throw new Error('搜索失败，接口被风控，如果出现这种情况，请联系铭');

            if (res && res.code === 0 && res.data && res.data.result)
            {
                for (const item of res.data.result)
                {
                    if (item.id === 0) continue; // 过滤掉不是视频的数据
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
                        multiPage: (async () =>
                        {
                            if (item.type === 'ketang') return { platform: 'bilibili' };
                            try
                            {
                                const res = await BiliBiliVideoApi.getBilibiliPagesAndCids(item.aid, item.bvid);
                                if (res?.data?.length && res.data.length > 1)
                                {
                                    return { platform: 'bilibili' };
                                }
                            } catch (e)
                            {
                                console.error('Check multipage failed', e);
                            }
                            return undefined;
                        })()
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
            return { platformData, totalPage, allPlatformData }

        } catch (error)
        {
            ShowMessage.show((error as Error).message);
            return { platformData: [], totalPage: 0 }
        }
    }

    public async searchForLiveBasicsData(keyword: string, page: number): Promise<{ platformData: PlatformData[], totalPage: number }>
    {
        try
        {
            const res = await BiliBiliSearchApi.getSearchRequestByTypeLiveRoom(keyword, page, this.itemPerPage);

            const platformData: PlatformData[] = [];

            let totalPage = 0;

            if (res.data?.v_voucher) throw new Error('搜索失败，接口被风控，如果出现这种情况，请联系铭');

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

            return { platformData, totalPage: totalPage }

        } catch (error)
        {
            ShowMessage.show((error as Error).message);
            return { platformData: [], totalPage: 0 }
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
                const res = await BiliBiliCourseApi.getBilibiliCoursePagesData(pd.bilibili.course_id, 1000);
                if (res?.data?.v_voucher) throw new Error('搜索失败，接口被风控，如果出现这种情况，请联系铭');
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
                    return { platformData: platformDatas, allPlatformData: allPlatformDatas, totalPage: totalPage }
                } else
                {
                    throw new Error('获取课程信息失败');
                }
            }

            const bilibiliVideoDetail = await BiliBiliVideoApi.getBilibiliVideoData(null, pd.bilibili.bvid);
            if (bilibiliVideoDetail?.data?.v_voucher) throw new Error('搜索失败，接口被风控，如果出现这种情况，请联系铭');

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
                return { platformData: platformDatas, allPlatformData: allPlatformDatas, totalPage: totalPage }
            } else throw new Error('获取视频信息失败');

        } catch (error)
        {
            ShowMessage.show((error as Error).message);
            return { platformData: [], allPlatformData: [], totalPage: 0 }
        }

    }

    public async getBilibiliVideoDetail(bvid: string)
    {
        try
        {
            const res = await BiliBiliVideoApi.getBilibiliVideoData(null, bvid);
            if (res && res.code === 0 && res.data)
            {
                return res.data;
            } else throw new Error('获取视频信息失败');
        } catch (error)
        {
            ShowMessage.show((error as Error).message);
            return null;
        }
    }

    /**
         * Bilibili 点播逻辑
         * 逻辑：检测多集 -> 弹出选择框 -> 执行点播
         */
    public async VOD(platformData: PlatformData)
    {
        // 封装核心播放动作，供 buildSelect 回调使用
        const VOD_ACTION = async (select: number) =>
        {
            if (select === 0)
            {
                const bvSetting = new BiliBiliSettings().getBilibiliVideoSettings();
                try
                {
                    if (!platformData.bilibili) throw new Error('没有 bilibili 数据');
                    const { aid, bvid, course_id } = platformData.bilibili;
                    let cid = platformData.bilibili.cid;

                    // 1. 补全 CID（如果是搜索结果进入且没有 cid）
                    if (!course_id && !cid)
                    {
                        const res = await BiliBiliVideoApi.getBilibiliVideoData(aid || null, bvid);
                        if (res && res.code === 0 && res.data && res.data.pages)
                        {
                            cid = res.data.pages[0].cid;
                        } else throw new Error('获取视频信息失败');
                    }

                    // 2. 课程流处理
                    if (course_id && cid)
                    {
                        const res = await BiliBiliCourseApi.getBilibiliCourseStream(aid, course_id, cid, bvSetting.qn);
                        if (res?.data?.dash)
                        {
                            const { playurl, qn } = await this.getDashUrlAndQn(res.data.dash);
                            await this.prepareAndSendMedia(platformData, playurl, res.data.timelength || 0, qn);
                            return;
                        } else throw new Error('获取课程播放流失败');
                    }

                    // 3. 普通视频流处理 (严格类型检查)
                    if (typeof cid !== 'number') throw new Error('无法确定有效的 CID');

                    let streamFormat = this.getStreamPlatform(bvSetting.videoStreamFormat, bvSetting.qn);
                    const res = await BiliBiliVideoApi.getBilibiliVideoStream(aid, bvid, cid, bvSetting.qn, streamFormat);

                    if (res && res.code === 0 && res.data)
                    {
                        let videoUrl = '';
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

                        if (!videoUrl) throw new Error('解析播放地址失败');
                        await this.prepareAndSendMedia(platformData, videoUrl, res.data.timelength || 0, actuallyQn);
                    } else throw new Error('获取播放流失败');

                } catch (error)
                {
                    console.error('[VOD Action Error]:', error);
                    ShowMessage.show((error as Error).message);
                }
            } else if (select === 1)
            {

                const bvSetting = new BiliBiliSettings().getBilibiliVideoSettings();
                try
                {
                    if (!platformData.bilibili) throw new Error('没有 bilibili 数据');
                    const { aid, bvid, course_id } = platformData.bilibili;
                    const res = await BiliBiliVideoApi.getBilibiliVideoData(aid || null, bvid);

                    const pages = res?.data?.pages;
                    if (!pages) throw new Error('获取视频信息失败');

                    for (const item of pages)
                    {
                        platformData.title = `P${item.page} ${item.part}`;
                        platformData.duration = item.duration;

                        const cid = item.cid;
                        // 普通视频流处理
                        if (typeof cid !== 'number') throw new Error('无法确定有效的 CID');
                        let streamFormat = this.getStreamPlatform(bvSetting.videoStreamFormat, bvSetting.qn);
                        const res = await BiliBiliVideoApi.getBilibiliVideoStream(aid, bvid, cid, bvSetting.qn, streamFormat);
                        if (res && res.code === 0 && res.data)
                        {
                            let videoUrl = '';
                            let actuallyQn = res.data.quality || bvSetting.qn;
                            if (res.data.durl && res.data.durl.length > 0)
                            {
                                videoUrl = res.data.durl[0].url;
                            }
                            else if (res.data.dash)
                            {
                                const { playurl, qn } = await this.getDashUrlAndQn(res.data.dash);
                                videoUrl = playurl;
                                actuallyQn = qn;
                            }
                            if (!videoUrl) throw new Error('解析播放地址失败');
                            await this.prepareAndSendMedia(platformData, videoUrl, res.data.timelength || 0, actuallyQn);
                        } else throw new Error('获取播放流失败');
                    }

                } catch (error)
                {
                    console.error('[VOD Action Error]:', error);
                    ShowMessage.show((error as Error).message);
                }

            }

        };

        try
        {
            // --- MultiPage 智能拦截逻辑 ---
            const multipagePromise = platformData.multiPage;
            if (multipagePromise)
            {
                const result = await multipagePromise;

                if (result !== undefined)
                {
                    // --- [检测到多集资源：弹出选择框] ---
                    console.log("[VOD] 检测到多集资源，触发选择框");

                    // 调用选择器，并在回调中执行 VOD_ACTION
                    await this.buildBiliSelect(VOD_ACTION);
                    return; // 拦截，等待选择框回调
                }
            }

            // --- 单集资源：直接执行播放 ---
            await VOD_ACTION(0);

        } catch (error)
        {
            console.error('[VOD Error]:', error);
            ShowMessage.show((error as Error).message);
        }
    }

    /**
     * 构建 Bilibili 专用选择器 (目前仅支持正序)
     */
    private async buildBiliSelect(action: (select: number) => Promise<void>)
    {
        const select = [
            [1, '正序点播', `<div class="mdi-sort-alphabetical-variant" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`],
        ];


        IIROSEUtils.buildSelect2(
            null,       // startElement
            select,     // 选项列表
            (_t: HTMLElement, s: string) =>
            {
                const selectNumber = parseInt(s);
                action(selectNumber);
            },          // cb 回调
            false,      // allowClear
            true,       // showIcon
            null,       // top
            false,      // multiSelect
            null,       // bottom
            () => { }    // enterCB
        );
    }


    /**
     * 辅助：构建并发送媒体卡片
     */
    private async prepareAndSendMedia(
        platformData: PlatformData,
        url: string,
        durationMs: number,
        qn: number
    )
    {
        const cover = typeof platformData.coverImg === 'string'
            ? platformData.coverImg
            : await platformData.coverImg;

        const mediaData: MediaData = {
            type: 'video',
            name: platformData.title,
            singer: platformData.author,
            cover: cover,
            link: platformData.websiteUrl,
            url: url,
            duration: durationMs / 1000,
            bitRate: qn,
            color: this.baseHex,
            origin: 'bilibili'
        };

        const media = new Media();
        const socket = new Socket();

        socket.send(media.mediaCard(mediaData));
        socket.send(media.mediaEvent(mediaData));

        console.log(`[VOD] 播放指令已下发: ${mediaData.name}`);
    }

    public async LOD(platformData: PlatformData)
    {
        const bvSetting = new BiliBiliSettings().getBilibiliVideoSettings();
        try
        {
            if (!platformData.bilibiliLive) throw new Error('没有 bilibiliLive 数据');
            const res = await BiliBiliLiveApi.getLiveStream(platformData.bilibiliLive.roomid, 'web', bvSetting.streamqn);

            if (res && res.code === 0 && res.data && res.data.durl)
            {
                let videoUrl = ``;

                const durl = res.data.durl;

                let testResult = false

                for (const item of durl)
                {
                    const res = await SendFetch.tryGetWhithXhr(item.url);
                    if (res)
                    {
                        videoUrl = item.url;
                        testResult = true;
                        break;
                    }
                }

                if (!testResult) throw new Error('获取直播流失败');

                // const imageTools = new ImageTools();

                // const hex = await imageTools.getAverageColorFromImageUrl(platformData.coverImg);

                const br = res.data.current_qn;

                const mediaData: MediaData = {
                    type: 'video',
                    name: platformData.title,
                    singer: platformData.author,
                    cover: await platformData.coverImg,
                    link: platformData.websiteUrl,
                    url: videoUrl,
                    duration: bvSetting.streamSeconds,
                    bitRate: br,
                    color: this.baseHex,
                    origin: 'bilibililive'
                }
                const media = new Media();

                const mediacard = media.mediaCard(mediaData);
                const mediaEvent = media.mediaEvent(mediaData);

                const socket = new Socket();
                socket.send(mediacard);
                socket.send(mediaEvent);
            }
        } catch (error)
        {
            ShowMessage.show((error as Error).message)
        }


    }

    private async getDashUrlAndQn(data: StreamDash)
    {

        const bvSetting = new BiliBiliSettings().getBilibiliVideoSettings();
        let playurl: string | null = null;
        let audiourl: string | null = null;
        let qn: number | null = null;
        console.log(`try get video`)

        for (const video of data.video)
        {
            if (video.id === bvSetting.qn && video.codecid === 13)
            {
                const res = await SendFetch.tryGetWhithXhr(video.baseUrl || video.base_url);
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
            console.log(`try another method to get video`)
            for (const video of data.video)
            {
                if (video.codecid === 13 || video.codecid === 7)
                {
                    const res = await SendFetch.tryGetWhithXhr(video.baseUrl || video.base_url);
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
        console.log(`try get audio`)
        for (const audio of audioArray)
        {
            const res = await SendFetch.tryGetWhithXhr(audio.baseUrl || audio.base_url);
            if (res)
            {
                audiourl = audio.base_url || audio.baseUrl;
                break;
            }
        }
        console.log(`finish`)
        if (!audiourl) throw new Error('获取Dash视频流失败, 找不到合适的音频流, 可能是因为视频是付费的');

        playurl = `${playurl}#audio=${audiourl}`;
        return { playurl, qn }


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
