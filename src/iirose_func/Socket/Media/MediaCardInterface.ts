export interface MediaData
{
    type: 'music' | 'video';
    name: string;
    singer: string;
    cover: string;
    link: string;
    url: string;
    duration: number;
    bitRate: number;
    color: string;
    lyrics?: string;
    origin?: 'netease' | 'bilibili' | 'bilibililive' | 'video' | 'netEaseMV' | 'null' | 'undefined' | null;
}