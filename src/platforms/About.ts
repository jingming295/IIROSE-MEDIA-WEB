import { IIROSEUtils } from "../iirose_func/IIROSEUtils";

export class About
{
    iiroseUtils = new IIROSEUtils();
    async aboutCreator()
    {
        this.iiroseUtils.getUserCard('61f7881cd4538')
    }

    async aboutDonate()
    {

        function DonatePlatform(t: HTMLElement, s: string)
        {

            if (s === `0`)
            {
                window.open('https://afdian.com/a/mingj')
            }

        }

        const selectOption = [
            [0, `爱发电`, `<div style="height:100px;width:100px;position:absolute;top:0;left:0;"><div class="bgImgBox"><img class="bgImg" loading="lazy" decoding="async" src="${`https://static.afdiancdn.com/static/img/logo/logo.png`}" onerror="this.style.display='none';"><div class="fullBox"></div></div></div>`],
        ]
        this.iiroseUtils.buildSelect2(null, selectOption, DonatePlatform, false, true, null, false, null, () => { })


    }

    async aboutSponsorList(ShowOrHideIMC: () => Promise<void>)
    {
        const selectOption = [
            [`5e9e45731b5a9`, `ゑん`, `<div style="height:100px;width:100px;position:absolute;top:0;left:0;"><div class="bgImgBox"><img class="bgImg" loading="lazy" decoding="async" src="${`http://r.iirose.com/i/22/2/10/23/0445-1S.gif#e`}" onerror="this.style.display='none';"><div class="fullBox"></div></div></div>`],
        ]

        const DonatePerson = async (t: HTMLElement, s: string) =>
        {
            await ShowOrHideIMC()
            this.iiroseUtils.getUserCard(s)
        }

        this.iiroseUtils.buildSelect2(null, selectOption, DonatePerson, false, true, null, false, null, () => { })


    }

}