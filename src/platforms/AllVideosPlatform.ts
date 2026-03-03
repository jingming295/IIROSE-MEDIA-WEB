import { CMSAPI } from "../Api/AllVideosAPI/CMS";
import { IIROSEUtils } from "../iirose_func/IIROSEUtils";
import { ShowMessage } from "../iirose_func/ShowMessage";
import { Socket } from "../iirose_func/Socket";
import { Media } from "../iirose_func/Socket/Media";
import { ParseMediaMetaData } from "../tools/parseMediaMetaData";

export class AllVideosPlatform
{
    itemPerPage = 10;
    baseHex = '000000';

    public async searchAllVideos(keyword: string, page: number, baseurl: string)
    {
        let totalPage = 0;
        let count = 0;

        const platformData: PlatformData[] = [];
        const allPlatformData: PlatformData[] = [];
        const maotaiRes = await CMSAPI.getSearchRequestAll(keyword, page, baseurl);
        if (maotaiRes && maotaiRes.resource.length > 0)
        {
            for (const item of maotaiRes.resource)
            {
                const data: PlatformData = {
                    title: item.name,
                    coverImg: item.poster,
                    author: '',
                    websiteUrl: item.url,
                    subtitle: item.subtitle,
                    multiPage: item.playList.length > 1 ? Promise.resolve({ platform: 'video' }) : Promise.resolve(undefined),
                    playList: item.playList
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
            totalPage = Math.ceil(maotaiRes.pagecount / this.itemPerPage);
        }

        return { platformData, totalPage, allPlatformData }
    }


    /**
         * Video 平台 (茅台资源等) 点播逻辑
         * 支持 PENDING 状态检查、单集直接播放、多集弹出选择框
         */
    public async VOD(platformData: PlatformData)
    {
        // 1. 拦截 PENDING 状态
        if (!platformData.playList) return;

        const PENDING = Symbol('pending');
        const status = await Promise.race([
            platformData.playList,
            Promise.resolve(PENDING)
        ]);

        if (status === PENDING)
        {
            console.warn('资源详情还在爬取中，请稍后再试');
            return;
        }

        const playList = status as PlayItem[];
        if (playList.length === 0) return;

        // 封装核心播放动作
        const VOD_ACTION = async (select: number) =>
        {
            try
            {
                if (select === 1)
                {
                    // --- 正序点播全部 ---
                    for (const item of playList)
                    {
                        // 每一个分集都需要获取时长 (如果不需要精准时长可以设为默认值以提升速度)
                        const duration = await ParseMediaMetaData.getM3U8Duration(item.url);

                        // 构造分集数据
                        const tempPD: PlatformData = {
                            ...platformData,
                            title: `${platformData.title}`,
                            author: `${item.episode}`
                        };
                        await this.sendVideoMedia(tempPD, item.url, duration);

                        // 呼吸时间，防止 Socket 拥塞
                        await new Promise(resolve => setTimeout(resolve, 150));
                    }
                } else
                {
                    // --- 默认点播单集 (第一集) ---

                    const tempPD: PlatformData = {
                        ...platformData,
                        title: `${platformData.title}`,
                        author: `${platformData.author || platformData.subtitle}`
                    }

                    const duration = await ParseMediaMetaData.getM3U8Duration(playList[0].url);
                    await this.sendVideoMedia(tempPD, playList[0].url, duration);
                }
            } catch (error)
            {
                console.error('[Video VOD Action Error]:', error);
                ShowMessage.show((error as Error).message);
            }
        };

        // 2. 判断逻辑：单集 vs 多集
        if (playList.length === 1)
        {
            // 只有一集，直接播放
            await VOD_ACTION(0);
        } else if (playList.length > 1)
        {
            // 多集，弹出选择框
            await this.buildVideoSelect(VOD_ACTION);
        }
    }

    /**
     * 内部辅助：统一发送媒体指令
     */
    private async sendVideoMedia(pd: PlatformData, url: string, duration: number)
    {
        const mediaData: MediaData = {
            type: 'video',
            name: pd.title,
            singer: pd.author,
            cover: await pd.coverImg,
            link: pd.websiteUrl,
            url: url,
            duration: duration,
            bitRate: 1080,
            color: this.baseHex,
            origin: 'video'
        };

        const media = new Media();
        const socket = new Socket();
        socket.send(media.mediaCard(mediaData));
        socket.send(media.mediaEvent(mediaData));
        console.log(`[VOD] Sent: ${pd.title}`);
    }



    /**
     * 构建视频选择器 (目前仅支持正序)
     */
    private async buildVideoSelect(action: (select: number) => Promise<void>)
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

}