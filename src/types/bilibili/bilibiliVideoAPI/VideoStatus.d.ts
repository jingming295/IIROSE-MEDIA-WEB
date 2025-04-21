interface videoStatus
{
    code: number;
    message: string;
    ttl: number;
    data: videoStatusData | null;
}

interface videoStatusData
{
    aid: number;
    bvid: string;
    view: number;
    danmaku: number;
    reply: number;
    favorite: number;
    coin: number;
    share: number;
    like: number;
    now_rank: number;
    his_rank: number;
    no_reprint: number;
    copyright: number;
    argue_msg: string;
    evaluation: string;
}