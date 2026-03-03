import { BilibiliPlatform } from "../platforms/BilibiliPlatform";
import { NetEasePlatform } from "../platforms/NetEasePlatform";

export class InputPlatformAnalysis
{

    public static Analysis(
        e: string,
        originalMethod: Function,
    )
    {
        const url = new URL(e.slice(1));
        const domain = url.hostname;
        const path = url.pathname;
        const hash = url.hash;
        const search = url.search;
        console.log(url)
        if (domain === 'www.bilibili.com')
        {
            this.BiliBiliAnalysis(path);
            return
        } else if (domain === 'music.163.com')
        {
            if (hash) this.NeteaseMusicHashAnalysis(hash);
            else if (search) this.NeteaseMusicSearchAnalysis(search, path);
            return
        } else
        {
            return originalMethod(e, undefined);
        }

    }

    private static async BiliBiliAnalysis(path: string)
    {
        if (path.includes('video'))
        {
            const bilibiliPlatform = new BilibiliPlatform();
            const videoId = path.split('/')[2]

            const bvideoDetail = await bilibiliPlatform.getBilibiliVideoDetail(videoId);
            if (!bvideoDetail) return;
            const platformData: PlatformData = {
                title: bvideoDetail.title,
                coverImg: bvideoDetail.pic,
                author: bvideoDetail.owner.name,
                websiteUrl: `https://www.bilibili.com/video/${bvideoDetail.bvid}`,
                duration: bvideoDetail.duration,
                bilibili: {
                    bvid: bvideoDetail.bvid,
                    cid: bvideoDetail.cid,
                }
            }

            bilibiliPlatform.VOD(platformData);
        }
    }

    private static async NeteaseMusicHashAnalysis(hash: string)
    {
        const queryString = hash.split('?')[1];  // 获取 "id=536623501" 部分
        if (!queryString) return;
        const hashParams = new URLSearchParams(queryString);
        const id = hashParams.get('id');
        if (!id) return;

        if (hash.includes('song'))
        {
            const ids = [parseInt(id)];
            const platformData = await NetEasePlatform.getNeteasePlatformData(ids, 'song');
            if (!platformData) return;
            const data = platformData[0];
            NetEasePlatform.MOD(data);
        } else if (hash.includes('playlist'))
        {
            const ids = [parseInt(id)];
            const platformData = await NetEasePlatform.getNeteasePlatformData(ids, 'playlist');
            if (!platformData) return;
            const data = platformData[0];
            NetEasePlatform.MLOD(data);
        } else if (hash.includes('album'))
        {
            const ids = [parseInt(id)];
            const platformData = await NetEasePlatform.getNeteasePlatformData(ids, 'album');
            if (!platformData) return;
            const data = platformData[0];
            NetEasePlatform.AOD(data);
        } else if (hash.includes('mv'))
        {
            const ids = [parseInt(id)];
            const platformData = await NetEasePlatform.getNeteasePlatformData(ids, 'mv');
            if (!platformData) return;
            const data = platformData[0];
            NetEasePlatform.MVOD(data);
        }
    }

    private static async NeteaseMusicSearchAnalysis(search: string, pathname: string)
    {
        const queryString = search.split('?')[1];  // 获取 "id=536623501" 部分
        if (!queryString) return;
        const searchParams = new URLSearchParams(queryString);
        const id = searchParams.get('id');
        if (!id) return;
        if (pathname.includes('song'))
        {
            const ids = [parseInt(id)];
            const platformData = await NetEasePlatform.getNeteasePlatformData(ids, 'song');
            if (!platformData) return;
            const data = platformData[0];
            NetEasePlatform.MOD(data);
        } else if (pathname.includes('playlist'))
        {
            const ids = [parseInt(id)];
            const platformData = await NetEasePlatform.getNeteasePlatformData(ids, 'playlist');
            if (!platformData) return;
            const data = platformData[0];
            NetEasePlatform.MLOD(data);
        } else if (pathname.includes('album'))
        {
            const ids = [parseInt(id)];
            const platformData = await NetEasePlatform.getNeteasePlatformData(ids, 'album');
            if (!platformData) return;
            const data = platformData[0];
            NetEasePlatform.AOD(data);
        } else if (pathname.includes('mv'))
        {
            const ids = [parseInt(id)];
            const platformData = await NetEasePlatform.getNeteasePlatformData(ids, 'mv');
            if (!platformData) return;
            const data = platformData[0];
            NetEasePlatform.MVOD(data);
        }
    }

}