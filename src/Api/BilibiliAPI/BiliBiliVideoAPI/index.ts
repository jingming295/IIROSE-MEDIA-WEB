import { BVideoStream } from "./StreamInterface";
import { SendFetch } from "../..";
import { videoStatus } from "./VideoStatusInterface";
import { BilibiliPagesAndCids, BVideoDetail } from "./VideoDetailInterface";
import { AddCoin, AddFavorite, LikeVideo, ShareVideo, hasLiked, isAddFavorited, isAddedCoin, likeTriple } from "./ActionInterface";
import { Snapshot } from "./VideoSnapshotInterface";
import { LikeTagResult, VideoTags } from "./VideoTagsInterface";
import { RecommandVideo, RecommendVideoFromMainPage, RecommentShortVideo } from "./RecommendVideoInterface";
import { interactVideoDetail } from "./InteractVideoInterface";
import { HighEnergyBar } from "./HighEnergyBarListInterface";
import { reportResult } from "./ReportInterface";
import { OnlineViewer } from "./OnlineViewersInterface";
import { WBI } from "../Crypto/WBI";
import { AIConclusion, likeAndDislikeAIConclusion } from "./AIConclusionInterface";
import { AppealType, MakeAppealResult } from "./AppealInterface";
import { SeasonArchives } from "./SeasonArchivesInterface";

export class BiliBiliVideoApi extends SendFetch
{

