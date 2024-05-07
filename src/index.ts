import { HotKey } from "./HotKey/index";
import { IIROSEMEDIA } from "./IIROSE-MEDIA/index";
import { ENV } from "./Env";
import { BiliBiliAccount } from "./Account/SetBiliBili";
import './SCSS/IIROSE_MEDIA.scss';
import './SCSS/MaterialDesignIcon.scss';
import { BilibiliSetting, NeteaseSetting } from "./Platform/SettingInterface";
class init{
    constructor(){
        const env = new ENV();
        env.setEnv();
        const bilibiliAcc = new BiliBiliAccount();
        bilibiliAcc.setBiliBiliAccountDefaultCookie();
    }
    async init(){
        this.setBiliBiliSetting()
        this.setNeteaseSetting()
        if(typeof document === 'undefined') {
            console.log('[IIROSE-MEDIA] - 加载失败，当前环境不支持document对象')
            return
        }
        const iirosemedia = new IIROSEMEDIA()
        const hotKey = new HotKey()
        iirosemedia.createIIROSEMEDIA()
        console.log('[IIROSE-MEDIA] - 加载成功')
    }

    setBiliBiliSetting(){
        const bilibiliSetting = localStorage.getItem('bilibiliSetting')
        if(!bilibiliSetting){
            const parseBilibiliSetting:BilibiliSetting = {
                qn: 64,
                streamqn: 10000,
                streamSeconds: 43200
            }
            localStorage.setItem('bilibiliSetting', JSON.stringify(parseBilibiliSetting))
        } else {
            const parseBilibiliSetting:BilibiliSetting = JSON.parse(bilibiliSetting)
            if(!parseBilibiliSetting.qn){
                parseBilibiliSetting.qn = 64
            }
            if(!parseBilibiliSetting.streamqn){
                parseBilibiliSetting.streamqn = 10000
            }
            if(!parseBilibiliSetting.streamSeconds){
                parseBilibiliSetting.streamSeconds = 43200
            }
            localStorage.setItem('bilibiliSetting', JSON.stringify(parseBilibiliSetting))
        }
    }

    setNeteaseSetting(){
        const neteaseSetting = localStorage.getItem('neteaseSetting')
        if(!neteaseSetting){
            const parseNeteaseSetting:NeteaseSetting = {
                quality: 'lossless'
            }
            localStorage.setItem('neteaseSetting', JSON.stringify(parseNeteaseSetting))
        } else {
            const parseNeteaseSetting:NeteaseSetting = JSON.parse(neteaseSetting)
            if(!parseNeteaseSetting.quality){
                parseNeteaseSetting.quality = 'lossless'
            }
            localStorage.setItem('neteaseSetting', JSON.stringify(parseNeteaseSetting))
        }
    
    }
}
  

const app = new init()
app.init()

