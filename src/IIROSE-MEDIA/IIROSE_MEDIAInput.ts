import { Utils } from "../IIROSE/Utils";
import { InputEvent } from "./MediaContainerInterface";

export class IIROSE_MEDIAInput {

    public showIIROSE_MEDIAInput(inputEvent: InputEvent) {

        const utils = new Utils();
        utils.sync(2, [inputEvent.title, 'none', 10000], inputEvent.InputAreaConfirmBtnOnClick)

        const syncHolder = document.getElementById('syncHolder')

        if(syncHolder){
            const syncHolderOutside = document.createElement('div')
            syncHolderOutside.id = 'syncHolderOutside'
            syncHolderOutside.onclick = () => {
                const syncPromptHolder = syncHolder.childNodes[0]
                const contentItemBtn = syncPromptHolder.childNodes[3]
                const cancelBtn = contentItemBtn.childNodes[0] as HTMLButtonElement
                if(cancelBtn) cancelBtn.click()
            }
            syncHolder.appendChild(syncHolderOutside)
        }
    }
}