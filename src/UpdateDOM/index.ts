export class UpdateDom
{
    public changeStatusIIROSE_MEDIA()
    {
        const IIROSE_MEDIA = document.getElementById('IIROSE_MEDIA_CONTAINER')
        const mainHolder = document.getElementById('mainHolder');
        if (IIROSE_MEDIA && mainHolder)
        {
            IIROSE_MEDIA.classList.toggle('ShowIIROSE_MEDIA_CONTAINER')
            mainHolder.classList.toggle('hidemainHolder')
        }
    }
}