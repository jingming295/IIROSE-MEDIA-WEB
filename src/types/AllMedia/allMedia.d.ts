// 内部接口，描述 PHP 返回的原始数据项
interface MacCMSVodItem
{
    vod_id: number;
    vod_name: string;
    vod_remarks: string;
    vod_pic: string;
    type_name: string;
    vod_time: string;
    vod_play_url: string;
    vod_content: string; // 剧情介绍
    vod_actor: string;   // 演员
    vod_duration: string; // 时长字符串，如 "105分钟"
}

// 描述完整的 API 响应结构
interface MacCMSApiResponse
{
    code: number;
    msg: string;
    page: number;
    pagecount: number;
    limit: number;
    total: number;
    list: MacCMSVodItem[];
}

interface PlayItem
{
    episode: string;
    url: string;
}

// 定义单个资源的详细信息
interface MaotaiResourceItem
{
    name: string;
    subtitle: string;
    url: string;
    type: string;
    updateTime: string;
    poster: string;
    playList: PlayItem[];
}

// 定义整个搜索结果对象
interface MaotaiResource
{
    resource: MaotaiResourceItem[]; // 这是一个数组，包含本页所有影片
    pagecount: number;              // 总页数
}