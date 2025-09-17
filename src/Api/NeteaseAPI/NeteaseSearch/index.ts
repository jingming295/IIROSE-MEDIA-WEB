import { SendFetch } from "../../index";
import { d } from "../Crypto";
import { SearchData } from "./SearchInterface";
import { RecommendSongList } from "./RecommendInterface";

export class NeteaseSearchAPI extends SendFetch
{

    public async getNeteaseRecommandPlayList(limit: number)
    {
        const url = `${this.cors}https://music.163.com/weapi/personalized/playlist`

        const params = {
            limit: limit,
            total: true,
            n: 1000,
            csrf_token: ''
        }

        const we = await d(params);
        const enc = {
            params: we.encText,
            encSecKey: we.encSecKey
        }

        const encparams = new URLSearchParams(enc);


        const response = await this.sendPost(url, encparams);

        if (response && response.ok)
        {
            const data: RecommendSongList = await response.json();
            return data;
        } else
        {
            return null;
        }

    }

    /**
     * 获取网易云搜索数据
     * @param keyWord 
     * @param type
     * @param limit 
     * @returns 
     */
    public async getNeteaseMusicSearchData(keyWord: string, type: number, offset: number, limit: number = 100)
    {
        const url = `${this.cors}https://music.163.com/weapi/search/get`;
        const params = {
            s: keyWord, // 关键词
            type: type, // 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单, 1002: 用户, 1004: MV, 1006: 歌词, 1009: 电台, 1014: 视频
            limit: limit, // 返回歌曲数量
            offset: offset.toString(), // 偏移量
        }
        const we = await d(params);
        const enc = {
            params: we.encText,
            encSecKey: we.encSecKey
        }
        const encparams = new URLSearchParams(enc);
        const response = await this.sendPost(url, encparams);
        if (response && response.ok)
        {
            const data: SearchData = await response.json();
            return data;
        } else
        {
            return null;
        }

    }

    public async getNeteaseRecommandPlayListFromBinaryify(limit: number = 30, warn = true)
    {

        const xcAPI = window.netease?.xcAPI;
        const url = `${xcAPI}/personalized`
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        const response = await this.sendGet(url, params, undefined, warn);
        if (response && response.ok)
        {
            const data: RecommendSongList = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    public async getNeteaseSearchDataFromBinaryify(keyWord: string, type: number, offset: number, limit: number = 100)
    {

        const xcAPI = window.netease?.xcAPI;

        const url = new URL(`${xcAPI}cloudsearch`);
        const params = new URLSearchParams({
            keywords: keyWord,
            type: type.toString(),
            limit: limit.toString(),
            offset: offset.toString()
        });

        const response = await this.sendGet(url.toString(), params);

        if (response && response.ok)
        {
            const data: SearchData = await response.json();
            return data;
        } else
        {
            return null;
        }
    }
}