import { Utils } from "../IIROSE/Utils";
import { InputEvent } from "./MediaContainerInterface";

export class IIROSE_MEDIAInput {

    public showIIROSE_MEDIAInput(inputEvent: InputEvent) {

        const utils = new Utils();
        utils.sync(2, [inputEvent.title, 'none', 10000], inputEvent.InputAreaConfirmBtnOnClick)
        
    }
}