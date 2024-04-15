import { CreateNavBar } from "./NavBar";
import '../SCSS/IIROSE_MEDIA.scss';
import { MediaContainer } from "./MediaContainer";
import { IIROSE_MEDIASelectHolder } from "./IIROSE_MEDIASelectHolder";
import { Music } from "../Platform/Music";
import { IIROSE_MEDIAInput } from "./IIROSE_MEDIAInput";

export class IIROSEMEDIA
{

    public createIIROSEMEDIA()
    {
        if (!document.getElementById('IIROSE_MEDIA_CONTAINER'))
        {
            const IIROSE_MEDIA_CONTAINER = document.createElement('div');
            IIROSE_MEDIA_CONTAINER.id = 'IIROSE_MEDIA_CONTAINER';
            IIROSE_MEDIA_CONTAINER.classList.add('IIROSE_MEDIA_CONTAINER');
            const mainContainer = document.getElementById('mainContainer');

            const iiROSE_MEDIASelectHolder = new IIROSE_MEDIASelectHolder();
            const SelectHolder = iiROSE_MEDIASelectHolder.createIIROSE_MEDIASelectHolder();
            const iiROSE_MEDIAInput = new IIROSE_MEDIAInput();
            const iiroseInput = iiROSE_MEDIAInput.createIIROSE_MEDIAInput();
            

            if (mainContainer)
            {
                const IIROSE_MEDIA = this.createIIROSE_MEDIA();
                mainContainer.appendChild(IIROSE_MEDIA_CONTAINER);
                mainContainer.appendChild(SelectHolder)
                mainContainer.appendChild(iiroseInput)
                IIROSE_MEDIA_CONTAINER.appendChild(IIROSE_MEDIA);
            }
        }
    }

    private createIIROSE_MEDIA()
    {
        const IIROSE_MEDIA = document.createElement('div');
        IIROSE_MEDIA.id = 'IIROSE_MEDIA';
        const createNavBar = new CreateNavBar();
        const navBar = createNavBar.createNavBar();
        IIROSE_MEDIA.appendChild(navBar);

        const MediaContainerWrapper = document.createElement('div');
        MediaContainerWrapper.classList.add('MediaContainerWrapper');
        MediaContainerWrapper.id = 'MediaContainerWrapper';

        const music = new Music()

        const platforms = music.music()



        const mediaContainer = new MediaContainer()
        MediaContainerWrapper.appendChild(mediaContainer.createMediaCOntainer(platforms, 'MusicContainer'))
        IIROSE_MEDIA.appendChild(MediaContainerWrapper)

        return IIROSE_MEDIA;
    }
}