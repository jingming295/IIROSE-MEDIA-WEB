import { SendFetch } from "../../index";
import { NeteaseMusicAPI } from "../NeteaseMusic/index";
import { d } from "../Crypto";
import { SearchData } from "./SearchInterface";
import { RecommendSongList } from "./RecommendInterface";

export class NeteaseSearchAPI extends SendFetch
{

    /**
     * 获取网易云主页推荐歌单
     * @returns 
     */
    public async NeteaseRecommandPlayList(): Promise<[] | null>
    {
        const url = `${this.cors}https://music.163.com/discover`;
        const response = await this.sendGet(url, new URLSearchParams());
        if (response && response.ok)
        {
            const data = await response.text();
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(data, 'text/html');
            const uCovers = htmlDoc.querySelectorAll('.u-cover');
            const extractedData: [] = [];
            const neteaseMusic = new NeteaseMusicAPI();
            const uCoversArray = Array.from(uCovers);
            for (const uCover of uCoversArray)
            {
                const img = uCover.querySelector('img');
                const aElement = uCover.querySelector('a');
                if (aElement && img?.src)
                {
                    if (aElement.href.includes('/playlist'))
                    {
                        const imageUrl = new URL(img.src);
                        imageUrl.search = '';
                        const title = aElement.title;
                        const href = aElement.href;
                        const urlParams = new URLSearchParams(href.split('?')[1]);
                        const id = urlParams.get('id');
                        const songDetail = neteaseMusic.getSongListDetail(Number(id));
                        if (!songDetail) return null;
                        const item = {
                            id: parseInt(id || '') || 0,
                            title: title,
                            img: imageUrl.toString(),
                            url: href,
                            author: new Promise<string>((resolve, reject) =>
                            {
                                // 处理 songDetail 的 Promise
                                songDetail.then((detail) =>
                                {
                                    if (detail && detail.playlist && detail.playlist.creator)
                                    {
                                        resolve(detail.playlist.creator.nickname);
                                    } else
                                    {
                                        resolve('无法获取'); // 默认值
                                    }
                                }).catch((error) =>
                                {
                                    console.error('Error fetching song detail:', error);
                                    reject(error);
                                });
                            }),
                            duration: '歌单'
                        }

                        // extractedData.push(item);
                    }

                }
            }
            // console.log(data)

            return extractedData;
        } else
        {
            return null;
        }
    }

    public async getNeteaseRecommandPlayList(limit: number)
    {
        const url = `${this.cors}https://music.163.com/weapi/personalized/playlist`

        const params = {
            limit: limit,
            total: true,
            n: 1000,
            csrf_token: ''
        }

        const we = d(params);
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
        const we = d(params);
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

    public async getNeteaseRecommandPlayListFromBinaryify(limit: number = 30, api: 'xc' | 'theresa', warn = true)
    {
        const theresaAPI = window.netease?.theresaAPI;
        const xcAPI = window.netease?.xcAPI;
        const realAPI = this.getRealAPI(api, xcAPI, theresaAPI);
        const url = `${realAPI}/personalized`
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

    public async getNeteaseSearchDataFromBinaryify(keyWord: string, type: number, offset: number, api: 'xc' | 'theresa', limit: number = 100)
    {
        const theresaAPI = window.netease?.theresaAPI;
        const xcAPI = window.netease?.xcAPI;

        const realAPI = this.getRealAPI(api, xcAPI, theresaAPI);

        const url = new URL(`${realAPI}cloudsearch`);
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

    private getRealAPI(api: 'xc' | 'theresa', xcAPI?: string, theresaAPI?: string)
    {
        let realAPI = null;

        if (api === 'xc' && xcAPI)
        {
            realAPI = xcAPI;
        } else if (api === 'theresa' && theresaAPI)
        {
            realAPI = theresaAPI;
        } else if (theresaAPI)
        {
            realAPI = theresaAPI;
        } else if (xcAPI)
        {
            realAPI = xcAPI;
        }

        return realAPI;
    }
}