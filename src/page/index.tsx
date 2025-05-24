import { render } from "preact";
import { MainAppControlLayer } from "./MainAppControlLayer";

export class IMCInit
{

    public static init(mc: HTMLDivElement)
    {
        const container = document.createElement('div');
        mc.appendChild(container);
        render(<MainAppControlLayer />, container);
    }
}
