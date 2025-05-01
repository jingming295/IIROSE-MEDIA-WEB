/**
 * @description 他的功能是向windows 注册一个event listener，以监听触屏
 */
export class Gesture
{
    startY: number = 0;

    ShowHideMainApp: () => void;

    constructor(ShowHideMainApp: () => void)
    {
        this.ShowHideMainApp = ShowHideMainApp;
    }

    public IMCActiveEventHandler = (event: MouseEvent | TouchEvent): void =>
    {
        event.stopImmediatePropagation();
        if (event instanceof TouchEvent)
        {
            this.handleTouchStart(event);
        }
    }

    public touchEnd = (): void =>
    {
        this.startY = 0;
        window.removeEventListener("touchmove", this.handleTouchMove.bind(this));
    }

    public handleTouchStart = (event: TouchEvent) =>
    {
        if (event.touches.length === 2)
        {
            this.startY = event.touches[0].clientY;
            window.addEventListener("touchmove", this.handleTouchMove.bind(this));
        }
    }

    private handleTouchMove = (event: TouchEvent) =>
    {
        if (event.touches.length === 2)
        {
            if (this.startY === 0) return;
            const deltaY = event.touches[0].clientY - this.startY;
            const screenHeight = window.innerHeight;
            const threshold = screenHeight / 5;
            if (deltaY > threshold)
            {
                this.startY = 0;
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                this.ShowHideMainApp();
            }
        }
    }
}