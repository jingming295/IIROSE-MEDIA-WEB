import { IIroseMainNavigationBar } from "./elements/IIroseMainNavigationBar";
import { MediaContainerUtils } from "./MediaContainer";
import { IIROSE_MEDIASelectHolder } from "./elements/IIROSE_MEDIASelectHolder";
import { Video } from "../Platform/Video";
import { Music } from "../Platform/Music";

export class IIROSEMEDIA
{
    public createIIROSEMEDIA()
    {
        if (!document.getElementById('IIROSE_MEDIA_CONTAINER'))
        {
            const mainContainer = document.getElementById('mainContainer');

            const IIROSE_MEDIA_CONTAINER = document.createElement('div');
            IIROSE_MEDIA_CONTAINER.id = 'IIROSE_MEDIA_CONTAINER';
            IIROSE_MEDIA_CONTAINER.classList.add('IIROSE_MEDIA_CONTAINER');

            // TODO: 希望能够逐渐放弃使用
            const iiROSE_MEDIASelectHolder = new IIROSE_MEDIASelectHolder();
            const SelectHolder = iiROSE_MEDIASelectHolder.createIIROSE_MEDIASelectHolder();

            if (mainContainer)
            {
                const mediaContainerUtils = new MediaContainerUtils()
                const IIROSE_MEDIA = document.createElement('div');
                IIROSE_MEDIA.id = 'IIROSE_MEDIA';

                mainContainer.appendChild(IIROSE_MEDIA_CONTAINER);
                mainContainer.appendChild(SelectHolder)
                IIROSE_MEDIA_CONTAINER.appendChild(IIROSE_MEDIA);

                const iiroseMainNavigationBar = new IIroseMainNavigationBar(mediaContainerUtils);
                const navBar = iiroseMainNavigationBar.create();
                IIROSE_MEDIA.appendChild(navBar);

                const MediaContainerWrapper = document.createElement('div');
                MediaContainerWrapper.classList.add('MediaContainerWrapper');
                MediaContainerWrapper.id = 'MediaContainerWrapper';
                IIROSE_MEDIA.appendChild(MediaContainerWrapper)


                const video = new Video(mediaContainerUtils);
                const videoPlatforms = video.createVideoPlatform();
                // const music = new Music(mediaContainerUtils);
                // const musicPlatforms = music.music();
                mediaContainerUtils.createMediaContainer(videoPlatforms, MediaContainerWrapper)
                // MediaContainerWrapper.appendChild(mediaContainer)
            }
        }
    }


}