import { SendFetch } from "../../index";
import { SongDetail, SongDetailFromXC, SongDetailFromXCSong } from "./SongDetailInterface";
import { Lyric, SongList, xcSongResource } from "./SongList";

export class NeteaseMusicAPI extends SendFetch{

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
            const data:SongList = await response.json();
            return data;
        } else
        {
            return null;
        }

    }

    public async getNeteaseSongDetail(id: number)
    {
        const url = new URL(`${this.cors}http://music.163.com/api/song/detail`);
        const params = new URLSearchParams( {
            id: id.toString(),
            ids: `[${id}]`
        });
        url.search = new URLSearchParams(params).toString();

        const headers = this.returnNeteaseHeaders();

        const response = await this.sendGet(url.toString(), params, headers);

        if(response.ok)
        {
            const data:SongDetail = await response.json();
            return data;
        } else {
            return null;
        }

    }

    public async getNeteaseSongDetailFromXC(id: number){
        const url = new URL(`https://xc.null.red:8043/api/netease/song/detail`);
        const params = new URLSearchParams({
            ids: id.toString(),
        });

        const headers = new Headers();
        headers.append('Referer', 'https://music.163.com/');

        const response = await this.sendGet(url.toString(), params, headers);

        if(response.ok)
        {
            const data:SongDetailFromXC = await response.json();
            // console.log(data?.songs?.[0].name)
            return data;
        } else {
            return null;
        }
    }

    public async getSongResource(id: number)
    {
        const url = new URL(`https://xc.null.red:8043/meting-api/`);
        const params = new URLSearchParams({
            id: id.toString(),
        });

        const headers = new Headers();
        headers.append('Referer', 'https://music.163.com/');

        const response = await this.sendGet(url.toString(), params, headers);

        if(response.ok)
        {
            const data:xcSongResource = await response.json();
            return data;
        } else {
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
            const lyric:Lyric = await response.json();
            return lyric;
        } else {
            return null
        }
    }

    
}