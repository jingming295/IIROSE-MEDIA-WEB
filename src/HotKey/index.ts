import { UpdateDom } from "../UpdateDOM/index";

export class HotKey
{
    startY: number = 0;
    constructor()
    {
        this.KeyBoardCallApp = this.KeyBoardCallApp.bind(this);
        window.addEventListener("keydown", this.KeyBoardCallApp);
        window.addEventListener("touchstart", this.handleTouchStart);
        window.addEventListener("touchmove", this.handleTouchMove);
    }

    handleTouchStart(event: TouchEvent)
    {
        if (event.touches.length === 2)
        {
            this.startY = event.touches[0].clientY;
        }
    }

    handleTouchMove(event: TouchEvent)
    {
        if (event.touches.length === 2)
        {
            if(this.startY === 0) return;
            const deltaY = event.touches[0].clientY - this.startY;
            const screenHeight = window.innerHeight;
            const threshold = screenHeight / 3;
            if (deltaY > threshold)
            {
                this.startY = 0
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                const UpdateDOM = new UpdateDom();
                UpdateDOM.changeStatusIIROSE_MEDIA();
            }
        }
    }


    KeyBoardCallApp(event: KeyboardEvent)
    {
        // 检查是否按下 Alt 键同时按下了 S 键，macos 下的 S 键是 ß 键
        if ((event.altKey && event.key === 's') || (event.altKey && event.key === 'ß'))
        {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            const focusedElement = document.activeElement as HTMLElement;
            if (focusedElement && focusedElement.tagName === 'TEXTAREA')
            {
                focusedElement.blur();
            }
            const UpdateDOM = new UpdateDom();
            UpdateDOM.changeStatusIIROSE_MEDIA();
        }
    }

    // 清除事件监听器
    destroy()
    {
        window.removeEventListener("keydown", this.KeyBoardCallApp);
        // window.removeEventListener("touchstart", this.touchScreen);
    }
}

