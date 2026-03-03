import { SendFetch } from "../..";

export class CMSAPI extends SendFetch
{
    /**
     * 综合搜索（对接苹果CMS采集接口）
     * @returns
     */
    public static async getSearchRequestAll(keyword: string, page: number, baseUrl: string): Promise<MaotaiResource | null>
    {
        const apiUrl = `${baseUrl}/api.php/provide/vod/at/josn/`;

        const params = new URLSearchParams({
            ac: 'detail',
            wd: keyword,
            pg: page.toString(),
            limit: '30'
        });

        try
        {
            const response = await this.sendGet(apiUrl, params);
            if (!response || !response.ok) return null;

            const data = (await response.json()) as MacCMSApiResponse;

            // 如果没有数据，返回一个空的 resource 结构
            if (!data.list || data.list.length === 0)
            {
                return {
                    resource: [],
                    pagecount: 0
                };
            }

            // --- 核心逻辑修改：返回单个对象而非数组 ---
            return {
                resource: data.list.map((item: MacCMSVodItem): MaotaiResourceItem => ({
                    name: item.vod_name,
                    subtitle: item.vod_remarks,
                    url: `${baseUrl}/voddetail/${item.vod_id}.html`,
                    type: item.type_name,
                    updateTime: item.vod_time,
                    poster: item.vod_pic,
                    playList: this.parsePlayUrl(item.vod_play_url)
                })),
                pagecount: data.pagecount
            };
        } catch (error: unknown)
        {
            console.error('[MaotaiAPI Error]:', error instanceof Error ? error.message : String(error));
            return null;
        }
    }

    private static parsePlayUrl(playUrlStr: string): PlayItem[]
    {
        const results: PlayItem[] = [];
        if (!playUrlStr) return results;
        const groups = playUrlStr.split('$$$');
        const m3u8Group = groups.find(g => g.includes('.m3u8')) || groups[0];
        const episodes = m3u8Group.split('#').filter(ep => ep.includes('$'));
        for (const ep of episodes)
        {
            const [name, url] = ep.split('$');
            if (name && url)
            {
                results.push({
                    episode: name.trim(),
                    url: url.trim()
                });
            }
        }
        return results;
    }
}