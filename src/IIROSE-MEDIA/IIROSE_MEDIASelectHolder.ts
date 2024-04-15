import { UpdateDom } from "../UpdateDOM";
import { SelectHolderItem } from "./SelectHolderItemInterface";

export class IIROSE_MEDIASelectHolder
{

    public createIIROSE_MEDIASelectHolder()
    {

        const IIROSE_MEDIASelectHolder = document.createElement('div');
        IIROSE_MEDIASelectHolder.classList.add('IIROSE_MEDIASelectHolder');
        IIROSE_MEDIASelectHolder.id = 'IIROSE_MEDIASelectHolder';

        IIROSE_MEDIASelectHolder.onclick = () =>
        {
            IIROSE_MEDIASelectHolder.style.opacity = '0';
            IIROSE_MEDIASelectHolder.addEventListener('transitionend', () =>
            {
                IIROSE_MEDIASelectHolder.style.zIndex = '-1';
            }, { once: true });
        };

        const IIROSE_MEDIASelectHolderWrapper = document.createElement('div');
        IIROSE_MEDIASelectHolderWrapper.classList.add('IIROSE_MEDIASelectHolderWrapper');

        const item: SelectHolderItem[] = [{
            id: 'sequence',
            title: '正序点播',
            onclick: () => { }
        }, {
            id: 'random',
            title: '乱序点播',
            onclick: () => { }
        }];
        item.forEach(element =>
        {
            const SelectHolderItem = this.createIIROSE_MEDIASelectHolderItem(element, IIROSE_MEDIASelectHolder);
            IIROSE_MEDIASelectHolderWrapper.appendChild(SelectHolderItem);
        });
        IIROSE_MEDIASelectHolder.appendChild(IIROSE_MEDIASelectHolderWrapper);
        return IIROSE_MEDIASelectHolder;
    }

    public showIIROSE_MEDIASelectHolder(item: SelectHolderItem[])
    {
        const IIROSE_MEDIASelectHolder = document.getElementById('IIROSE_MEDIASelectHolder');

        if (IIROSE_MEDIASelectHolder)
        {
            IIROSE_MEDIASelectHolder.style.zIndex = '99999';
            setTimeout(() =>
            {
                IIROSE_MEDIASelectHolder.style.opacity = '1';
            }, 10);
            const IIROSE_MEDIASelectHolderItemWrapper = document.querySelectorAll('.IIROSE_MEDIASelectHolderItemWrapper') as NodeListOf<HTMLElement>;
            IIROSE_MEDIASelectHolderItemWrapper.forEach((element, index) =>
            {
                if (item[index].id === element.id)
                {
                    element.onclick = () =>
                    {
                        item[index].onclick();

                        IIROSE_MEDIASelectHolder.style.opacity = '0';
                        IIROSE_MEDIASelectHolder.addEventListener('transitionend', () =>
                        {
                            IIROSE_MEDIASelectHolder.style.zIndex = '-1';
                            const updateDOM = new UpdateDom();
                            updateDOM.changeStatusIIROSE_MEDIA()
                        }, { once: true });

                    };
                }
            });
        }
    }

    private createIIROSE_MEDIASelectHolderItem(item: SelectHolderItem, IIROSE_MEDIASelectHolder: HTMLDivElement)
    {
        const IIROSE_MEDIASelectHolderItemWrapper = document.createElement('div');
        IIROSE_MEDIASelectHolderItemWrapper.classList.add('IIROSE_MEDIASelectHolderItemWrapper');
        IIROSE_MEDIASelectHolderItemWrapper.id = item.id;


        const IIROSE_MEDIASelectHolderItemLogo = document.createElement('div');
        IIROSE_MEDIASelectHolderItemLogo.classList.add('IIROSE_MEDIASelectHolderItemLogo');
        IIROSE_MEDIASelectHolderItemLogo.id = item.id;


        const IIROSE_MEDIASelectHolderItem = document.createElement('div');
        IIROSE_MEDIASelectHolderItem.classList.add('IIROSE_MEDIASelectHolderItem');
        IIROSE_MEDIASelectHolderItem.innerText = item.title;
        IIROSE_MEDIASelectHolderItemWrapper.onclick = () =>
        {
            item.onclick();
            const updateDOM = new UpdateDom();
            updateDOM.changeStatusIIROSE_MEDIA()
            IIROSE_MEDIASelectHolder.style.opacity = '0';
            IIROSE_MEDIASelectHolder.addEventListener('transitionend', () =>
            {
                IIROSE_MEDIASelectHolder.style.zIndex = '-1';
            }, { once: true });
        };

        IIROSE_MEDIASelectHolderItemWrapper.appendChild(IIROSE_MEDIASelectHolderItemLogo);
        IIROSE_MEDIASelectHolderItemWrapper.appendChild(IIROSE_MEDIASelectHolderItem);
        return IIROSE_MEDIASelectHolderItemWrapper;


    }
}