    /**
     * 获取视频的各种信息
     * @param bvid bv号
     * @param biliBiliSessData BiliBili SessData 
     * @returns 
     */
    public async getBilibiliVideoData(aid: number | null = null, bvid: string | null = null): Promise<BVideoDetail | null>
    {
        const url = `${this.cors}https://api.bilibili.com/x/web-interface/view`;

        const params = new URLSearchParams();
        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);
        const headers = this.returnBilibiliHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: BVideoDetail = await response.json();
            return data;

        } else
        {
            return null;
        }
    }

    /**
     * 获取视频流
     * @param aid 
     * @param bvid 
     * @param cid 
     * @param qn 
     * @param platform 
     * @param fnval 
     * @param ctx 
     * @returns 
     */
    public async getBilibiliVideoStream
        (
            aid: number | null = null,
            bvid: string | null = null,
            cid: number,
            qn: number,
            fnval: number = 16,
            platform: string = 'html5',
        )
    {
        const url = `${this.cors}https://api.bilibili.com/x/player/wbi/playurl`;

        const params = new URLSearchParams({
            cid: cid.toString(),
            qn: qn.toString(),
            high_quality: '1',
            platform: platform,
            fnver: '0',
            fourk: '1',
            fnval: fnval.toString()
        });

        aid && params.set('avid', aid.toString());
        bvid && params.set('bvid', bvid);
        const wbi = new WBI();
        const wbidata = await wbi.main(params);
        wbidata.w_rid && params.set('w_rid', wbidata.w_rid);
        wbidata.wts && params.set('wts', wbidata.wts.toString());
        const headers = this.returnBilibiliHeaders();
        const response = await this.sendGet(url, params, headers);
        if (response && response.ok)
        {
            const data: BVideoStream = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    public async getBilibiliVideoStreamFromFunctionCompute(avid: string, bvid: string, cid: string, biliBiliPlatform: string, biliBiliqn: number, remoteUrl: string)
    {
        const url = remoteUrl + '/GetBiliBiliVideoStream';
        const params = new URLSearchParams({
            bvid: bvid,
            avid: avid,
            cid: cid,
            qn: biliBiliqn.toString(),
            platform: biliBiliPlatform,
            // sessdata: this.BilibiliAccountData?.SESSDATA || ''
        });

        const headers: Headers = this.returnCommonHeaders();

        headers.set('content-type', 'application/x-www-form-urlencoded');

        const response = await this.sendPost(url, params, headers);

        if (response && response.ok)
        {
            const data: BVideoStream = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 获取视频状态数
     * @deprecated 这个接口疑似不再可用
     * @param avid 
     * @returns 
     */
    public async getBilibiliVideoStatus(avid: number)
    {
        const url = 'https://api.bilibili.com/archive_stat/stat';
        const params = new URLSearchParams({
            aid: avid.toString()
        });

        const headers = this.returnCommonHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: videoStatus = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 获取视频快照
     * @param aid 
     * @param bvid 
     * @param cid 
     * @param index 
     * @returns 
     */
    public async getBilibiliVideoSnapshot(aid: number | null = null, bvid: string | null = null, cid: string | null = null, index: 1 | 0 = 0)
    {
        const url = 'https://api.bilibili.com/x/player/videoshot';
        const params = new URLSearchParams();
        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);
        cid && params.set('cid', cid);
        params.set('index', index.toString());

        if (cid) params.set('cid', cid);

        const headers = this.returnCommonHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: Snapshot = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 点赞视频
     * @param aid 
     * @param bvid 
     * @param like 1: 点赞 2: 取消点赞, 3: 点踩, 4: 取消点踩
     * @returns 
     */
    public async likeOrDislikeBilibiliVideo(aid: number | null = null, bvid: string | null = null, like: 1 | 2 | 3 | 4)
    {
        const url = 'https://api.bilibili.com/x/web-interface/archive/like';
        const params = new URLSearchParams({
            like: like.toString(),
            // csrf: this.BilibiliAccountData?.csrf || '',
            source: 'web_normal'
        });

        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);

        const headers = this.returnBilibiliHeaders();

        headers.set('content-type', 'application/x-www-form-urlencoded');

        const response = await this.sendPost(url, params, headers);

        if (response && response.ok)
        {
            const data: LikeVideo = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 检查是否已经点赞/点踩
     * @param aid 
     * @param bvid 
     * @returns 
     */
    public async checkIsLikedAndUnliked(aid: number | null = null, bvid: string | null = null): Promise<hasLiked | null>
    {
        const url = 'https://api.bilibili.com/x/web-interface/archive/has/like';
        const params = new URLSearchParams();
        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);

        const headers = this.returnBilibiliHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: hasLiked = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 投币视频
     * @param aid 
     * @param bvid 
     * @param multilpy 
     * @param select_like 
     * @returns 
     */
    public async addCoin(aid: number | null = null, bvid: string | null = null, multilpy: 1 | 2, select_like: 0 | 1)
    {
        const url = 'https://api.bilibili.com/x/web-interface/coin/add';
        const params = new URLSearchParams({
            multiply: multilpy.toString(),
            select_like: select_like.toString(),
            source: 'web_normal',
            eab_x: '2', // 必要，不然无法执行投币但不点赞的操作
            // csrf: this.BilibiliAccountData?.csrf || '',
        });

        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);

        const headers = this.returnBilibiliHeaders();

        headers.set('content-type', 'application/x-www-form-urlencoded');

        const response = await this.sendPost(url, params, headers);

        if (response && response.ok)
        {
            const data: AddCoin = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 检查是否已经投币
     * @param aid 
     * @param bvid 
     * @returns 
     */
    public async checkIsAddedCoin(aid: number | null = null, bvid: string | null = null)
    {
        const url = 'https://api.bilibili.com/x/web-interface/archive/coins';
        const params = new URLSearchParams();
        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);

        const headers = this.returnBilibiliHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: isAddedCoin = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 收藏或者取消收藏视频
     * @param aid 
     * @param add_media_ids 
     * @param del_media_ids 
     * @returns 
     */
    public async addFavorite(aid: number, add_media_ids: number[] | null = null, del_media_ids: number[] | null = null)
    {
        const url = 'https://api.bilibili.com/x/v3/fav/resource/deal';
        const params = new URLSearchParams({
            rid: aid.toString(),
            type: '2',
            add_media_ids: add_media_ids?.join(',') || '',
            del_media_ids: del_media_ids?.join(',') || '',
            // csrf: this.BilibiliAccountData?.csrf || '',
            eab_x: '2'
        });

        const headers = this.returnBilibiliHeaders();

        headers.set('content-type', 'application/x-www-form-urlencoded');

        const response = await this.sendPost(url, params, headers);

        if (response && response.ok)
        {
            const data: AddFavorite = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 检查是否已经收藏
     * @param aid 
     * @returns 
     */
    public async checkIsFavorite(aid: number): Promise<isAddFavorited | null>
    {
        const url = 'https://api.bilibili.com/x/v2/fav/video/favoured';
        const params = new URLSearchParams({
            aid: aid.toString()
        });

        const headers = this.returnBilibiliHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: isAddFavorited = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 一键三连
     * @param aid 
     * @param bvid 
     * @returns 
     */
    public async archiveLikeTriple(aid: number | null = null, bvid: string | null = null)
    {
        const url = 'https://api.bilibili.com/x/web-interface/archive/like/triple';
        const params = new URLSearchParams({
            // csrf: this.BilibiliAccountData?.csrf || ''
        });

        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);

        const headers = this.returnBilibiliHeaders();

        headers.set('content-type', 'application/x-www-form-urlencoded');

        const response = await this.sendPost(url, params, headers);

        if (response && response.ok)
        {
            const data: likeTriple = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 分享视频（仅仅为了增加那个分享数）
     * @param aid 
     * @param bvid 
     * @returns 
     */
    public async shareVideo(aid: number | null = null, bvid: string | null = null)
    {
        const url = 'https://api.bilibili.com/x/web-interface/share/add';
        const params = new URLSearchParams({
            // csrf: this.BilibiliAccountData?.csrf || ''
        });

        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);

        const headers = this.returnBilibiliHeaders();

        headers.set('content-type', 'application/x-www-form-urlencoded');

        const response = await this.sendPost(url, params, headers);

        if (response && response.ok)
        {
            const data: ShareVideo = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 获取视频标签
     * @param aid 
     * @param bvid 
     * @returns 
     */
    public async getVideoTags(aid: number | null = null, bvid: string | null = null)
    {
        const url = 'https://api.bilibili.com/x/tag/archive/tags';
        const params = new URLSearchParams();
        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);
        const headers = this.returnBilibiliHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: VideoTags = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 点赞标签, 重复访问会取消点赞
     * @param aid 
     * @param tag_id 
     * @returns 
     */
    public async likeTag(aid: number, tag_id: number)
    {
        const url = 'https://api.bilibili.com/x/tag/archive/like2';
        const params = new URLSearchParams({
            aid: aid.toString(),
            tag_id: tag_id.toString(),
            // csrf: this.BilibiliAccountData?.csrf || ''
        });

        const wbi = new WBI();
        const wbidata = await wbi.main(params);

        wbidata.w_rid && params.set('w_rid', wbidata.w_rid);
        wbidata.wts && params.set('wts', wbidata.wts.toString());

        const headers = this.returnBilibiliHeaders();

        headers.set('content-type', 'application/x-www-form-urlencoded');

        const response = await this.sendPost(url, params, headers);

        if (response && response.ok)
        {
            const data: LikeTagResult = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 点踩标签, 重复访问会取消点踩
     * @param aid 
     * @param tag_id 
     * @returns 
     */
    public async dislikeTag(aid: number, tag_id: number)
    {
        const url = 'https://api.bilibili.com/x/tag/archive/hate2';
        const params = new URLSearchParams({
            aid: aid.toString(),
            tag_id: tag_id.toString(),
            // csrf: this.BilibiliAccountData?.csrf || ''
        });

        const headers = this.returnBilibiliHeaders();

        headers.set('content-type', 'application/x-www-form-urlencoded');

        const response = await this.sendPost(url, params, headers);

        if (response && response.ok)
        {
            const data: LikeTagResult = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 根据视频获取推荐视频
     * @param aid 
     * @param bvid 
     * @returns 
     */
    public async getRecommandVideoFromSingleVideo(aid: number | null = null, bvid: string | null = null)
    {
        const url = 'https://api.bilibili.com/x/web-interface/archive/related';
        const params = new URLSearchParams();

        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);

        const headers = this.returnBilibiliHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: RecommandVideo = await response.json();
            return data;
        } else
        {
            return null;
        }

    }

    /**
     * 获取主页推荐视频
     * @param fresh_type 
     * @param version 
     * @param ps 获取多少，最多30
     * @param fresh_idx 
     * @param fresh_idx_1h 
     * @returns 
     */
    public async getRecommendVideoFromMainPage
        (
            fresh_type: number = 3,
            version: number = 1,
            ps: number = 8,
            fresh_idx: number = 1,
            fresh_idx_1h: number = 1,
            brush: number = 0
        ): Promise<RecommendVideoFromMainPage | null>
    {
        const url = `${this.cors}https://api.bilibili.com/x/web-interface/wbi/index/top/feed/rcmd`;
        const params = new URLSearchParams({
            fresh_type: fresh_type.toString(),
            version: version.toString(),
            ps: ps.toString(),
            fresh_idx: fresh_idx.toString(),
            fresh_idx_1h: fresh_idx_1h.toString(),
            brush: brush.toString()
        });
        const headers = this.returnBilibiliHeaders();

        const response = await this.sendGet(url, params, headers);
        if (response && response.ok)
        {
            const data: RecommendVideoFromMainPage = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 获取推荐短视频
     * @param fnval 
     * @param force_host 
     * @param fourk 
     * @returns 
     */
    public async getRecommendShortVideo(
        fnval: number = 272,
        force_host: number = 2,
        fourk: number = 1
    )
    {
        const url = 'https://app.bilibili.com/x/v2/feed/index';
        const headers = this.returnBilibiliHeaders();

        const params = new URLSearchParams({
            fnval: fnval.toString(),
            fnver: '0',
            force_host: force_host.toString(),
            fourk: fourk.toString()
        });

        const response = await this.sendGet(url, params, headers);
        if (response && response.ok)
        {
            const data: RecommentShortVideo = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 获取互动视频详情
     * @see{}
     * @param aid 
     * @param bvid 
     * @param graph_version 
     * @param edge_id 
     * @returns 
     */
    public async getInteractiveVideoDetail
        (
            aid: number | null = null,
            bvid: string | null = null,
            graph_version: number,
            edge_id: number | null = null
        )
    {
        const url = 'https://api.bilibili.com/x/stein/edgeinfo_v2';
        const params = new URLSearchParams({
            graph_version: graph_version.toString()
        });

        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);
        edge_id && params.set('edge_id', edge_id.toString());

        const headers = this.returnBilibiliHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: interactVideoDetail = await response.json();
            return data;
        } else
        {
            return null;
        }

    }

    /**
     * 获取弹幕趋势顶点列表
     * @param cid 
     * @param aid 
     * @param bvid 
     * @returns 
     */
    public async getHighEnergyBarList(cid: number, aid: number | null = null, bvid: string | null = null)
    {
        const url = 'https://bvc.bilivideo.com/pbp/data';
        const params = new URLSearchParams({
            cid: cid.toString()
        });

        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);

        const headers = this.returnBilibiliHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: HighEnergyBar = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 设置观看历史 (在视频的哪一秒)
     * @param aid 
     * @param cid 
     * @param progress 
     * @param platform 
     * @returns 
     */
    public async setViewHistory(aid: number, cid: number, progress: number = 0, platform: string = ''): Promise<reportResult | null>
    {
        const url = 'https://api.bilibili.com/x/v2/history/report';
        const params = new URLSearchParams({
            aid: aid.toString(),
            cid: cid.toString(),
            progress: progress.toString(),
            platform: platform
        });

        const headers = this.returnBilibiliHeaders();

        headers.set('content-type', 'application/x-www-form-urlencoded');

        const response = await this.sendPost(url, params, headers);

        if (response && response.ok)
        {
            const data: reportResult = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 上报心跳
     * @param aid 
     * @param bvid 
     * @param cid 
     * @param epid 
     * @param sid 
     * @param mid 
     * @param played_time 
     * @param realtime 
     * @param start_ts 
     * @param type 
     * @param sub_type 
     * @param dt 
     * @param play_type 
     * @returns 
     */
    public async postHeartbeat
        (
            aid: number | null = null,
            bvid: string | null = null,
            cid: number | null = null,
            epid: number | null = null,
            sid: number | null = null,
            mid: number | null = null,
            played_time: number = 0,
            realtime: number | null = null,
            start_ts: number | null = null,
            type: number | null = null,
            sub_type: number | null = null,
            dt: number | null = null,
            play_type: number | null = null,
        )
    {
        const url = 'https://api.bilibili.com/x/click-interface/web/heartbeat';
        const params = new URLSearchParams();
        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);
        cid && params.set('cid', cid.toString());
        epid && params.set('epid', epid.toString());
        sid && params.set('sid', sid.toString());
        mid && params.set('mid', mid.toString());
        played_time && params.set('played_time', played_time.toString());
        realtime && params.set('realtime', realtime.toString());
        start_ts && params.set('start_ts', start_ts.toString());
        type && params.set('type', type.toString());
        sub_type && params.set('sub_type', sub_type.toString());
        dt && params.set('dt', dt.toString());
        play_type && params.set('play_type', play_type.toString());

        const headers = this.returnBilibiliHeaders();

        headers.set('content-type', 'application/x-www-form-urlencoded');

        const response = await this.sendPost(url, params, headers);

        if (response && response.ok)
        {
            const data: reportResult = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 获取当前在线观看人数
     * @param aid 
     * @param bvid 
     * @returns 
     */
    public async getCurrentOnlineViewers(aid: number | null = null, bvid: string | null = null, cid: number)
    {
        const url = 'https://api.bilibili.com/x/player/online/total';
        const params = new URLSearchParams({
            cid: cid.toString()
        });
        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);

        const headers = this.returnBilibiliHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: OnlineViewer = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 获取AI总结内容
     * @param aid 
     * @param bvid 
     * @param cid 
     * @param up_mid 
     * @param ctx 
     * @returns 
     */
    public async getAIConclusionAboutVideo(
        aid: number | null = null,
        bvid: string | null = null,
        cid: number,
        up_mid: number
    ): Promise<AIConclusion | null>
    {
        const url = 'https://api.bilibili.com/x/web-interface/view/conclusion/get';
        const params = new URLSearchParams();

        params.set('cid', cid.toString());
        params.set('up_mid', up_mid.toString());
        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);

        const wbi = new WBI();
        const wbidata = await wbi.main(params);

        wbidata.w_rid && params.set('w_rid', wbidata.w_rid);
        wbidata.wts && params.set('wts', wbidata.wts.toString());

        const headers = this.returnBilibiliHeaders();
        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: AIConclusion = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 点赞或者取消点赞AI总结
     * @param aid 
     * @param bvid 
     * @param cid 
     * @param up_mid 
     * @param stid 
     * @param like_state 
     * @param ctx 
     * @returns 
     */
    public async likeAndDislikeAIConclusion
        (
            aid: number | null = null,
            bvid: string | null = null,
            cid: number,
            up_mid: number | null = null,
            stid: number,
            like_state: 1 | 2 | 3 | 4
        )
    {
        const params = new URLSearchParams();

        // 是的，他需要空的参数
        const wbi = new WBI();
        const wbidata = await wbi.main(params);
        const url = `https://api.bilibili.com/x/web-interface/view/conclusion/set?w_rid=${wbidata.w_rid}&wts=${wbidata.wts}`;

        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);
        params.set('cid', cid.toString());
        up_mid && params.set('up_mid', up_mid.toString());
        params.set('stid', stid.toString());
        params.set('like_state', like_state.toString());

        const headers = this.returnBilibiliHeaders();
        headers.set('content-type', 'application/x-www-form-urlencoded');
        const response = await this.sendPost(url, params, headers);

        if (response && response.ok)
        {
            const data: likeAndDislikeAIConclusion = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 获取投诉类型
     * @returns 
     */
    public async getAppealType()
    {
        const url = 'https://api.bilibili.com/x/web-interface/archive/appeal/tags';
        const headers = this.returnBilibiliHeaders();
        const response = await this.sendGet(url, new URLSearchParams(), headers);

        if (response && response.ok)
        {
            const data: AppealType = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 投诉稿件
     * @param aid 
     * @param tid 
     * @param desc 
     * @param attach 
     * @returns 
     */
    public async makeAppeal
        (
            aid: number,
            tid: number,
            desc: string,
            attach: string | null = null
        )
    {
        const url = 'https://api.bilibili.com/x/web-interface/appeal/v2/submit';
        const params = new URLSearchParams();
        params.set('aid', aid.toString());
        params.set('tid', tid.toString());
        params.set('desc', desc);
        attach && params.set('attach', attach);

        const headers = await this.returnBilibiliHeaders();
        headers.set('content-type', 'application/x-www-form-urlencoded');
        const response = await this.sendPost(url, params, headers);

        if (response && response.ok)
        {
            const data: MakeAppealResult = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 获取视频合集信息
     * @param mid 
     * @param season_id 
     * @param sort_reverse 
     * @param page_num 
     * @param page_size 
     * @returns 
     */
    public async getSeasonArchivesList
        (
            mid: number,
            season_id: number,
            sort_reverse: boolean | null = null,
            page_num: number | null = null,
            page_size: number | null = null,
        )
    {
        const url = 'https://api.bilibili.com/x/polymer/web-space/seasons_archives_list';
        const params = new URLSearchParams();
        params.set('mid', mid.toString());
        params.set('season_id', season_id.toString());
        sort_reverse && params.set('sort_reverse', sort_reverse.toString());
        page_num && params.set('page_num', page_num.toString());
        page_size && params.set('page_size', page_size.toString());

        const headers = this.returnBilibiliHeaders();
        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: SeasonArchives = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    public async getBilibiliPagesAndCids(aid: number | null = null, bvid: string | null = null)
    {
        const url = `${this.cors}https://api.bilibili.com/x/player/pagelist`
        const params = new URLSearchParams();

        aid && params.set('aid', aid.toString());
        bvid && params.set('bvid', bvid);

        const headers = this.returnBilibiliHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: BilibiliPagesAndCids = await response.json();
            return data;
        } else
        {
            return null;
        }

    }



}