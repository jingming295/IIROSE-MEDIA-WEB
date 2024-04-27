declare global {
    interface Window {
        /**
         * 一些工具函数
         */
        Utils?: {
            /**
             * 开启输入框
             * @param e 模式, 0,1,2,3,4
             * @param t 
             * @param o 回调函数
             * @returns 
             */
            sync: (e: number, t: (number | string)[], o: (a: string | null) => void) => void;
        };
    }
}

export class Utils {
    /**
     * 开启输入框
     * @param e 模式, 0,1,2,3,4
     * @param t t[0] 为标题，t[1] 如果是数字，那就是字数限制，如果是'number'，那么开启的输入框会是数字输入框，t[2] 为字数限制
     * @param o 回调函数
     * @returns 
     */
    public sync(e: number, t: (number | string)[], o: (userInput: string | null) => void) {
        if (!window.Utils) return;
        window.Utils.sync(e, t, o);
    }
}