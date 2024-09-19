export class IIROSEUtils
{
    /**
     * 开启输入框
     * @param e 模式, 0,1,2,3,4
     * @param t t[0] 为标题，t[1] 如果是数字，那就是字数限制，如果是'number'，那么开启的输入框会是数字输入框，t[2] 为字数限制
     * @param o 回调函数
     * @returns 
     */
    public sync(e: number, t: (number | string)[], o: (userInput: string | null) => void)
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
     */
    public buildSelect2(i: HTMLElement | undefined | null, a: (string | number)[][], s: (t: HTMLElement, s: string) => void, e: boolean, t: boolean, o: string | undefined | null, r: boolean, l: string | undefined | null, n: () => void)
    {
        if (!window.Utils) return;
        window.Utils.buildSelect2(i, a, s, e, t, o, r, l, n);
    }

    public getUserCard(uid: string)
    {
        if (!window.Utils) return;
        const a = document.createElement('span')
        a.innerHTML = uid
        a.className = `followName2`
        window.Utils.service.getUserCard.call(a, uid, 1);
    }
}