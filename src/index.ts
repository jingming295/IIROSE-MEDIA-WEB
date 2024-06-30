import { HotKey } from "./HotKey/index";
import { IIROSEMEDIA } from "./IIROSE-MEDIA/index";
import { ENV } from "./Env";
import { BiliBiliAccount } from "./Account/SetBiliBili";
import './SCSS/IIROSE_MEDIA.scss';
import './SCSS/MaterialDesignIcon.scss';
import { BilibiliSetting, NeteaseSetting } from "./Platform/SettingInterface";
import { LSMediaCollectData } from "./Platform/LocalStorageCollectDataInterface";
class init
{
    constructor()
    {
        const env = new ENV();
        env.setEnv();
        const bilibiliAcc = new BiliBiliAccount();
        bilibiliAcc.setBiliBiliAccountDefaultCookie();
        this.setBiliBiliSetting()
        this.setNeteaseSetting()
        this.setNeteaseSongCollect()
    }
    async init()
    {
        if (typeof document === 'undefined')
        {
            console.log('[IIROSE-MEDIA] - 加载失败，当前环境不支持document对象')
            return
        }
        const iirosemedia = new IIROSEMEDIA()
        const hotKey = new HotKey()
        iirosemedia.createIIROSEMEDIA()
        console.log('[IIROSE-MEDIA] - 加载成功')
    }

    private setBiliBiliSetting()
    {
        const bilibiliSetting = localStorage.getItem('bilibiliSetting')
        if (!bilibiliSetting)
        {
            const parseBilibiliSetting: BilibiliSetting = {
                qn: 64,
                streamqn: 10000,
                streamSeconds: 43200,
                getVideoStreamFormat: 2
            }
            localStorage.setItem('bilibiliSetting', JSON.stringify(parseBilibiliSetting))
        } else
        {
            const parseBilibiliSetting: BilibiliSetting = JSON.parse(bilibiliSetting)
            if (!parseBilibiliSetting.qn)
            {
                parseBilibiliSetting.qn = 64
            }
            if (!parseBilibiliSetting.streamqn)
            {
                parseBilibiliSetting.streamqn = 10000
            }
            if (!parseBilibiliSetting.streamSeconds)
            {
                parseBilibiliSetting.streamSeconds = 43200
            }
            if (!parseBilibiliSetting.getVideoStreamFormat)
            {
                parseBilibiliSetting.getVideoStreamFormat = 2
            }
            localStorage.setItem('bilibiliSetting', JSON.stringify(parseBilibiliSetting))
        }
    }

    private setNeteaseSetting()
    {
        const neteaseSetting = localStorage.getItem('neteaseSetting')
        if (!neteaseSetting)
        {
            const parseNeteaseSetting: NeteaseSetting = {
                quality: 'lossless'
            }
            localStorage.setItem('neteaseSetting', JSON.stringify(parseNeteaseSetting))
        } else
        {
            const parseNeteaseSetting: NeteaseSetting = JSON.parse(neteaseSetting)
            if (!parseNeteaseSetting.quality)
            {
                parseNeteaseSetting.quality = 'lossless'
            }
            localStorage.setItem('neteaseSetting', JSON.stringify(parseNeteaseSetting))
        }

    }

    private setNeteaseSongCollect()
    {
        const neteaseSongListCollect = localStorage.getItem('neteaseSongListCollect')
        if (!neteaseSongListCollect)
        {
            const neteaseSongListCollect: LSMediaCollectData[] = []
            localStorage.setItem('neteaseSongListCollect', JSON.stringify(neteaseSongListCollect))
        }
        const neteaseSongCollect = localStorage.getItem('neteaseSongCollect')
        if (!neteaseSongCollect)
        {
            const neteaseSongCollect: LSMediaCollectData[] = []
            localStorage.setItem('neteaseSongCollect', JSON.stringify(neteaseSongCollect))
        }
    }
}


const app = new init()
app.init()

