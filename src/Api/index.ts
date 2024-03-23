export class SendFetch
{
    public cors2 = 'http://localhost:8080/'
    public cors = 'https://cors-anywhere-cors-dzgtzfcdbk.ap-southeast-3.fcapp.run/';
    public async sendGet(url: string, params: URLSearchParams, headers: Headers)
    {
        const fullUrl = `${url}?${params.toString()}`;
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: headers,
        });
        return response;
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
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: params
        });

        return response;
    }

    protected returnNeteaseHeaders()
    {
        const headers = new Headers();
        // headers.append('User-Agent', 'Mozilla/5.0 (Linux; U; Android 8.1.0; zh-cn; BKK-AL10 Build/HONORBKK-AL10) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/66.0.3359.126 MQQBrowser/10.6 Mobile Safari/537.36');
        // headers.append('Content-Type', 'application/x-www-form-urlencoded');
        // headers.append('Referer', 'https://music.163.com');
        // headers.append('X-Real-IP', '::1');
        // headers.append('X-Forwarded-For', '::1');
        // headers.append('Cookie', 'osver=undefined; deviceId=undefined; appver=8.9.70; versioncode=140; mobilename=undefined; buildver=1697745346; resolution=1920x1080; __csrf=; os=android; channel=undefined; requestId=1697745346367_0886; MUSIC_A=1f5fa7b6a6a9f81a11886e5186fde7fb0b63372bce7ff361fa5cb1a86d5fbbbbadd2bc8204eeee5e04bf7bf7e7f4428eeb3a754c1a3a779110722d253c67f6e9fac900d7a89533ee3324751bcc9aaf44c3061cd18d77b7a0');
        return headers;
    }

}