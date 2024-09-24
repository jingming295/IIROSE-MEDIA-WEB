import { MediaData } from "./MediaCardInterface";
import { encode } from 'html-entities';

export class Media
{
    public mediaCard(media: MediaData)
    {
        function parseBitrate(bitrate: number)
        {
            switch (bitrate)
            {
                case 10000:
                    return '1e4';
                case 20000:
                    return '2e4';
                case 30000:
                    return '3e4';
                default:
                    return bitrate;
            }
        }

        function durationToText(duration: number)
        {
            const secondsInMinute = 60;
            const secondsInHour = secondsInMinute * 60;
            const secondsInDay = secondsInHour * 24;
            const secondsInYear = secondsInDay * 365;
            const secondsInMillennium = secondsInYear * 1000;
            const secondsInTenThousandYears = secondsInMillennium * 10;
            const secondsInHundredThousandYears = secondsInTenThousandYears * 10;
            const secondsInMillionYears = secondsInHundredThousandYears * 10;
            const secondsInTenMillionYears = secondsInMillionYears * 10;
            const secondsInHundredMillionYears = secondsInTenMillionYears * 10;
            const secondsInBillionYears = secondsInHundredMillionYears * 10;

            const billionYears = Math.floor(duration / secondsInBillionYears);
            duration %= secondsInBillionYears;

            const hundredMillionYears = Math.floor(duration / secondsInHundredMillionYears);
            duration %= secondsInHundredMillionYears;

            const tenMillionYears = Math.floor(duration / secondsInTenMillionYears);
            duration %= secondsInTenMillionYears;

            const millionYears = Math.floor(duration / secondsInMillionYears);
            duration %= secondsInMillionYears;

            const hundredThousandYears = Math.floor(duration / secondsInHundredThousandYears);
            duration %= secondsInHundredThousandYears;

            const tenThousandYears = Math.floor(duration / secondsInTenThousandYears);
            duration %= secondsInTenThousandYears;

            const millennia = Math.floor(duration / secondsInMillennium);
            duration %= secondsInMillennium;

            const years = Math.floor(duration / secondsInYear);
            duration %= secondsInYear;

            const days = Math.floor(duration / secondsInDay);
            duration %= secondsInDay;

            const hours = Math.floor(duration / secondsInHour);
            duration %= secondsInHour;

            const minutes = Math.floor(duration / secondsInMinute);
            const seconds = duration % secondsInMinute;

            let text = '';
            if (billionYears > 0)
            {
                text += `${billionYears}亿年 `;
            }
            if (hundredMillionYears > 0)
            {
                text += `${hundredMillionYears}亿年 `;
            }
            if (tenMillionYears > 0)
            {
                text += `${tenMillionYears}千万年 `;
            }
            if (millionYears > 0)
            {
                text += `${millionYears}百万年 `;
            }
            if (hundredThousandYears > 0)
            {
                text += `${hundredThousandYears}十万年 `;
            }
            if (tenThousandYears > 0)
            {
                text += `${tenThousandYears}万年 `;
            }
            if (millennia > 0)
            {
                text += `${millennia}千年 `;
            }
            if (years > 0)
            {
                text += `${years}年 `;
            }
            if (days > 0)
            {
                text += `${days}天 `;
            }
            if (hours > 0)
            {
                text += `${hours}小时 `;
            }
            if (minutes > 0)
            {
                text += `${minutes}分钟 `;
            }
            if (seconds > 0)
            {
                text += `${seconds}秒`;
            }

            return text.trim();
        }
        const timestamp = new Date().getTime();
        const typeMap: {
            [key: string]: string;
        } = {
            music: "=0",
            video: "=1",
            netease: "@0",
            xiamimusic: "@1",
            qqmusic: "@2",
            qianqianmusic: "@3",
            kugoumusic: "@4",
            ximalayafm: "@5",
            lizhifm: "@6",
            echohuisheng: "@7",
            fivesing: "@8",
            iqiyi: "*0",
            tencentvideo: "*1",
            youtube: "*2",
            bilibili: "*3",
            mangotv: "*4",
            tiktok: "*5",
            kuaishou: "*6",
            netEaseMV: "*7",
            bilibililive: "*8"
        }

        let t: string;

        if (media.origin && media.origin !== 'null' && media.origin !== 'undefined')
        {
            t = media.origin;
        } else
        {
            t = media.type;
        }
        const medianame = encode(media.name);
        const mediasinger = encode(media.singer);
        const mediacolor = encode(media.color);
        if (media.type === 'video')
        {
            const data = {
                m: `m__4${typeMap[t]}>${medianame}>${mediasinger}>${media.cover}>${mediacolor}>>${parseBitrate(media.bitRate)}>>${durationToText(media.duration)}`,
                mc: media.color,
                i: timestamp
            }
            console.log(JSON.stringify(data))
            return JSON.stringify(data);
        } else
        {
            const data = {
                m: `m__4${typeMap[t]}>${medianame}>${mediasinger}>${media.cover}>${mediacolor}>${parseBitrate(media.bitRate)}`,
                mc: media.color,
                i: timestamp
            }
            console.log(JSON.stringify(data))
            return JSON.stringify(data);
        }
    }

    public mediaEvent(media: MediaData)
    {
        const typeMap: {
            [key: string]: string;
        } = {
            music: "=0",
            video: "=1",
            netease: "@0",
            xiamimusic: "@1",
            qqmusic: "@2",
            qianqianmusic: "@3",
            kugoumusic: "@4",
            ximalayafm: "@5",
            lizhifm: "@6",
            echohuisheng: "@7",
            fivesing: "@8",
            iqiyi: "!0",
            tencentvideo: "!1",
            youtube: "!2",
            bilibili: "!3",
            mangotv: "!4",
            tiktok: "!5",
            kuaishou: "!6",
            netEaseMV: "!7",
            bilibililive: "!8"
        }

        let t: string;
        if (media.origin && media.origin !== 'null' && media.origin !== 'undefined')
        {
            t = media.origin;
        } else
        {
            t = media.type;
        }
        try
        {
            const data = JSON.stringify({
                s: media.url.substring(4),
                d: media.duration,
                c: media.cover.substring(4),
                n: media.name,
                r: media.singer,
                b: `${typeMap[t]}`,
                o: media.link.substring(4),
                l: media.lyrics
            });
            console.log(`&1${data}`)
            return `&1${data}`;
        } catch (error)
        {
            console.log(error)
            return ``
        }


        // if(media.type === 'video'){
        //     return `&1${data}`;
        // } else {
        //     return `&0${data}`;
        // }


    }
}