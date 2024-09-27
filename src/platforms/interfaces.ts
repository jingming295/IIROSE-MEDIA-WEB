export interface PlatformData
{
    title: string;
    subtitle?: string;
    coverImg: string;
    author: string;
    websiteUrl: string;
    duration?: number;
    trackCount?: string;
    multiPage?: Promise<boolean>;
    multiAction?: boolean;
    bilibili?: {
        aid?: number;
        bvid?: string;
        cid?: number;
        course_id?: number;
    }
    bilibiliLive?: {
        roomid: number;
    }
    neteaseMusic?: {
        id: number;
        isSongList?: boolean;
        isAlbum?: boolean;
        isMV?: boolean;
        isDjRadios?: boolean;
    }
}