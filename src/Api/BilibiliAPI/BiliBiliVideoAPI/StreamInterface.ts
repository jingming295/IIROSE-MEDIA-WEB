export interface BVideoStream
{
    code: number;
    message: string;
    ttl: number;
    data?: BVideoStreamData;
}

interface BVideoStreamData
{
    from?: string; // "local"
    result?: string; // "suee"
    message?: string; // "空"
    quality?: number; // 清晰度标识
    format?: string; // 视频格式
    timelength?: number; // 视频长度，单位为毫秒，不同分辨率 / 格式可能有略微差异
    accept_format?: string; // 视频格式
    accept_description?: string[]; // 支持的清晰度列表（文字说明）
    accept_quality?: number[]; // 支持的清晰度列表（代码）
    video_codecid?: number; // 默认选择视频流的编码id
    seek_param?: string; // start?
    seek_type?: string; // offset?
    durl?: durl[]; // 视频分段流信息 注：仅 FLV / MP4 格式存在此字段 (传入的fnval为1)
    dash?: dash; // DASH 流信息	注：仅 DASH 格式存在此字段 (传入的fnval为dash所接受的)
    support_formats?: SupportFormat[]; // 支持格式的详细信息
    high_format?: null; // （？）
    last_play_time?: number; // 上次播放进度，单位为毫秒
    last_play_cid?: number; // 上次播放分P的cid
    v_voucher?: string; // 如果中风控了才有，貌似是b站内部记录的id
}
interface durl
{
    size: number; // 视频分段流大小，单位为字节
    ahead: string; // ?
    length: number; // 视频长度，单位为毫秒
    vhead: string; // ?
    backup_url: string[]; // 备用视频流
    url: string; // 默认视频流url
    order: number; // 视频分段序号
}

export interface dash
{
    duration: number; // 视频长度，单位为秒
    minBufferTime: number; // 1.5?
    min_buffer_time: number; // 1.5?
    video: dashVideoAndAudio[]; // 视频流信息
    audio: dashVideoAndAudio[]; // 音频流信息
    dolby: dashDolby[]; // 杜比全景声伴音信息
    flac: {
        display: boolean; // 是否在播放器显示切换无损音轨按钮
        audio: dashVideoAndAudio[]; // 无损音轨伴音信息
    } // 无损音轨伴音信息
}

interface dashVideoAndAudio
{
    id: number; // 音视频清晰度代码
    baseUrl: string; // 视频流地址
    base_url: string; // 视频流地址
    backupUrl: string[]; // 视频流备用地址
    backup_url: string[]; // 视频流备用地址
    bandwidth: number; // 带宽
    mimeType: string; // 格式 mimetype 类型
    mime_type: string; // 格式 mimetype 类型
    codecs: string; // 编码格式
    width: number; // 视频宽度，单位为像素
    height: number; // 视频高度，单位为像素
    frameRate: string; // 帧率
    frame_rate: string; // 帧率
    sar: string; // Sample Aspect Ratio（单个像素的宽高比）
    startWithSap: number; // Stream Access Point（流媒体访问位点）
    SegmentBase: {
        Initialization: string;
        indexRange: string;
    }
    segment_base: {
        Initialization: string;
        index_range: string;
    }
    codecid: number; // 视频编码格式代码
}

interface dashDolby
{
    type: number; // 类型
    audio: dashVideoAndAudio[]; // 音频流信息
}
interface SupportFormat
{
    display_desc: string; // 格式描述
    codecs: string[]; // 请根据实际情况填写具体的类型
    format: string; // 视频格式
    description: string; // 格式描述
    quality: number; // 视频清晰度代码
    new_description: string; // 格式描述
}