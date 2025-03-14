import jQuery from 'jquery'; // 导入 jQuery 库

declare global
{
    interface Window
    {
        _alert?: (message: string) => void;

        functionBtnDo(e: number, t?: undefined, o?: undefined): void;

        /**
         * 显示图片
         * @param e img的链接
         * @param t 布尔值
         */
        showImg(e: string, t?: boolean): void;

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
            buildSelect2: (i: HTMLElement | undefined | null, a: (string | number)[][], s: (t: HTMLElement, s: string) => void, e: boolean, t: boolean, o: string | undefined | null, r: boolean, l: string | undefined | null, n: () => void) => void;
            imgReady: {
                set: (e: HTMLImageElement, t?: string) => void;
            }

            service: {
                getUserCard: (uid: string, type: number) => void;
                moveinputDo: (e: string, t: undefined) => void;
            }
            IMW?: {
                backup: {
                    moveinputDo: (e: string, t: undefined) => void;
                }
            }
        }

        Objs?: {
            repertory: {
                albumShowHolder: JQuery<HTMLElement>;
                albumShow: AlbumShow;
                albumShowHolderAnimate: JQuery<HTMLElement>;
            }

            mapHolder: {
                Assets: {
                    userJson: string;
                }
            }
        }

        Constant?: {
            Others: {
                transform: string;
            }
        },

        Probe: {
            gestureMouseEvent: boolean // 是否在处理手势事件
            getMediaLink: number // 如果为1则获取媒体链接，经常用于更换背景音乐
            functionHolderAnimate: number
        },

        functionHolder: JQuery,
        functionHolderDarker: JQuery,
        functionHolderP: number,
        isMobile: boolean,
        functionHolderSlider: HTMLDivElement


    }
}

interface AlbumShow extends HTMLImageElement
{
    resetScroll(): void;


}


