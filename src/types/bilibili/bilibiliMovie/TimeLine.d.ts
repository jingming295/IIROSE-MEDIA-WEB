interface TimeLine
{
    code: number;
    message: string;
    result: TimeLineResult[];
}

interface TimeLineResult
{
    date: string; // 当日日期
    date_ts: number; // 当日日期时间戳
    day_of_week: number; // 一周中第几天
    episodes: {
        cover: string; // 封面图url
        delay: number; // 是否推迟
        delay_id: number; // 推迟一话epid
        delay_index: string; // 推迟一话名称
        delay_reason: string; // 推迟原因
        enable_vt: boolean; // 不知道有什么用途
        ep_cover: string; // 最新一话图url
        episode_id: number; // 最新一话的epid
        follows: string; // 不知道有什么用途
        icon_font: {
            name: string; // 不知道有什么用途
            text: string; // 不知道有什么用途
        },
        plays: string; // 不知道有什么用途
        pub_index: string; // 最新一话名称
        pub_time: string; // 发布时间
        pub_ts: number; // 发布时间戳
        published: number; // 是否已发布
        season_id: number; // 剧集ssid
        square_cover: string; // 缩略图url
        title: string; // 剧集标题
    }[]; // 剧集列表
    is_today: number; // 是否今日
}