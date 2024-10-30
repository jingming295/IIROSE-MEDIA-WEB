import { SendFetch } from "../../index";
import { SongDetail, SongDetailFromBinaryify, SongDetailSong, SongsFromBinaryify } from "./SongDetailInterface";
import { Lyric, SongList, xcSongResource } from "./SongList";
import { d } from "../Crypto";
import { AlbumData } from "./AlbumInterface";
import { MVDetail, MVPlayURLData } from "./MVInterfaces";

export class NeteaseMusicAPI extends SendFetch
{

    /**
     * 直接访问网易云音乐的接口获取歌单详情
     * @param id 
     * @returns 
     */
    public async getSongListDetail(id: number)
    {
        const url = `${this.cors}https://music.163.com/api/v6/playlist/detail`;
        const params = new URLSearchParams({
            id: id.toString(),
            n: '100000',
            s: '8'
        });
        const response = await this.sendGet(url, params);
        if (response && response.ok)
        {
            const data: SongList = await response.json();
            return data;
        } else
        {
            return null;
        }

    }

    public async getAlbumDetail(id: number)
    {
        const url = `${this.cors}https://music.163.com/weapi/v1/album/${id}`
        const params = {
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
            const data: AlbumData = await response.json();
            console.log(data)
            return data;
        } else
        {
            return null;
        }
    }

    public async getNeteaseAlbumDetailFromBinaryify(id: number, api: 'xc' | 'theresa')
    {
        try
        {
            const theresaAPI = window.netease?.theresaAPI;
            const xcAPI = window.netease?.xcAPI;

            const realAPI = this.getRealAPI(api, xcAPI, theresaAPI);
            const url = `${realAPI}album`;
            const params = new URLSearchParams({
                id: id.toString(),
            });

            const response = await this.sendGet(url, params);

            if (response && response.ok)
            {
                const data: AlbumData = await response.json();
                return data;
            } else
            {
                return null;
            }
        } catch (error)
        {
            return null;
        }

    }

    /**
     * 直接访问网易云音乐的接口获取歌曲详情
     * @param id 
     * @param corsnum 
     * @returns 
     */
    public async getNeteaseSongDetail(ids: number[]): Promise<SongDetailSong[] | null>
    {
        const CHUNK_SIZE = 100; // 每次最多 150 个 ids
        const allSongs: SongDetailSong[] = []; // 用于存储所有的 songs

        // 将 ids 数组拆分为多个子数组
        const chunks = this.chunkArray(ids, CHUNK_SIZE);

        try
        {
            // 逐个请求每个子数组
            for (const chunk of chunks)
            {
                const url = new URL(`${this.cors}http://music.163.com/api/song/detail`);

                const params = new URLSearchParams({
                    ids: `[${chunk.toString()}]`
                });

                const response = await this.sendGet(url.toString(), params, undefined, true);

                if (response && response.ok)
                {
                    const data: SongDetail = await response.json();
                    if (data.songs)
                    {
                        // 将当前请求的 songs 合并到最终结果中
                        allSongs.push(...data.songs);
                    } else
                    {
                        console.error('获取歌曲详情失败');
                        return null;
                    }
                } else
                {
                    console.error('Request failed', response);
                    return null;
                }
            }

            return allSongs;
        } catch (error)
        {
            console.error('Error fetching song details', error);
            return null;
        }
    }

    public async getNeteaseMVDetail(id: number)
    {
        const url = `${this.cors}https://music.163.com/weapi/v1/mv/detail`
        const params = {
            id: id.toString(),
            csrf_token: ''
        }

        const headers = new Headers();
        const we = d(params);
        const enc = {
            params: we.encText,
            encSecKey: we.encSecKey
        }

        const encparams = new URLSearchParams(enc);

        headers.append('content-type', 'application/x-www-form-urlencoded')

        const response = await this.sendPost(url, encparams, headers);

        if (response && response.ok)
        {
            const data: MVDetail = await response.json();
            return data;
        } else
        {
            return null;
        }

    }

    // 拆分数组的辅助函数
    private chunkArray(array: number[], size: number): number[][]
    {
        const result: number[][] = [];
        for (let i = 0; i < array.length; i += size)
        {
            result.push(array.slice(i, i + size));
        }
        return result;
    }

