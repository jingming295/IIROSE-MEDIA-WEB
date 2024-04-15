export interface LiveStream{
    code: number;
    message: string;
    ttl: number;
    data?: LiveStreamData;
}

interface LiveStreamData{
    current_quality: number; // 当前画质代码 quality
    accept_quality: number[]; // 可选画质代码 quality
    current_qn: number; // 当前画质代码 qn
    quality_description: {
        qn: number; // 画质代码
        desc: string; // 画质描述
    }[];
    durl?: Durl[];
}

interface Durl{
    url: string; // 视频流地址
    length: number; // 未知
    order: number; // 服务器线路序号
    stream_type: number; // 未知
    p2p_type: number; // 未知
}