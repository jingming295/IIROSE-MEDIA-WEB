import { IMC } from './IMC';
import { h, render } from 'preact';

export class IMCInit
{
    constructor(mainContainer: HTMLDivElement)
    {
        this.init(mainContainer);
    }
    init(mc: HTMLDivElement)
    {
        const IIROSE_WEB_CONTAINER = document.createElement('div');
        IIROSE_WEB_CONTAINER.id = 'IIROSE_MEDIA_CONTAINER';
        IIROSE_WEB_CONTAINER.classList.add('IIROSE_MEDIA_CONTAINER');
        mc.appendChild(IIROSE_WEB_CONTAINER);
        render(<IMC />, IIROSE_WEB_CONTAINER);
    }

}

