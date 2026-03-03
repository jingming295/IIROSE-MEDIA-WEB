interface GDStudioSearch
{
    id: string;
    name: string;
    artist: string[];
    album: string;
    pic_id: string;
    url_id: string;
    lyric_id: string;
    source: 'joox' | string; // 明确来源，也可以直接用 string
    from: string;
}

interface GDStudioMusicUrl
{
    url: string;
    br: number;
    size: number;
}

interface GDStudioLyric
{
    lyric: string;
    tlyric: string;
}