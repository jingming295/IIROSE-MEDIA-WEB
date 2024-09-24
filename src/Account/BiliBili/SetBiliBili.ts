import { BiliBiliLoginApi } from "../../Api/BilibiliAPI/LoginAPI";
import { ShowImage } from "../../iirose_func/ShowImg";
import { ShowMessage } from "../../iirose_func/ShowMessage";
import { BilibiliACC } from "./BilibiliAccountInterface";

import QRCode from 'qrcode';

export class BiliBiliAccount
{
    public setBiliBiliAccountDefaultCookie()
    {
        this.setBuvid();
    }

    public async setBuvid()
    {
        const bl = new BiliBiliLoginApi();
        const bilibiliaccount = localStorage.getItem('bilibiliAccount');
        if (bilibiliaccount)
        {
            const account: BilibiliACC = JSON.parse(bilibiliaccount);
            if (account.buvid3 && account.buvid4) return;
            const buvid = await bl.getBuvid();
            if (!buvid || !buvid.data) return;
            account.buvid3 = buvid.data.b_3;
            account.buvid4 = buvid.data.b_4;
            localStorage.setItem('bilibiliAccount', JSON.stringify(account));
        } else
        {
            const buvid = await bl.getBuvid();
            if (!buvid || !buvid.data) return;
            const account: BilibiliACC = {
                buvid3: buvid.data.b_3,
                buvid4: buvid.data.b_4
            }
            localStorage.setItem('bilibiliAccount', JSON.stringify(account));
        }
    }

    public async setBiliBiliAccount()
    {
        function delay(ms: number)
        {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        function getRandomInt(min: number, max: number)
        {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        const bilibiliLoginApi = new BiliBiliLoginApi();
        let bilibiliQrcode = await bilibiliLoginApi.getQRCode();
        const showMessage = new ShowMessage();
        if (!bilibiliQrcode || !bilibiliQrcode.data) return null;

        let qrcode = await this.generateQRCodeBase64(bilibiliQrcode.data.url);
        const showImage = new ShowImage();
        showImage.show(qrcode);
        const albumShowHolder = document.getElementById('albumShowHolder');

        if (!albumShowHolder) return null;
        let qrLogin = await bilibiliLoginApi.QRLogin(bilibiliQrcode.data.qrcode_key);
        let noPerformAction = 0;
        do
        {
            if (!bilibiliQrcode || !bilibiliQrcode.data)
            {
                break;
            }
            qrLogin = await bilibiliLoginApi.QRLogin(bilibiliQrcode.data.qrcode_key);
            if (albumShowHolder.style.display === 'none')
            {
                break;
            }
            if (!qrLogin)
            {
                break;
            }
            if (qrLogin.data.code === 0)
            {
                break;
            } else if (qrLogin.data.code === 86101)
            {
                // 未扫码，继续等待
            } else if (qrLogin.data.code === 86038)
            {
                bilibiliQrcode = await bilibiliLoginApi.getQRCode();
                if (bilibiliQrcode && bilibiliQrcode.data)
                {
                    console.log(`重新获取二维码`);
                    qrcode = await this.generateQRCodeBase64(bilibiliQrcode.data.url);
                    showImage.show(qrcode);
                }
            }
            else if (qrLogin.data.code === 86090)
            {
                // 扫码未登录
                noPerformAction++;
                if (noPerformAction > 10)
                {
                    bilibiliQrcode = await bilibiliLoginApi.getQRCode();
                    showMessage.show(`长时间扫码未登录，刷新了二维码`);
                    if (bilibiliQrcode && bilibiliQrcode.data)
                    {
                        console.log(`长时间扫码未登录，刷新了二维码`);
                        qrcode = await this.generateQRCodeBase64(bilibiliQrcode.data.url);
                        noPerformAction = 0;
                        showImage.show(qrcode);
                    }
                }
            }
            console.log(qrLogin.data.code);

            await delay(getRandomInt(1800, 2200));
        } while (true);

        if (!qrLogin) return null;

        const parsedCookie = new URL(qrLogin.data.url);
        const DedeUserID = parsedCookie.searchParams.get('DedeUserID');
        const DedeUserID__ckMd5 = parsedCookie.searchParams.get('DedeUserID__ckMd5');
        const Expires = parsedCookie.searchParams.get('Expires');
        const SESSDATA = parsedCookie.searchParams.get('SESSDATA');
        const bili_jct = parsedCookie.searchParams.get('bili_jct');
        const gourl = parsedCookie.searchParams.get('gourl');
        const refresh_token = qrLogin.data.refresh_token;

        const bilibiliaccount: BilibiliACC = {
            DedeUserID: DedeUserID ? DedeUserID : '',
            DedeUserID__ckMd5: DedeUserID__ckMd5 ? DedeUserID__ckMd5 : '',
            Expires: Expires ? Expires : '',
            SESSDATA: SESSDATA ? SESSDATA : '',
            bili_jct: bili_jct ? bili_jct : '',
            gourl: gourl ? gourl : '',
            refresh_token: refresh_token ? refresh_token : ''
        }
        let lsBilibiliAccount = localStorage.getItem('bilibiliAccount');
        if (lsBilibiliAccount)
        {
            const lsBilibiliAccountParsed: BilibiliACC = JSON.parse(lsBilibiliAccount);
            lsBilibiliAccountParsed.DedeUserID = bilibiliaccount.DedeUserID;
            lsBilibiliAccountParsed.DedeUserID__ckMd5 = bilibiliaccount.DedeUserID__ckMd5;
            lsBilibiliAccountParsed.Expires = bilibiliaccount.Expires;
            lsBilibiliAccountParsed.SESSDATA = bilibiliaccount.SESSDATA;
            lsBilibiliAccountParsed.bili_jct = bilibiliaccount.bili_jct;
            lsBilibiliAccountParsed.gourl = bilibiliaccount.gourl;
            lsBilibiliAccountParsed.refresh_token = bilibiliaccount.refresh_token;
            localStorage.setItem('bilibiliAccount', JSON.stringify(lsBilibiliAccountParsed));

        } else localStorage.setItem('bilibiliAccount', JSON.stringify(bilibiliaccount));
        const navUserData = await bilibiliLoginApi.getNavUserData();
        if (navUserData && navUserData.data)
        {
            lsBilibiliAccount = localStorage.getItem('bilibiliAccount');
            if (lsBilibiliAccount)
            {
                const lsBilibiliAccountParsed: BilibiliACC = JSON.parse(lsBilibiliAccount);
                lsBilibiliAccountParsed.uname = navUserData.data.uname;
                lsBilibiliAccountParsed.face = navUserData.data.face;
                localStorage.setItem('bilibiliAccount', JSON.stringify(lsBilibiliAccountParsed));
            }
            const showmessage = new ShowMessage();
            showmessage.show(`登录成功，用户名：${navUserData.data.uname}`);
            showImage.hide();
            return navUserData.data.uname;
        }
        return null
    }

    private generateQRCodeBase64(qrcodetext: string): Promise<string>
    {
        return new Promise((resolve, reject) =>
        {
            QRCode.toDataURL(qrcodetext, function (err, url)
            {
                if (err)
                {
                    reject(err);
                } else
                {
                    resolve(url);
                }
            });
        });
    }

}