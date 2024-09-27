import { BilibiliACC } from "../Account/BiliBili/BilibiliAccountInterface";
import { GetBiliBiliAccount } from "../Account/BiliBili/GetBiliBili";
import { ShowMessage } from "../iirose_func/ShowMessage";
import { BiliBiliSettings } from "../settings/bilibiliSettings/BiliBiliSettings";

export class SendFetch
{
    public cors = `https://cors-anywhere-iirose-uest-web-gjtxhfvear.cn-beijing.fcapp.run/`;
    public malaysiacors = `https://cors-anywhere-cors-dzgtzfcdbk.ap-southeast-3.fcapp.run/`;
    public beijingcors = `https://cors-anywhere-iirose-uest-web-gjtxhfvear.cn-beijing.fcapp.run/`;
    public devcors = `http://localhost:8080/`;

    constructor()
    {
        if (window.iirosemedia && window.iirosemedia.cors !== undefined)
        {
            this.cors = window.iirosemedia.cors;
        }
    }
    public async sendGet(url: string, params: URLSearchParams, headers?: Headers, warn: boolean = true, signal?: AbortSignal)
    {
        const fullUrl = `${url}?${params.toString()}`;

        try
        {
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: headers,
                signal: signal
            });

            if (!response.ok && warn)
            {
                const showmessage = new ShowMessage();
                showmessage.show(`GET请求失败，url: ${fullUrl} 状态码：${response.status}, 信息：${response.statusText}, params: ${params.toString()}`);
            }

            return response;
        } catch (error)
        {
            if (warn)
            {
                const showmessage = new ShowMessage();
                showmessage.show(`GET请求失败，url: ${fullUrl} 信息：${error}`);
                console.log(`GET请求失败，url: ${fullUrl} 信息：${error}`);
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

            headers.forEach((value, key) =>
            {
                xhr.setRequestHeader(key, value);
            })

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
            }
            xhr.send();
        });
    }

    public async sendPost(url: string, params: URLSearchParams | string, headers?: Headers)
    {

        try
        {
            if (window.iirosemedia && window.iirosemedia.cors !== undefined && headers)
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
                showmessage.show(`POST请求失败，url: ${url} 状态码：${response.status}, 信息：${response.statusText}, params: ${params.toString()}`);
            }

            return response;
        } catch (error)
        {
            const showmessage = new ShowMessage();
            showmessage.show(`POST请求失败，url: ${url} 信息：${error}`);
            return null;
        }


    }

    public async sendHead(url: string, params: URLSearchParams, headers: Headers, followredirect: boolean = false, warn: boolean = true, signal?: AbortSignal)
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


        } catch (error)
        {
            if (warn)
            {
                const showmessage = new ShowMessage();
                showmessage.show(`HEAD请求失败，url: ${url} 信息：${error}`);
            }
            return null;

        }

    }

    public async tryGetWitchFetch(url: string)
    {
        try
        {
            const response = await fetch(url, {
            });

            // 如果请求成功，检查状态码
            if (response.ok || response.status === 200)
            {
                return true;
            } else
            {
                return false;
            }
        } catch (error)
        {
            console.log(error);
            return true; // 处理其他错误
        }
    }

    public async tryGetWhithXhr(url: string): Promise<boolean>
    {
        return new Promise((resolve) =>
        {
            const xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, true); // 使用 HEAD 请求方法
            xhr.onload = () =>
            {
                if (xhr.status >= 200 && xhr.status < 300)
                {
                    resolve(true); // 请求成功，返回 true
                } else
                {
                    resolve(false); // 请求失败，返回 false
                }
            }
            xhr.onerror = () =>
            {
                if (xhr.status >= 200 && xhr.status < 300)
                {
                    resolve(true); // 请求成功，返回 true
                }
                resolve(false); // 请求出错，返回 false
            }
            xhr.send(); // 发送请求
        });
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

    protected returnBilibiliHeadersParam()
    {
        const params = new URLSearchParams();
        const bilibiliAccount = localStorage.getItem('bilibiliAccount');
        // params.append('rfr', 'https://www.bilibili.com');
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
            params.append('cookie', cookieString);
        }
        return params;
    }

    protected returnBiliBiliHeadersBuvidOnly()
    {
        const headers = new Headers();
        const bilibiliAccount = new GetBiliBiliAccount();
        const account = bilibiliAccount.getBiliBiliAccount();
        if (account)
        {
            headers.append('cookie-trans', `buvid3=${account.buvid3} buvid4=${account.buvid4}`);
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

    protected getBilibiliCors()
    {
        const bvSettings = new BiliBiliSettings().getBilibiliVideoSettings();
        const api = bvSettings.api;
        if (api === 'Beijing')
        {
            return this.beijingcors;
        } else if (api === 'MY')
        {
            return this.malaysiacors;
        } else if (api === 'Dev')
        {
            return this.devcors;
        }
        return this.cors;
    }

}