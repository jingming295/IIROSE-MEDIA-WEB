import { SendFetch } from "../Api";
// 全局声明，告诉 TypeScript window 具有 iirosemedia 属性
declare global
{
    interface Window
    {
        device: number | 1 | 7; // 1: 电脑的游览器, 7: Windows app
        iirosemedia?: {
            cors?: string;
            // 其他属性...
        };
        netease?: {
            xcAPI?: boolean;
            iarc?: boolean;
        }
    }
}

export interface ipinfo
{
    city: string;
    country: string;
    ip: string;
    loc: string;
    org: string;
    postal: string;
    readme: string;
    region: string;
    timezone: string;
}

export class Environment
{
    public setEnv()
    {
        window.iirosemedia = {};
        window.netease = {};
        window.netease.xcAPI = false
        window.netease.iarc = false
        this.setCors();
        this.setNetease();
    }

    private async setCors()
    {
        // const ua = navigator.userAgent;
        // const device = window.device;
        // if (device === 7)
        // {
        //     if(window.iirosemedia)
        //     window.iirosemedia.cors = ``;
        //     return;
        // }
        // if (ua.includes('IIROSE'))
        // {
        //     if(window.iirosemedia)
        //     window.iirosemedia.cors = ``;
        //     return;
        // } else {
        //     this.selectCorsBySpeed();
        // }
        const sendFetch = new SendFetch();
        const res = sendFetch.sendGet(`https://ipinfo.io/json`, new URLSearchParams(), new Headers());

        res.then(async (res) =>
        {
            if (res)
            {
                const data: ipinfo = await res.json();
                if (!window.iirosemedia) return

                if (data.country === 'CN')
                {

                    window.iirosemedia.cors = `https://cors-anywhere-iirose-uest-web-gjtxhfvear.cn-beijing.fcapp.run/`;
                } else
                {
                    window.iirosemedia.cors = `https://cors-anywhere-cors-dzgtzfcdbk.ap-southeast-3.fcapp.run/`;
                }

            } else
            {
                this.selectCorsBySpeed();
            }
        })
    }

    private async selectCorsBySpeed()
    {
        if (!window.iirosemedia) return
        const corss = ['https://cors-anywhere-cors-dzgtzfcdbk.ap-southeast-3.fcapp.run/', 'https://cors-anywhere-iirose-uest-web-gjtxhfvear.cn-beijing.fcapp.run/'];
        const sendFetch = new SendFetch();

        // 存储每个请求的时间
        const requestTimes = [];

        // 循环发送请求
        for (const cors of corss)
        {
            try
            {
                const startTime = performance.now(); // 获取当前时间戳
                await sendFetch.sendGet(cors, new URLSearchParams(), new Headers());
                const endTime = performance.now(); // 获取请求结束时间戳
                const elapsedTime = endTime - startTime; // 计算请求时间
                requestTimes.push({ cors, time: elapsedTime }); // 存储请求时间
            } catch (error)
            {
                console.error('请求出错:', error);
            }
        }
        // 根据时间排序，找到最快的 CORS 代理
        requestTimes.sort((a, b) => a.time - b.time);
        // 最快的 CORS 代理
        const fastestCors = requestTimes[0].cors;
        window.iirosemedia.cors = fastestCors;
    }

    private async setNetease()
    {
        try
        {
            const sendFetch = new SendFetch
            const res = await sendFetch.tryGetWhithXhr("https://xc.null.red:8043/meting-api/")
            if (res)
            {
                if (window.netease)
                    window.netease.xcAPI = true;
            }
        } catch (error)
        {

        }
    }

}