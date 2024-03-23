import { UpdateDom } from "../UpdateDOM/index";

export class HotKey
{
    constructor()
    {
        this.KeyBoardCallApp = this.KeyBoardCallApp.bind(this);
        window.addEventListener("keydown", this.KeyBoardCallApp);
        window.addEventListener("touchstart", this.touchScreen);
    }

    KeyBoardCallApp(event: KeyboardEvent)
    {
        // 检查是否按下 Alt 键同时按下了 S 键
        if (event.altKey && event.key === 's')
        {
            console.log('Alt + S 被按下');
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            const focusedElement = document.activeElement as HTMLElement;
            if (focusedElement && focusedElement.tagName === 'TEXTAREA')
            {
                focusedElement.blur();
                const UpdateDOM = new UpdateDom();
                UpdateDOM.changeStatusIIROSE_MEDIA();
            }
        }
    }

    touchScreen(event:TouchEvent){
        if (event.touches && event.touches.length === 2) {
            const screenHeight = window.innerHeight;
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const minY = Math.min(touch1.clientY, touch2.clientY);
            const maxY = Math.max(touch1.clientY, touch2.clientY);
    
            // 计算触摸点之间的垂直距离
            const verticalDistance = maxY - minY;
    
            // 判断是否向下滑动了 1/3 屏幕
            if (verticalDistance > screenHeight / 3) {
                console.log('双指向下滑超过 1/3 屏幕');
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                const focusedElement = document.activeElement as HTMLElement;
                if (focusedElement && focusedElement.tagName === 'TEXTAREA')
                {
                    focusedElement.blur();
                    const UpdateDOM = new UpdateDom();
                    UpdateDOM.changeStatusIIROSE_MEDIA();
                }
            }
        }
    }

    // 清除事件监听器
    destroy()
    {
        window.removeEventListener("keydown", this.KeyBoardCallApp);
        window.removeEventListener("touchstart", this.touchScreen);
    }
}