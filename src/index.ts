import { HotKey } from "./HotKey/index";
import { IIROSEMEDIA } from "./IIROSE-MEDIA/index";
import { ENV } from "./Env";
import { BiliBiliAccount } from "./Account/SetBiliBili";
import './SCSS/IIROSE_MEDIA.scss';
class init{
    constructor(){
        const env = new ENV()
        env.setEnv()
        const bilibiliAcc = new BiliBiliAccount();
        bilibiliAcc.setBiliBiliAccountDefaultCookie();
    }
    async init(){
        
        // const bs = new BiliBiliSearchApi();
        // const searchResult = await bs.getSearchRequestByTypeVideo('a', 1, 10);
        // console.log(searchResult)
        
        
        if(typeof document === 'undefined') {
            console.log('[IIROSE-MEDIA] - 加载失败，当前环境不支持document对象')
            return
        }
        const iirosemedia = new IIROSEMEDIA()
        const hotKey = new HotKey()
        iirosemedia.createIIROSEMEDIA()
        console.log('[IIROSE-MEDIA] - 加载成功')
    }
}
  

const app = new init()
app.init()