    /**
     * 访问小草的网易云音乐接口获取歌曲详情
     * @param id 
     * @returns 
     */
    public async getNeteaseSongDetailFromBinaryify(ids: number[], api: 'xc' | 'theresa')
    {

        const CHUNK_SIZE = 500;
        const allSongs: SongsFromBinaryify[] = []; // 用于存储所有的 songs

        // 将 ids 数组拆分为多个子数组
        const chunks = this.chunkArray(ids, CHUNK_SIZE);
        const theresaAPI = window.netease?.theresaAPI;
        const xcAPI = window.netease?.xcAPI;

        const realAPI = this.getRealAPI(api, xcAPI, theresaAPI);

        try
        {
            // 逐个请求每个子数组
            for (const chunk of chunks)
            {
                const url = new URL(`${realAPI}song/detail`);
                const params = new URLSearchParams({
                    ids: chunk.toString()
                });

                const response = await this.sendGet(url.toString(), params, undefined, true);

                if (response && response.ok)
                {
                    const data: SongDetailFromBinaryify = await response.json();
                    if (data.songs)
                    {
                        allSongs.push(...data.songs);
                    } else
                    {
                        console.error('获取歌曲详情失败');
                        return null;
                    }
                } else
                {
                    console.error('Request failed', response);
                    return null;
                }
            }

            return allSongs;

        } catch (error)
        {
            return null;
        }

    }

    /**
     * 访问小草的网易云音乐接口获取歌单详情
     * @param id 
     * @returns 
     */
    public async getNeteaseSongListDetailFromBinaryify(id: number, api: 'xc' | 'theresa')
    {
        const theresaAPI = window.netease?.theresaAPI;
        const xcAPI = window.netease?.xcAPI;

        const realAPI = this.getRealAPI(api, xcAPI, theresaAPI);
        const url = `${realAPI}playlist/detail`;
        const params = new URLSearchParams({
            id: id.toString(),
        });

        const response = await this.sendGet(url, params, undefined);

        if (response && response.ok)
        {
            const data: SongList = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    public async getNeteaseMVDetailFromBinaryify(id: number, api: 'xc' | 'theresa')
    {

        const theresaAPI = window.netease?.theresaAPI;
        const xcAPI = window.netease?.xcAPI;

        const realAPI = this.getRealAPI(api, xcAPI, theresaAPI);
        const url = `${realAPI}mv/detail`;
        const params = new URLSearchParams({
            mvid: id.toString(),
        });

        const response = await this.sendGet(url, params, undefined);

        if (response && response.ok)
        {
            const data: MVDetail = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 访问小草的网易云音乐接口获取歌曲链接等信息
     * @param id 
     * @param level standard 标准品质-128k higher 较高品质-192k exhigh 极高品质-320k lossless 无损品质 hires hires品质 jyeffect 高清环绕声 sky 沉浸环绕声 jymaster 超清母带
     * @returns 
     */
    public async getSongResource(
        id: number,
        level: 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires' | 'jyeffect' | 'sky' | 'jymaster' = 'exhigh',
        type: number = 302
    ): Promise<xcSongResource | null>
    {
        const url = new URL(`https://xc.null.red:8043/meting-api/`);
        const params = new URLSearchParams({
            id: id.toString(),
        });
        level && params.append('level', level);
        type && params.append('type', type.toString());
        const headers = new Headers();
        headers.append('Referer', 'https://music.163.com/');
        // 创建 AbortController 实例
        const controller = new AbortController();
        const signal = controller.signal;
        // const timeout = 10000;
        // setTimeout(() => controller.abort(), timeout);

        const response = await this.sendGet(url.toString(), params, headers, false, signal);

        if (response && response.ok)
        {
            const data: xcSongResource = await response.json();
            console.log(data);
            return data;
        } else
        {
            return null;
        }
    }

    public async getSongResourceFromIARC(url: string)
    {
        const response = await this.sendHead(url, new URLSearchParams(), new Headers(), false, false)
        if (response && response.ok)
        {
            const redirect = response.headers.get('x-final-url')
            return redirect;
        } else
        {
            return null;
        }
    }

    public async getLyric(id: number)
    {
        const url = `${this.cors}https://music.163.com/api/song/lyric`;
        const params = new URLSearchParams({
            id: id.toString(),
            tv: '-1',
            lv: '-1',
            kv: '-1',
            rv: '-1'
        });

        const headers = new Headers();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const lyric: Lyric = await response.json();
            return lyric;
        } else
        {
            return null;
        }
    }

    public async getMVPlayURL(id: number)
    {
        const url = `${this.beijingcors}https://music.163.com/weapi/song/enhance/play/mv/url`;
        const params = {
            id: id,
            r: 1080,
            csrf_token: ''
        }

        const headers = new Headers();
        const we = d(params);
        const enc = {
            params: we.encText,
            encSecKey: we.encSecKey
        }

        const encparams = new URLSearchParams(enc);

        headers.append('content-type', 'application/x-www-form-urlencoded')

        const response = await this.sendPost(url, encparams, headers);

        if (response && response.ok)
        {
            const data: MVPlayURLData = await response.json();
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