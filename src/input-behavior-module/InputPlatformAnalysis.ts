import { BilibiliPlatform } from "../platforms/BilibiliPlatform";
import { PlatformData } from "../platforms/interfaces";
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

        if (domain === 'www.bilibili.com')
        {
            this.BiliBiliAnalysis(path);
            return
        } else if (domain === 'music.163.com')
        {
            this.NeteaseMusicAnalysis(hash);
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

    private static async NeteaseMusicAnalysis(hash: string)
    {
        const queryString = hash.split('?')[1];  // 获取 "id=536623501" 部分
        if (!queryString) return;
        const hashParams = new URLSearchParams(queryString);
        const id = hashParams.get('id');
        if (!id) return;

        if (hash.includes('song'))
        {
            const neteasePlatform = new NetEasePlatform()
            const ids = [parseInt(id)];
            const platformData = await neteasePlatform.getNeteasePlatformData(ids, 'song');
            if (!platformData) return;
            const data = platformData[0];
            neteasePlatform.MOD(data);
        } else if (hash.includes('playlist'))
        {
            const neteasePlatform = new NetEasePlatform()
            const ids = [parseInt(id)];
            const platformData = await neteasePlatform.getNeteasePlatformData(ids, 'playlist');
            if (!platformData) return;
            const data = platformData[0];
            neteasePlatform.MLOD(data);
        } else if (hash.includes('album'))
        {
            const neteasePlatform = new NetEasePlatform()
            const ids = [parseInt(id)];
            const platformData = await neteasePlatform.getNeteasePlatformData(ids, 'album');
            if (!platformData) return;
            const data = platformData[0];
            neteasePlatform.AOD(data);
        } else if (hash.includes('mv'))
        {
            const neteasePlatform = new NetEasePlatform()
            const ids = [parseInt(id)];
            const platformData = await neteasePlatform.getNeteasePlatformData(ids, 'mv');
            if (!platformData) return;
            const data = platformData[0];
            neteasePlatform.MVOD(data);
        }
    }

}