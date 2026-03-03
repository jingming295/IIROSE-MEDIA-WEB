interface PlatformData
{
    title: string;
    subtitle?: string;
    coverImg: string | Promise<string>;
    author: string;
    websiteUrl: string;
    duration?: number;
    trackCount?: string;
    multiPage?: Promise<MultiPageData | undefined>;
    playList?: PlayItem[];
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
        fee: number;
    },
    joox?: {
        id: string;
        isSong?: boolean;
    }
}

interface MultiPageData
{
    platform: 'video' | 'bilibili' | 'neteasemusic';
}