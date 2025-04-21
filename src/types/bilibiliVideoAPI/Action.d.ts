interface LikeVideo
{
    code: 0 | -101 | -111 | -400 | -403 | 10003 | 65004 | 65006 | number,
    message: string,
    ttl: number;
}

interface hasLiked
{
    code: 0 | -101 | -400,
    message: string,
    ttl: number,
    data: 0 | 1 | 2; // 0: 未点赞, 1: 已点赞, 2: 已点踩
}

interface AddCoin
{
    code: 0 | -101 | -102 | -104 | -400 | 10003 | 34002 | 34003 | 34004 | 34005 | number,
    message: string,
    ttl: number;
    data?: {
        like: boolean; // 是否点赞
    }
}

/**
 * AddCoin的data，但是目前用不上
 */
interface addCoinUnauthorizedAccessData
{
    ga_data: {
        decision: string[],
        risk_level: number,
        grisk_id: string,
        decision_ctx: {
            buvid: string,
            decision_type: string,
            ip: string,
            mid: string,
            origin_scene: string,
            referer: string,
            scene: string,
            ua: string,
            v_voucher: string; // 疑似b站内部的用来追踪异常行为的凭证
        }
    }
}

interface isAddedCoin
{
    code: 0 | -101 | -400 | number,
    message: string,
    ttl: number,
    data: {
        multiply: number;
    }
}

interface AddFavorite
{
    code: 0 | -101 | -111 | -400 | -403 | 10003 | 11010 | 11201 | 11202 | 11203 | 72010017 | 2001000 | number,
    message: string,
    data: {
        prompt: boolean; // 用来判断是否为为关注用户收藏 true: 为关注用户收藏 false: 为未关注用户收藏
    }
}

interface isAddFavorited
{
    code: 0 | -101 | -111 | -400 | -403 | 10003 | number,
    message: string,
    ttl: number,
    data: {
        count: number; // 作用不明确
        favoured: boolean;
    }
}

interface likeTriple
{
    code: 0 | -101 | -111 | -400 | -403 | 10003 | number,
    message: string,
    ttl: number,
    data: {
        like: boolean, // 是否点赞成功
        coin: boolean, // 是否投币成功
        fav: boolean; // 是否收藏成功
        multiply: number; // 投币数量(默认为2)
        is_risk: boolean;
        gaia_res_type: number;
        gaia_data: null;
    }
}

interface ShareVideo
{
    code: 0 | -101 | -400 | number,
    message: string,
    ttl: number,
    data?: number; // 当前分享数
}