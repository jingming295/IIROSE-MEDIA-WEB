import { BiliBiliLoginApi } from "../Api/BilibiliAPI/LoginAPI";
import { BilibiliACC } from "./BilibiliAccountInterface";

export class BiliBiliAccount{
    public setBiliBiliAccountDefaultCookie(){
        this.setBuvid();
    }

    public async setBuvid(){
        const bl = new BiliBiliLoginApi()
        const bilibiliaccount = localStorage.getItem('bilibiliaccount')
        if(bilibiliaccount){
            const account:BilibiliACC = JSON.parse(bilibiliaccount)
            if(account.buvid3 && account.buvid4) return;
            const buvid = await bl.getBuvid()
            if(!buvid || !buvid.data)return;
            account.buvid3 = buvid.data.b_3
            account.buvid4 = buvid.data.b_4
            localStorage.setItem('bilibiliaccount', JSON.stringify(account))
        } else {
            const buvid = await bl.getBuvid()
            if(!buvid || !buvid.data)return;
            const account:BilibiliACC = {
                buvid3: buvid.data.b_3,
                buvid4: buvid.data.b_4
            }
            localStorage.setItem('bilibiliaccount', JSON.stringify(account))
        }
    }

    
}