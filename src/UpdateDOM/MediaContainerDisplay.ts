import { MediaContainer } from "../IIROSE-MEDIA/MediaContainer";

export class MediaContainerDisplay{

    public displayMessage(color:string, type:number, MediaContainerContent:HTMLElement | null){

        function createPleaseSearchMsg(){
            const msgWrapper = document.createElement('div');
            msgWrapper.classList.add('containerMsgWrapper')
            msgWrapper.style.color = color;
            const msgLogo = document.createElement('div');
            msgLogo.classList.add('searchLogo');
            const msgText = document.createElement('div');
            msgText.classList.add('containerMsg');
            msgText.innerText = '请点击搜索图标进行搜索！';
            msgWrapper.appendChild(msgLogo);
            msgWrapper.appendChild(msgText);
            return msgWrapper;
        }

        function createNoResultMsg(){
            const msgWrapper = document.createElement('div');
            msgWrapper.classList.add('containerMsgWrapper')
            msgWrapper.style.color = color;
            const msgLogo = document.createElement('div');
            msgLogo.classList.add('noresultLogo');
            const msgText = document.createElement('div');
            msgText.classList.add('containerMsg');
            msgText.innerText = '什么也没有搜到...';
            msgWrapper.appendChild(msgLogo);
            msgWrapper.appendChild(msgText);
            return msgWrapper;
        }
        if(!MediaContainerContent) return;
        const parent = MediaContainerContent.parentElement;
        if(!parent) return;
        MediaContainerContent.remove()
        const newMediaContainerContent = document.createElement('div');
        newMediaContainerContent.classList.add('MediaContainerContent');
        newMediaContainerContent.id = 'MediaContainerContent';
        newMediaContainerContent.style.opacity = '0';
        if(type === 1){
        newMediaContainerContent.appendChild(createPleaseSearchMsg());
        } else if(type === 2){
        newMediaContainerContent.appendChild(createNoResultMsg());
        }
        newMediaContainerContent.style.height = '100%';
        const mediacontainer = new MediaContainer();
        mediacontainer.updatePaginationNotings()
        parent.appendChild(newMediaContainerContent);
        setTimeout(() => {
            newMediaContainerContent.style.opacity = '1';
        }, 1);        
    }
}