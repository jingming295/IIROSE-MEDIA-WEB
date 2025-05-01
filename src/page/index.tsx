import { render } from "preact";
import { MainApp } from "./MainApp";

export class IMCInit
{

    public static init(mc: HTMLDivElement)
    {
        const container = document.createElement('div');
        mc.appendChild(container);
        render(<MainApp />, container);
    }
}
