import { SendFetch } from "../Api";
// 全局声明，告诉 TypeScript window 具有 iirosemedia 属性
declare global {
    interface Window {
        device:number | 1 | 7; // 1: 电脑的游览器, 7: Windows app
        iirosemedia?: {
            cors?: string;
            // 其他属性...
        };
        bilibili:{
            rcmdVideo:{
                fresh_idx_1h: number
                fresh_idx: number
                brush:number
            }
        }
    }
}

export class ENV
{
    public setEnv()
    {
        window.iirosemedia = {};
        this.setBilibiliRcmdVideo()
        this.setCors();
    }

    private setCors()
    {
        const ua = navigator.userAgent;
        const device = window.device;
        if (device === 7)
        {
            if(window.iirosemedia)
            window.iirosemedia.cors = ``;
            return;
        }
        if (ua.includes('IIROSE'))
        {
            if(window.iirosemedia)
            window.iirosemedia.cors = ``;
            return;
        } else {
            this.selectCorsBySpeed();
        }

    }

    private async selectCorsBySpeed() {
        if(!window.iirosemedia) return
        const corss = ['https://cors-anywhere-cors-dzgtzfcdbk.ap-southeast-3.fcapp.run/', 'https://cors-anywhere-iirose-uest-web-gjtxhfvear.cn-beijing.fcapp.run/'];
        const sendFetch = new SendFetch();
    
        // 存储每个请求的时间
        const requestTimes = [];
    
        // 循环发送请求
        for (const cors of corss) {
            try {
                const startTime = performance.now(); // 获取当前时间戳
                await sendFetch.sendGet(cors, new URLSearchParams(), new Headers());
                const endTime = performance.now(); // 获取请求结束时间戳
                const elapsedTime = endTime - startTime; // 计算请求时间
                requestTimes.push({ cors, time: elapsedTime }); // 存储请求时间
            } catch (error) {
                console.error('请求出错:', error);
            }
        }
        // 根据时间排序，找到最快的 CORS 代理
        requestTimes.sort((a, b) => a.time - b.time);
        // 最快的 CORS 代理
        const fastestCors = requestTimes[0].cors;
        window.iirosemedia.cors = fastestCors;
    }
    
    private setBilibiliRcmdVideo(){
        window.bilibili = {
            rcmdVideo:{
                fresh_idx_1h: 1,
                fresh_idx: 1,
                brush: 0
            }
        }
    }
}