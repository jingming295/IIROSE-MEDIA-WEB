import { createRoot } from 'react-dom/client';
import { IMC } from './IMC';
import React from 'react';

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
        const root = createRoot(IIROSE_WEB_CONTAINER);
        root.render(<IMC />);
    }

}

