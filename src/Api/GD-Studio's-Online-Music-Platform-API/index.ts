import { SendFetch } from "..";


type Source = `netease` | `kuwo` | `joox` | `bilibili`

export class GDStudioOnlineMusicPlatformAPI extends SendFetch
{


    public static async search(source: Source, keyword: string, page: number, count: number = 99)
    {

        const url = 'https://music-api.gdstudio.xyz/api.php'

        const params = new URLSearchParams({
            types: 'search',
            source,
            name: keyword,
            page: page.toString(),
            count: count.toString()
        })

        const response = await this.sendGet(url, params);

        if (response && response.ok)
        {
            const data: GDStudioSearch[] = await response.json();
            return data;
        } else
        {
            return null;
        }


    }

    public static async getMusicUrl(source: Source, id: string, br: number = 320)
    {

        const url = `https://music-api.gdstudio.xyz/api.php`

        const params = new URLSearchParams({
            types: 'url',
            source,
            id,
            br: br.toString()
        })

        const response = await this.sendGet(url, params);

        if (response && response.ok)
        {
            const data: GDStudioMusicUrl = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    public static async getLyric(source: Source, id: string)
    {
        const url = `https://music-api.gdstudio.xyz/api.php`

        const params = new URLSearchParams({
            types: 'lyric',
            source,
            id
        })

        const response = await this.sendGet(url, params);

        if (response && response.ok)
        {
            const data: GDStudioLyric = await response.json();
            return data;
        }
    }

}