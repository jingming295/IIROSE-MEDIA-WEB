export interface RecommendSongList{
    category: number;
    code: number;
    hasTaste: boolean;
    result?: {
        alg: string; // 未知
        canDislike: boolean; // 是否可以不喜欢
        copywriter: string; // 未知
        highQuality: boolean; // 未知
        id: number; // 歌单id
        name: string; // 歌单名
        picUrl: string; // 歌单图片
        playCount: number; // 播放量
        trackCount: number; // 歌曲数量
        trackNumberUpdateTime:number; // 最后更新时间? 时间戳
        type: number; // 未知
    }[]
}