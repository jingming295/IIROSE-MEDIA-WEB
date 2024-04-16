import { InputEvent } from "./MediaContainerInterface";

export class IIROSE_MEDIAInput {
    private inputEvent: InputEvent | null = null;

    public createIIROSE_MEDIAInput()
    {

        function createInputBoxTitle()
        {
            const inputBoxTitleWrapper = document.createElement('div');
            inputBoxTitleWrapper.classList.add('inputBoxTitleWrapper');

            const inputBoxTitleLogo = document.createElement('div');
            inputBoxTitleLogo.classList.add('inputBoxTitleLogo');

            const inputBoxTitle = document.createElement('div');
            inputBoxTitle.classList.add('inputBoxTitle');
            inputBoxTitle.innerHTML = '标题';
            inputBoxTitleWrapper.appendChild(inputBoxTitleLogo);
            inputBoxTitleWrapper.appendChild(inputBoxTitle);
            return inputBoxTitleWrapper;
        }

        function createInputArea(){
            const inputArea = document.createElement('div');
            const inputPlace = document.createElement('input');
            inputArea.classList.add('inputArea');
            inputArea.id = 'inputArea';
            inputPlace.classList.add('inputPlace');
            inputPlace.id = 'inputPlace';
            inputPlace.autocomplete = 'off';
            inputPlace.placeholder = '请输入内容...';

            inputArea.appendChild(inputPlace);


            return inputArea;
        }

        const createButton = () =>{
            const buttonWrapper = document.createElement('div');
            buttonWrapper.classList.add('IIROSE_MEDIA_ButtonWrapper');


            const cancelButtonWrapper = document.createElement('div');
            cancelButtonWrapper.classList.add('IIROSE_MEDIA_ButtonItemWrapper');
            cancelButtonWrapper.id = 'IIROSE_MEDIA_cancelButtonWrapper';

            const cancelIcon = document.createElement('div');
            cancelIcon.classList.add('IIROSE_MEDIA_cancelIcon');

            const cancelButton = document.createElement('div');
            cancelButton.classList.add('IIROSE_MEDIA_Button');
            cancelButton.innerHTML = '取消';

            const confirmButtonWrapper = document.createElement('div');
            confirmButtonWrapper.classList.add('IIROSE_MEDIA_ButtonItemWrapper');
            confirmButtonWrapper.id = 'IIROSE_MEDIA_confirmButtonWrapper';

            const confirmIcon = document.createElement('div');
            confirmIcon.classList.add('IIROSE_MEDIA_confirmIcon');

            const confirmButton = document.createElement('div');
            confirmButton.classList.add('IIROSE_MEDIA_Button');
            confirmButton.innerHTML = '确定';

            cancelButtonWrapper.onclick = this.hideIIROSE_MEDIAInput;
            confirmButtonWrapper.onclick = this.hideIIROSE_MEDIAInput;

            cancelButtonWrapper.appendChild(cancelIcon);
            cancelButtonWrapper.appendChild(cancelButton);
            confirmButtonWrapper.appendChild(confirmIcon);
            confirmButtonWrapper.appendChild(confirmButton);

            buttonWrapper.appendChild(cancelButtonWrapper);
            buttonWrapper.appendChild(confirmButtonWrapper);
            return buttonWrapper;
        }

        const IIROSE_MEDIAInput = document.createElement('div');
        IIROSE_MEDIAInput.id = 'IIROSE_MEDIAInput';
        IIROSE_MEDIAInput.classList.add('IIROSE_MEDIAInput');

        const inputBoxWrapper = document.createElement('div');
        inputBoxWrapper.classList.add('inputBoxWrapper');
        IIROSE_MEDIAInput.onclick = (event) => {
            if(event.target === IIROSE_MEDIAInput){
              this.hideIIROSE_MEDIAInput();
            }
          };

        inputBoxWrapper.appendChild(createInputBoxTitle());
        inputBoxWrapper.appendChild(createInputArea());
        inputBoxWrapper.appendChild(createButton());
        IIROSE_MEDIAInput.appendChild(inputBoxWrapper);

        return IIROSE_MEDIAInput;
    }

    public hideIIROSE_MEDIAInput() {
        const IIROSE_MEDIAInput = document.getElementById('IIROSE_MEDIAInput');
        const cancelButtonWrapper = document.getElementById('IIROSE_MEDIA_cancelButtonWrapper');
        const confirmButtonWrapper = document.getElementById('IIROSE_MEDIA_confirmButtonWrapper');
        if (IIROSE_MEDIAInput) {
            IIROSE_MEDIAInput.style.opacity = '0';

            window.addEventListener('transitionend', () => {
                IIROSE_MEDIAInput.style.zIndex = '-1';
            }, { once: true });

            // 清除 inputEvent
            // this.cleanupInputEvent();
        }
    }

    public showIIROSE_MEDIAInput(inputEvent: InputEvent) {
        this.inputEvent = inputEvent;

        const IIROSE_MEDIAInput = document.getElementById('IIROSE_MEDIAInput');
        if (IIROSE_MEDIAInput) {
            IIROSE_MEDIAInput.style.zIndex = '99999';
            setTimeout(() => {
                IIROSE_MEDIAInput.style.opacity = '1';
            }, 1);
        }

        const inputplace = document.getElementById('inputPlace') as HTMLInputElement;
        if (inputplace) {
            inputplace.value = '';
        }

        const inputBoxTitle = document.querySelector('.inputBoxTitle');
        if (inputBoxTitle) {
            inputBoxTitle.innerHTML = inputEvent.title;
        }

        const inputArea = document.getElementById('inputArea') as HTMLInputElement;

        inputArea.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.inputEvent?.InputAreaConfirmBtnOnClick();
                this.hideIIROSE_MEDIAInput();
            }
        });

        const IIROSE_MEDIA_confirmButtonWrapper = document.getElementById('IIROSE_MEDIA_confirmButtonWrapper');
        if (IIROSE_MEDIA_confirmButtonWrapper) {
            IIROSE_MEDIA_confirmButtonWrapper.onclick = () => {
                this.inputEvent?.InputAreaConfirmBtnOnClick();
                this.hideIIROSE_MEDIAInput();
            };
        }
    }

    public cleanupInputEvent() {
        // 清除 inputEvent
        this.inputEvent = null;

        // 移除事件监听器
        const inputArea = document.getElementById('inputArea') as HTMLInputElement;
        if (inputArea) {
            inputArea.removeEventListener('keydown', this.handleEnterKey);
        }
    }

    private handleEnterKey = (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
            this.inputEvent?.InputAreaConfirmBtnOnClick();
            this.hideIIROSE_MEDIAInput();
        }
    };
}