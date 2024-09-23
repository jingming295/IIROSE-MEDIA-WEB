import { Environment } from "./environment/Environment";
import { IMCInit } from "./iirose-media-component/IMCInit";
import './SCSS/IIROSE_MEDIA.scss';
import { LocalStorageUtils } from "./settings/localStorageUtils/LocalStorageUtils";

class APP
{
    constructor()
    {
        const environment = new Environment();
        environment.setEnv();
        LocalStorageUtils.Init();
    }

    async init()
    {
        if (typeof document === 'undefined')
        {
            console.log('[IIROSE-MEDIA] - 加载失败，当前环境不支持document对象');
            return;
        }

        const mainFrame = document.getElementById('mainFrame') as HTMLIFrameElement | null;
        const mainContainer = document.getElementById('mainContainer') as HTMLDivElement | null;
        if (!mainContainer) return;

        // 初始化主要功能
        new IMCInit(mainContainer);

        // 检查 mainFrame 是否存在并注入脚本
        if (mainFrame && mainFrame.contentWindow && mainFrame.contentDocument)
        {
            this.injectScriptIntoIframe(mainFrame);
        }

        console.log('[IIROSE-MEDIA] - 加载成功');
    }

    injectScriptIntoIframe(iframe: HTMLIFrameElement)
    {
        // 获取 iframe 的文档对象
        const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDocument)
        {
            console.log('[IIROSE-MEDIA] - 无法获取 iframe 文档');
            return;
        }

        // 创建一个新的 script 标签
        const script = iframeDocument.createElement('script');
        script.type = 'module'; // 使用模块类型
        script.textContent = `
            // 将你需要在 iframe 中执行的代码放在这里
            (() => {
                console.log('[IIROSE-MEDIA] - 脚本已成功注入到 mainFrame');
                
                // 在这里可以调用你当前脚本的 init 函数
                const app = new (${APP.toString()})();
                app.init();
            })();
        `;

        // 将 script 标签插入到 iframe 的 body 中
        iframeDocument.body.appendChild(script);
    }
}

const app = new APP();
app.init();
