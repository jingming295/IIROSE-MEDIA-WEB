export class IIROSEUtils
{
    /**
     * 开启输入框
     * @param e 模式, 0,1,2,3,4
     * @param t t[0] 为标题，t[1] 如果是数字，那就是字数限制，如果是'number'，那么开启的输入框会是数字输入框，t[2] 为字数限制
     * @param o 回调函数
     * @returns
     */
    public static sync(e: number, t: (number | string)[], o: (userInput: string | null) => void)
    {
        if (!window.Utils) return;
        window.Utils.sync(e, t, o);

        const syncHolder = document.getElementById('syncHolder')

        if (syncHolder)
        {
            let syncHolderOutside = document.getElementById('syncHolderOutside')
            if (!syncHolderOutside)
            {
                syncHolderOutside = document.createElement('div')
                syncHolderOutside.id = 'syncHolderOutside'
                syncHolderOutside.onclick = () =>
                {
                    const syncPromptHolder = syncHolder.childNodes[0]
                    const contentItemBtn = syncPromptHolder.childNodes[3]
                    const cancelBtn = contentItemBtn.childNodes[0] as HTMLButtonElement
                    if (cancelBtn) cancelBtn.click()
                }
                syncHolder.appendChild(syncHolderOutside)
            }


        }

    }

    /**
     * 创建一个选择框
     * @param i 触发元素
     * @param a 2D数组，结构为类似 [[0, "选项1", "HTML字符串"], [1, "选项2", "HTML字符串"]]
     * @param s 回调函数
     * @param e 是否禁止清空选项 (禁止点空白的地方返回)
     * @param t 是否显示图标
     * @param o 自定义HTML字符串，出现在顶端
     * @param r 是否启用多选功能
     * @param l 自定义HTML字符串，出现在底端
     * @param n 返回（点击空白处）的回调函数
     * @param confirmOnTop 是否在多选时将确定按钮置顶（默认 true）
     */
    public static buildSelect2(
        i: HTMLElement | undefined | null,
        a: (string | number)[][],
        s: (t: HTMLElement, s: any) => void,
        e: boolean,
        t: boolean,
        o: string | undefined | null,
        r: boolean,
        l: string | undefined | null,
        n: () => void,
        confirmOnTop: boolean = true
    )
    {
        if (!window.Utils) return;
        window.Utils.buildSelect2(i, a, s, e, t, o, r, l, n);

        if (r && confirmOnTop) {
            setTimeout(() => {
                try {
                    const selectHolderBox = (window as any).Objs?.selectHolder?.selectHolderBox?.[0] || document.getElementById('selectHolderBox');
                    if (selectHolderBox) {
                        const items = selectHolderBox.querySelectorAll('.selectHolderBoxItem');
                        if (items.length > 1) {
                            const confirmBtn = items[items.length - 1] as HTMLElement;
                            selectHolderBox.prepend(confirmBtn);
                            selectHolderBox.scrollTop = 0;

                            confirmBtn.style.position = 'sticky';
                            confirmBtn.style.top = '0';
                            confirmBtn.style.zIndex = '10';
                            confirmBtn.style.backdropFilter = 'blur(10px)';
                            const boxBg = window.getComputedStyle(selectHolderBox).backgroundColor;
                            confirmBtn.style.backgroundColor = (boxBg && boxBg !== 'rgba(0, 0, 0, 0)' && boxBg !== 'transparent') ? boxBg : 'rgba(32, 32, 32, 0.95)';
                            confirmBtn.style.borderBottom = '1px solid rgba(128, 128, 128, 0.25)';
                        }
                    }
                } catch (err) {
                    console.error('[IIROSEUtils] Move confirm button to top failed:', err);
                }
            }, 0);
        }
    }

    /**
     * 生成带封面的图标 HTML（带圆角和优雅降级）
     * @param src 封面图片地址
     * @param fallbackIcon 兜底图标的 class，如 'mdi-music-note' 或 'mdi-video'
     */
    public static generatePicHtml(src?: string, fallbackIcon: string = 'mdi-music-note'): string
    {
        const safeSrc = src ? src.replace(/^http:\/\//, 'https://').trim() : '';
        const fallbackHtml = `<div class="${fallbackIcon}" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`;

        if (!safeSrc) {
            return fallbackHtml;
        }

        return `<div style="height:100px;width:100px;position:absolute;top:0;left:0;">` +
            `<div class="bgImgBox" style="border-radius:8px !important;overflow:hidden;margin:12px;width:76px;height:76px;background:rgba(0,0,0,0.2);">` +
            `<img class="bgImg" loading="lazy" decoding="async" src="${safeSrc}" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='block';" style="width:100%;height:100%;object-fit:cover;">` +
            `<div class="${fallbackIcon}" style="display:none;font-family:md;font-size:26px;text-align:center;line-height:76px;height:76px;width:76px;position:absolute;top:0;left:0;opacity:.7;"></div>` +
            `<div class="fullBox"></div>` +
            `</div></div>`;
    }

    public static getUserCard(uid: string)
    {
        if (!window.Utils) return;
        const a = document.createElement('span')
        a.innerHTML = uid
        a.className = `followName2`
        window.Utils.service.getUserCard.call(a, uid, 1);
    }
}