export interface VideoTags
{
    code: 0 | -400 | number;
    message: string;
    ttl: number;
    data?: TagList[];
}

interface TagList
{
    tag_id: number;
    tag_name: string;
    cover: string;
    head_cover: string;
    content: string;
    short_content: string;
    type: number;
    state: number;
    ctime: number;
    count: {
        view: number;
        use: number;
        atten: number;
    }
    is_atten: number;
    likes: number;
    hates: number;
    attribute: number;
    liked: number;
    hated: number;
    extra_attr: number; // ???
}

export interface LikeTagResult
{
    code: 0 | -400 | -403 | number;
    message: string;
    ttl: number;
}