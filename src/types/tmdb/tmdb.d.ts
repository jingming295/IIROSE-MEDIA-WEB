/**
 * TMDB 媒体类型：电影、剧集或人物
 */
type TMDBMediaType = 'movie' | 'tv' | 'person';

/**
 * 单条搜索结果项
 */
interface TMDBSearchItem
{
    id: number;
    media_type: TMDBMediaType;
    adult: boolean;
    backdrop_path: string | null;
    overview: string;
    poster_path: string | null;
    original_language: string;
    genre_ids: number[];
    popularity: number;
    vote_average: number;
    vote_count: number;
    video?: boolean;

    // 电影特有字段
    title?: string;
    original_title?: string;
    release_date?: string;

    // 剧集特有字段
    name?: string;
    original_name?: string;
    first_air_date?: string;
    origin_country?: string[];
}

/**
 * TMDB 搜索接口完整响应结构
 */
interface TMDBSearchResponse
{
    page: number;
    results: TMDBSearchItem[];
    total_pages: number;
    total_results: number;
}