export interface SearchData{
    code: number;
    hasMore?: boolean;
    songCount: number;
    result?: {
        hasMore: boolean;
        songCount: number;
        songs?: Song[];
    };
}

interface Song{
    album: {
        artist:{
            albumSize: number;
            alias: [];
            fansGroup: null;
            id: number;
            img1v1: number;
            img1v1Url: string; // 歌手图片
            name: string; // 歌手名
            picId: number;
            picUrl: null;
            trans: null
        }
        copyrightId: number;
        id: number;
        mark: number;
        name: string;
        picId: number;
        publishTime: number;
        size: number; // 专辑歌曲数量
        status: number;
    }; // 专辑信息
    alias: [];
    artists: {
        albumSize: number;
        alias: [];
        fansGroup: null;
        id: number;
        img1v1: number;
        img1v1Url: string; // 歌手图片
        name: string; // 歌手名
        picId: number;
        picUrl: null;
        trans: null
    }[];
    copyrightId:number
    duration:number; // 时长, 貌似是毫秒
    fee: number;
    ftype: number;
    id: number; // 歌曲id
    mark: number;
    mvid: number;
    name: string; // 歌曲名
    rUrl: null;
    rtype: number;
    status: number;
}