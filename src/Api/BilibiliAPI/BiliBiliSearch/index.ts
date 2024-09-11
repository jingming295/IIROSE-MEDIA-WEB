import { SendFetch } from "../..";
import { WBI } from "../Crypto/WBI";
import { SearchRequest, SearchRequestByType, SearchRequestByTypeArticle, SearchRequestByTypeLive, SearchRequestByTypeLiveRoom, SearchRequestByTypeLiveUser, SearchRequestByTypeMediaBangumiAndMediaFT, SearchRequestByTypePhoto, SearchRequestByTypeVideo } from "./SearchRequestInterface";

export class BiliBiliSearchApi extends SendFetch
{

    /**
     * 综合搜索（web端）
     * @param keyword 
     * @param ctx 
     * @returns 
     */
    public async getSearchRequestAll(keyword: string)
    {
        const url = 'https://api.bilibili.com/x/web-interface/wbi/search/all/v2';
        const params = new URLSearchParams({
            keyword: keyword,
            search_type: 'article'
        });

        const wbi = new WBI();

        const wbidata = await wbi.main(params);

        wbidata.w_rid && params.append('w_rid', wbidata.w_rid);
        wbidata.wts && params.append('wts', wbidata.wts.toString());

        const headers = this.returnBilibiliHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: SearchRequest = await response.json();
            return data;

        } else
        {
            return null;
        }


    }

    /**
     * 分类搜索（web端）
     * @param search_type 
     * @param keyword 
     * @param page 
     * @param order 
     * @param order_sort 
     * @param user_type 
     * @param duration 
     * @param tids 
     * @param category_id 
     * @param ctx 
     * @returns 
     */
    public async getSearchRequestByType
        (
            search_type: string,
            keyword: string,
            page: number | null = null,
            page_size: number | null = null,
            order: string | null = null,
            order_sort: string | null = null,
            user_type: number | null = null,
            duration: number | null = null,
            tids: number | null = null,
            category_id: number | null = null
        )
    {
        const url = `${this.cors}https://api.bilibili.com/x/web-interface/wbi/search/type`;
        const params = new URLSearchParams({
            search_type: search_type,
            keyword: keyword
        });
        page_size && params.append('page_size', page_size.toString());
        page && params.append('page', page.toString());
        order && params.append('order', order);
        order_sort && params.append('order_sort', order_sort);
        user_type && params.append('user_type', user_type.toString());
        duration && params.append('duration', duration.toString());
        tids && params.append('tids', tids.toString());
        category_id && params.append('category_id', category_id.toString());
        const wbi = new WBI();
        const wbidata = await wbi.main(params);
        wbidata.w_rid && params.append('w_rid', wbidata.w_rid);
        wbidata.wts && params.append('wts', wbidata.wts.toString());

        const headers = this.returnBiliBiliHeadersBuvidOnly();
        const response = await this.sendGet(url, params, headers);
        if (response && response.ok)
        {
            const data = await response.json();
            return data;

        } else
        {
            return null;
        }

    }

    /**
     * 视频搜索（web端）
     * @param keyword 
     * @param page 
     * @param page_size 返回多少内容，最大50
     * @param order 
     * @param duration 
     * @param tids 
     * @param ctx 
     * @returns 
     */
    public async getSearchRequestByTypeVideo(
        keyword: string,
        page: number | null = null,
        page_size: number | null = null,
        order: string | null = null,
        duration: number | null = null,
        tids: number | null = null
    )
    {
        const data: SearchRequestByTypeVideo = await this.getSearchRequestByType('video', keyword, page, page_size, order, null, null, duration, tids, null);
        return data;
    }

    /**
     * 番剧搜索（web端）
     * @param keyword // 需要搜索的关键词
     * @param page // 页码
     * @param ctx
     * @returns 
     */
    public async getSearchRequestByTypeMediaBangumi
        (
            keyword: string,
            page: number | null = null
        )
    {
        const data: SearchRequestByTypeMediaBangumiAndMediaFT = await this.getSearchRequestByType('media_bangumi', keyword, page, null, null, null, null, null, null);
        return data;
    }

    /**
     * 影视搜索（web端）
     * @param keyword 
     * @param page 
     * @param ctx 
     * @returns 
     */
    public async getSearchRequestByTypeMediaFT
        (
            keyword: string,
            page: number | null = null
        )
    {
        const data: SearchRequestByTypeMediaBangumiAndMediaFT = await this.getSearchRequestByType('media_ft', keyword, page, null, null, null, null, null, null);
        return data;
    }

    /**
     * 直播间和主播搜索（web端）
     * @param keyword 
     * @param page 
     * @param order 
     * @param ctx 
     * @returns 
     */
    public async getSearchRequestByTypeLiveRoomAndLiveUser(
        keyword: string,
        page: number | null = null,
        page_size: number | null = null,
        order: string | null = null
    )
    {
        const data: SearchRequestByTypeLive = await this.getSearchRequestByType('live', keyword, page, page_size, order, null, null, null, null, null);
        return data;
    }

    /**
     * 直播间搜索（web端）
     * @param keyword 
     * @param page 
     * @param order 
     * @param ctx 
     * @returns 
     */
    public async getSearchRequestByTypeLiveRoom(
        keyword: string,
        page: number | null = null,
        page_size: number | null = null,
        order: string | null = null
    )
    {
        const data: SearchRequestByTypeLiveRoom = await this.getSearchRequestByType('live_room', keyword, page, page_size, order, null, null, null, null, null);
        return data;
    }

    /**
     * 主播搜索（web端）
     * @param keyword 
     * @param page 
     * @param ctx 
     * @returns 
     */
    public async getSearchRequestByTypeLiveUser(
        keyword: string,
        page: number | null = null
    )
    {
        const data: SearchRequestByTypeLiveUser = await this.getSearchRequestByType('live_user', keyword, page, null, null, null, null, null, null);
        return data;
    }

    /**
     * 专栏搜索（web端）
     * @param keyword 
     * @param page 
     * @param order 
     * @param category_id 
     * @param ctx 
     * @returns 
     */
    public async getSearchRequestByArticle(
        keyword: string,
        page: number | null = null,
        page_size: number | null = null,
        order: string | null = null,
        category_id: number | null = null,
    )
    {
        const data: SearchRequestByTypeArticle = await this.getSearchRequestByType('photo', keyword, page, page_size, order, null, null, null, null, category_id);
        return data;
    }

    /**
     * 相簿搜索（web端），他还存在，但是返回的result是空的
     * @param keyword 
     * @param page 
     * @param order 
     * @param category_id 
     * @param ctx 
     * @returns 
     */
    public async getSearchRequestByPhoto(
        keyword: string,
        page: number | null = null,
        page_size: number | null = null,
        order: string | null = null,
        category_id: number | null = null,
    )
    {
        const data: SearchRequestByTypePhoto = await this.getSearchRequestByType('photo', keyword, page, page_size, order, null, null, null, null, category_id);
        return data;
    }

}