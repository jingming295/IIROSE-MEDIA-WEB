import { BilibiliACC } from "./BilibiliAccountInterface";

export class GetBiliBiliAccount{
    public getBiliBiliAccount(){
        const bilibiliaccount = localStorage.getItem('bilibiliaccount')
        if(bilibiliaccount){
            return JSON.parse(bilibiliaccount) as BilibiliACC
        } else {
            return null
        }
    }
}