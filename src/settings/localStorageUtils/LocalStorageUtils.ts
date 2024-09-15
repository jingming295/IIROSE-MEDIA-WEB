import { BilibiliVideoSettings } from "../bilibiliSettings/BiliBiliSettings";
import { NeteaseSetting } from "../neteaseSettings/NetEaseSettings";

export class LocalStorageUtils
{

    public static Init()
    {
        this.setBilibili()
    }

    private static setBilibili()
    {
        const lsBiliBiliSetting = localStorage.getItem('bilibiliSetting');
        if (!lsBiliBiliSetting)
        {
            const bilibiliSetting: BilibiliVideoSettings = {
                qn: 112,
                streamqn: 10000,
                streamSeconds: 43200,
                videoStreamFormat: 1
            }
            localStorage.setItem('bilibiliSetting', JSON.stringify(bilibiliSetting));
        }
    }

    private static setNetease()
    {
        const lsNeteaseSetting = localStorage.getItem('neteaseSetting');

        if (!lsNeteaseSetting)
        {
            const neteaseSetting: NeteaseSetting = {
                quality: 'standard'
            };
            localStorage.setItem('neteaseSetting', JSON.stringify(neteaseSetting));
        }

    }

}