import { SendFetch } from "../../index";
import { SongDetail, SongDetailFromXC, SongDetailFromXCSong } from "./SongDetailInterface";
import { Lyric, SongList, xcSongResource } from "./SongList";

export class NeteaseMusicAPI extends SendFetch
{

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
        if (response.ok)
        {
            const data: SongList = await response.json();
            return data;
        } else
        {
            return null;
        }

    }

    public async getNeteaseSongDetail(id: number)
    {
        const url = new URL(`${this.cors}http://music.163.com/api/song/detail`);
        const params = new URLSearchParams({
            id: id.toString(),
            ids: `[${id}]`
        });
        url.search = new URLSearchParams(params).toString();

        const headers = this.returnNeteaseHeaders();

        const response = await this.sendGet(url.toString(), params, headers);

        if (response.ok)
        {
            const data: SongDetail = await response.json();
            return data;
        } else
        {
            return null;
        }

    }

    public async getNeteaseSongDetailFromXC(id: number)
    {
        const url = new URL(`https://xc.null.red:8043/api/netease/song/detail`);
        const params = new URLSearchParams({
            ids: id.toString(),
        });

        const headers = new Headers();
        headers.append('Referer', 'https://music.163.com/');

        const response = await this.sendGet(url.toString(), params, headers);

        if (response.ok)
        {
            const data: SongDetailFromXC = await response.json();
            // console.log(data?.songs?.[0].name)
            return data;
        } else
        {
            return null;
        }
    }

    public async getNeteaseSongListDetailFromXC(id: number)
    {
        const url = `https://xc.null.red:8043/api/netease/playlist/detail`;
        const params = new URLSearchParams({
            id: id.toString(),
        });

        const headers = this.returnNeteaseHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response.ok)
        {
            const data: SongList = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 
     * @param id 
     * @param level standard 标准品质-128k higher 较高品质-192k exhigh 极高品质-320k lossless 无损品质 hires hires品质 jyeffect 高清环绕声 sky 沉浸环绕声 jymaster 超清母带
     * @returns 
     */
    public async getSongResource(
        id: number, 
        level: 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires' | 'jyeffect' | 'sky' | 'jymaster' = 'exhigh',
        type:number=302
    )
    {
        // return await this.imoeGetSongResource(id)
        const url = new URL(`https://xc.null.red:8043/meting-api/`);
        const params = new URLSearchParams({
            id: id.toString(),
        });
        level && params.append('level', level);
        type && params.append('type', type.toString());
        const headers = new Headers();
        headers.append('Referer', 'https://music.163.com/');

        const response = await this.sendGet(url.toString(), params, headers);

        if (response.ok)
        {
            const data: xcSongResource = await response.json();
            console.log(data)
            return data;
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

        if (response.ok)
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
            metadata.time += 6000;
            return metadata;
        } catch (error)
        {
            console.error(error);
            return null;
        }
    };


}