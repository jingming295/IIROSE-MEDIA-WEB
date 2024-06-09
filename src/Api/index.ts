import { BilibiliACC } from "../Account/BilibiliAccountInterface";
import { GetBiliBiliAccount } from "../Account/GetBiliBili";
import { ShowMessage } from "../IIROSE/ShowMessage";

export class SendFetch
{
    public cors = `https://cors-anywhere-iirose-uest-web-gjtxhfvear.cn-beijing.fcapp.run/`;
    public malaysiacors = `https://cors-anywhere-cors-dzgtzfcdbk.ap-southeast-3.fcapp.run/`;
    public beijingcors = `https://cors-anywhere-iirose-uest-web-gjtxhfvear.cn-beijing.fcapp.run/`;
    constructor()
    {
        if (window.iirosemedia && window.iirosemedia.cors !== undefined)
        {
            this.cors = window.iirosemedia.cors;
        }
    }
    public async sendGet(url: string, params: URLSearchParams, headers: Headers, warn: boolean = true, signal?: AbortSignal)
    {
        try
        {
            if (window.iirosemedia && window.iirosemedia.cors !== undefined)
            {
                if (headers.get('cookie-trans'))
                {
                    headers.append('cookie', headers.get('cookie-trans') as string);
                }
            }
            const fullUrl = `${url}?${params.toString()}`;
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: headers,
                signal: signal
            });

            if (!response.ok && warn)
            {
                const showmessage = new ShowMessage();
                showmessage.show(`GET请求失败，url: ${url} 状态码：${response.status}, 信息：${response.statusText}, Cookie: ${headers.get('cookie-trans')}, params: ${params.toString()}`);
            }

            return response;
        } catch (error)
        {
            if (warn)
            {
                const showmessage = new ShowMessage();
                showmessage.show(`GET请求失败，url: ${url} 信息：${error}`);
                console.log(`GET请求失败，url: ${url} 信息：${error}`);
            }
            return null;
        }
    }

    public async sendGetXHR(url: string, params: URLSearchParams, headers: Headers)
    {
        const fullUrl = `${url}?${params.toString()}`;

        return new Promise((resolve, reject) =>
        {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', fullUrl, true);
            xhr.setRequestHeader('Origin', ''); // 设置 Origin 为空
            xhr.onreadystatechange = function ()
            {
                if (xhr.readyState === XMLHttpRequest.DONE)
                {
                    if (xhr.status === 200)
                    {
                        // 请求成功，将响应返回
                        resolve(xhr.responseText);
                    } else
                    {
                        // 请求失败，返回错误信息
                        reject(new Error(`Request failed with status: ${xhr.status}`));
                    }
                }
            };
            xhr.send();
        });
    }

    public async sendPost(url: string, params: URLSearchParams | string, headers: Headers)
    {

        try
        {
            if (window.iirosemedia && window.iirosemedia.cors !== undefined)
            {
                if (headers.get('cookie-trans'))
                {
                    headers.append('cookie', headers.get('cookie-trans') as string);
                }
            }
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: params
            });

            if (!response.ok)
            {
                const showmessage = new ShowMessage();
                showmessage.show(`POST请求失败，url: ${url} 状态码：${response.status}, 信息：${response.statusText}, Cookie: ${headers.get('cookie-trans')}, params: ${params.toString()}`);
            }

            return response;
        } catch (error)
        {
            const showmessage = new ShowMessage();
            showmessage.show(`POST请求失败，url: ${url} 信息：${error}`);
            return null;
        }


    }

    public async sendHead(url: string, params:URLSearchParams, headers: Headers, followredirect:boolean = false, warn: boolean = true, signal?: AbortSignal)
    {
        try{

            if (window.iirosemedia && window.iirosemedia.cors !== undefined)
            {
                if (headers.get('cookie-trans'))
                {
                    headers.append('cookie', headers.get('cookie-trans') as string);
                }
            }

            const fullUrl = `${url}?${params.toString()}`;

            const response = await fetch(fullUrl, {
                method: 'HEAD',
                headers: headers,
                redirect: followredirect ? 'follow' : 'manual',
                signal: signal
            });

            if (!response.ok && warn)
            {
                const showmessage = new ShowMessage();
                showmessage.show(`GET请求失败，url: ${url} 状态码：${response.status}, 信息：${response.statusText}, Cookie: ${headers.get('cookie-trans')}, params: ${params.toString()}`);
            }

            return response;
            

        }catch(error)
        {
            if(warn)
            {
                const showmessage = new ShowMessage();
                showmessage.show(`HEAD请求失败，url: ${url} 信息：${error}`);
            }
            return null;
        
        }

    }

    public async tryget(url: string)
    {
        const response = await fetch(url, {
            method: 'HEAD',
        });
        if (response.ok)
        {
            return true;
        } else
        {
            return false;
        }
    }


    protected returnNeteaseHeaders()
    {
        const headers = new Headers();
        headers.append('User-Agent', 'Mozilla/5.0 (Linux; U; Android 8.1.0; zh-cn; BKK-AL10 Build/HONORBKK-AL10) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/66.0.3359.126 MQQBrowser/10.6 Mobile Safari/537.36');
        // headers.append('Content-Type', 'application/x-www-form-urlencoded');
        headers.append('Referer', 'https://music.163.com');
        // headers.append('X-Real-IP', '::1');
        // headers.append('X-Forwarded-For', '::1');
        // headers.append('Cookie', 'osver=undefined; deviceId=undefined; appver=8.9.70; versioncode=140; mobilename=undefined; buildver=1697745346; resolution=1920x1080; __csrf=; os=android; channel=undefined; requestId=1697745346367_0886; MUSIC_A=1f5fa7b6a6a9f81a11886e5186fde7fb0b63372bce7ff361fa5cb1a86d5fbbbbadd2bc8204eeee5e04bf7bf7e7f4428eeb3a754c1a3a779110722d253c67f6e9fac900d7a89533ee3324751bcc9aaf44c3061cd18d77b7a0');
        return headers;
    }

    protected returnBilibiliHeaders()
    {
        const headers = new Headers();
        headers.set('referer', 'https://www.bilibili.com');
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36');
        const bilibiliAccount = localStorage.getItem('bilibiliAccount');
        if (bilibiliAccount)
        {
            const account: BilibiliACC = JSON.parse(bilibiliAccount);
            const excludedKeys = ['face', 'uname'];
            const cookieString = Object.entries(account)
                .filter(([key, value]) =>
                    value !== undefined &&
                    value !== null &&
                    value !== '' &&
                    key !== 'id' &&
                    !excludedKeys.includes(key))
                .map(([key, value]) => `${key}=${value}`)
                .join(';');
            headers.append('cookie-trans', cookieString);
        }
        return headers;
    }

    protected returnBiliBiliHeadersBuvidOnly()
    {
        const headers = new Headers();
        const bilibiliAccount = new GetBiliBiliAccount();
        const account = bilibiliAccount.getBiliBiliAccount();
        if (account)
        {
            headers.append('cookie-trans', `buvid3=${account.buvid3}; buvid4=${account.buvid4};`);
        } else
        {
            headers.append('cookie-trans', `buvid3=1; buvid4=2;`);
        }
        headers.set('referer', 'https://www.bilibili.com');
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36');
        return headers;
    }

    protected returnCommonHeaders()
    {

        const headers = new Headers();
        return headers;
    }

}