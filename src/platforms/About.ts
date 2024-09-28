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
            } else if (s === `1`)
            {
                window.open('https://github.com/sponsors/jingming295') // Github Sponsor
            }

        }

        const selectOption = [
            [0, `爱发电`, `${this.generatePic(`https://static.afdiancdn.com/static/img/logo/logo.png`)}`],
            [1, `Github Sponsor`, `${this.generatePic(`http://r.iirose.com/i/24/9/28/19/3436-QA.png`)}`],
        ]
        this.iiroseUtils.buildSelect2(null, selectOption, DonatePlatform, false, true, null, false, null, () => { })


    }

    async aboutSponsorList(ShowOrHideIMC: () => Promise<void>)
    {
        const selectOption = [
            [`5e9e45731b5a9`, `ゑん`, `${this.generatePic(`http://r.iirose.com/i/22/2/10/23/0445-1S.gif#e`)}`],
            [`6090dec4e5836`, `情の蛊`, `${this.generatePic(`http://r.iirose.com/i/24/8/15/22/0929-HM.jpg`)}`],

        ]

        const DonatePerson = async (t: HTMLElement, s: string) =>
        {
            await ShowOrHideIMC()
            this.iiroseUtils.getUserCard(s)
        }

        this.iiroseUtils.buildSelect2(null, selectOption, DonatePerson, false, true, null, false, null, () => { })


    }

    generatePic(src: string)
    {
        return `<div style="height:100px;width:100px;position:absolute;top:0;left:0;"><div class="bgImgBox"><img class="bgImg" loading="lazy" decoding="async" src="${src}" onerror="this.style.display='none';"><div class="fullBox"></div></div></div>`
    }

}