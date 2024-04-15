export interface MovieStreamFormat
{
    code: number;
    message: string;
    result?: {
        accept_format: string;
        code: number;
        seek_param: string;
        is_preview: number;
        fnval: number;
        video_project: boolean;
        fnver: number;
        type: string;
        bp: number;
        result: string;
        seek_type: string;
        from: string;
        video_codecid: number;
        record_info: {
            record_icon: string;
            record: string;
        };
        is_drm: boolean;
        no_rexcode: number;
        format: string;
        support_formats: SupportFormat[];
        accept_quality: number[];
        quality: number;
        timelength: number;
        has_paid: boolean;
        vip_status: number;
        clip_info_list?: {
            materialNo: number;
            start: number;
            end: number;
            toastText: string;
            clipType: string;
        }[];
        accept_description: string[];
        status: number;
        video_info?: {
            durl: durl[];
        };
        durl?: durl[];
        dash?: dash;
        durls?: [];
    };
}

interface durl
{
    size: number;
    ahead: string;
    length: number;
    vhead: string;
    backup_url: string[];
    url: string;
    order: number;
    md5: string;
}

interface SupportFormat
{
    display_desc: string;
    superscript: string;
    need_login: boolean;
    codecs: string[]; // 请根据实际情况填写具体的类型
    format: string;
    description: string;
    quality: number;
    new_description: string;
}

interface dash
{
    duration: number;
    minBufferTime: number;
    min_buffer_time: number;
    video: {}[];
    audio: {
        start_with_sap: number
        bandwidth: number
        sar: string
        backupUrl: [],
        codecs: string
        base_url: string
        backup_url: [],
        segment_base: { 
            initialization: string
            index_range: string
        },
        mimeType: string
        frame_rate: string
        SegmentBase: { 
            Initialization: string
            indexRange: string
        },
        frameRate: string
        codecid: number
        baseUrl: string
        size: number
        mime_type: string
        width: number
        startWithSAP: number
        id: number
        height: number
        md5: string
    }[];
    dolby: {
        audio: [];
        type: number;
    };
}