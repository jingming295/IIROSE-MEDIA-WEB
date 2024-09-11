import { Environment } from "./environment/Environment";
import { HotKey } from "./hotkey/HotKey";
import { IMCInit } from "./iirose-media-component/IMCInit"
import './SCSS/IIROSE_MEDIA.scss';
import './SCSS/MaterialDesignIcon.scss';

class APP
{

    constructor()
    {
        const enviroment = new Environment();
        enviroment.setEnv();
    }

    async init()
    {

        if (typeof document === 'undefined')
        {
            console.log('[IIROSE-MEDIA] - 加载失败，当前环境不支持document对象')
            return
        }

        const mainContainer = document.getElementById('mainContainer') as HTMLDivElement | null;
        if (!mainContainer) return
        new IMCInit(mainContainer);

        new HotKey();

        console.log('[IIROSE-MEDIA] - 加载成功')
    }

}

const app = new APP()

app.init()