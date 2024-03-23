import { NeteaseMusicAPI } from "./Api/NeteaseAPI/NeteaseMusic";
import { NeteaseSearchAPI } from "./Api/NeteaseAPI/NeteaseSearch/index";
import { HotKey } from "./HotKey/index";
import { IIROSEMEDIA } from "./IIROSE-MEDIA/index";
class init{
    async init(){
        
        // const neteaseSearch = new NeteaseSearchAPI()
        // const x = await neteaseSearch.getNeteaseMusicSearchData('1',1)

        // // const neteaseMusic = new NeteaseMusicAPI()
        // // const x = await neteaseMusic.getLyric(409872504)
        // console.log(x)

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