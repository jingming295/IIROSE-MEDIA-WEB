import { SendFetch } from "../../index";
import { SongDetail, SongDetailFromXC, SongDetailFromXCSong } from "./SongDetailInterface";
import { Lyric, SongList, xcSongResource } from "./SongList";

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

        const headers = new Headers();
        headers.append('Referer', 'https://music.163.com/');
        const response = await this.sendGet(url, params, headers);
        if (response && response.ok)
        {
            const data: SongList = await response.json();
            return data;
        } else
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
    public async getNeteaseSongDetail(ids: number[], corsnum: number = 0): Promise<SongDetail | null>
    {
        const cors = [this.beijingcors, this.malaysiacors];

        try
        {
            const url = new URL(`${cors[corsnum]}http://music.163.com/api/song/detail`);
            const params = new URLSearchParams({
                ids: `${ids.toString()}`
            });
            url.search = params.toString();

            const headers = this.returnNeteaseHeaders();

            // 创建 AbortController 实例
            const controller = new AbortController();
            const signal = controller.signal;

            // 设置超时时间为 2 秒
            const timeout = 2000;
            setTimeout(() => controller.abort(), timeout);

            const response = await this.sendGet(url.toString(), params, headers, true, signal);

            if (response && response.ok)
            {
                const data: SongDetail = await response.json();
                if (!data.songs) throw new Error('获取歌曲详情失败');
                return data;
            } else
            {
                // 如果请求失败并且还有其他的 CORS 地址可用，则尝试使用下一个 CORS 地址发送请求
                if (corsnum < cors.length - 1)
                {
                    return this.getNeteaseSongDetail(ids, corsnum + 1);
                }
                return null;
            }
        } catch (error)
        {
            if (corsnum < cors.length - 1)
            {
                return this.getNeteaseSongDetail(ids, corsnum + 1);
            }
            console.error(`发生错误, 目前是第 ${corsnum} 个 CORS 地址`);
            return null;
        }
    }

    /**
     * 访问小草的网易云音乐接口获取歌曲详情
     * @param id 
     * @returns 
     */
    public async getNeteaseSongDetailFromXC(id: number[])
    {
        const url = new URL(`https://xc.null.red:8043/api/netease/song/detail`);
        const params = new URLSearchParams({
            ids: id.toString(),
        });

        const headers = new Headers();
        headers.append('Referer', 'https://music.163.com/');

        // 创建一个 AbortController 实例
        const controller = new AbortController();
        const signal = controller.signal;

        // 设置超时时间为 4 秒
        const timeout = 4000;
        setTimeout(() => controller.abort(), timeout);

        try
        {
            const response = await this.sendGet(url.toString(), params, headers, false, signal);

            if (response && response.ok)
            {
                const data: SongDetailFromXC = await response.json();
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
     * 访问小草的网易云音乐接口获取歌单详情
     * @param id 
     * @returns 
     */
    public async getNeteaseSongListDetailFromXC(id: number)
    {
        const url = `https://xc.null.red:8043/api/netease/playlist/detail`;
        const params = new URLSearchParams({
            id: id.toString(),
        });

        const headers = this.returnNeteaseHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: SongList = await response.json();
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

    public async getSonggResourceFromIARC(url: string)
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

    public async testGetSongResource()
    {
        const url = `https://xc.null.red:8043/meting-api/`;
        const params = new URLSearchParams({
            id: `1988233212`,
            level: 'exhigh',
            type: '302'
        });

        const headers = new Headers();
        headers.append('Referer', 'https://music.163.com/');

        // 创建 AbortController 和 AbortSignal 对象
        const controller = new AbortController();
        const signal = controller.signal;

        // 设置超时时间（毫秒）
        const timeout = 5000; // 2秒超时

        // 设置超时任务
        const timeoutId = setTimeout(() =>
        {
            controller.abort(); // 超时时中止请求
        }, timeout);

        try
        {
            // 发送 GET 请求
            const response = await this.sendGet(url, params, headers, false, signal);

            clearTimeout(timeoutId); // 清除超时任务

            if (response && response.ok)
            {
                const data = await response.json();
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

    public imoeGetSongResource = async (id: number) =>
    {
        const createSign = async (id: number) =>
        {
            const token = '2126696677';
            const time = Date.now();
            const text = `${id}.metadata.${time}|${token}`;

            const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
            const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

            return {
                sign: hex,
                time: time
            };
        };
        try
        {
            const { sign, time } = await createSign(id);

            const resp = await fetch(`https://ifs.imoe.xyz/api/v1/163?id=${id}&type=metadata&time=${time}&sign=${sign}`);
            const metadata: xcSongResource = await resp.json();
            metadata.url += `#.mp3`;
            return metadata;
        } catch (error)
        {
            console.error(error);
            return null;
        }
    };

}