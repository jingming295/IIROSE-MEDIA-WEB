export class MediaContainerGesture
{
    constructor(private ShowOrHideIMC: () => Promise<void>) { }

    startX = 0;
    startY = 0;
    currentPage = 1;
    totalPage = 1;
    changecurrentPage = (page: number) => { page }

    handleStart(e: TouchEvent | MouseEvent, currentPage: number, totalPage: number, changecurrentPage: (page: number) => void)
    {
        this.currentPage = currentPage;
        this.totalPage = totalPage;
        this.changecurrentPage = changecurrentPage;

        if (e instanceof TouchEvent)
        {
            this.startX = e.touches[0].clientX;
            this.startY = e.touches[0].clientY;
            window.addEventListener("touchmove", this.handleMove);
            window.addEventListener("touchend", this.handleEnd);
        }
        else if (e instanceof MouseEvent)
        {
            this.startX = e.clientX;
            this.startY = e.clientY;
            window.addEventListener("mousemove", this.handleMove);
            window.addEventListener("mouseup", this.handleEnd);
        }
    }

    handleMove = (e: TouchEvent | MouseEvent) =>
    {
        let currentX = 0;
        let currentY = 0;

        if (e instanceof TouchEvent)
        {
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
        }
        else if (e instanceof MouseEvent)
        {
            currentX = e.clientX;
            currentY = e.clientY;
        }

        const diffX = currentX - this.startX;
        const diffY = currentY - this.startY;

        // 检查垂直位移是否超过水平位移的 1/3
        if (Math.abs(diffY) > Math.abs(diffX) / 3)
        {
            this.handleEnd(); // 取消事件监听，避免触发翻页
            return;
        }

        // 判断滑动是否超过 100 像素
        if (Math.abs(diffX) > 50)
        {
            if (diffX > 0)
            {
                // 右滑动（从左向右）
                if (this.currentPage > 1)
                {
                    this.changecurrentPage(this.currentPage - 1);
                }
                else
                {
                    this.ShowOrHideIMC();
                }
            }
            else
            {
                // 左滑动（从右向左）
                if (this.currentPage < this.totalPage)
                {
                    this.changecurrentPage(this.currentPage + 1);
                }
            }

            // 触发后立即解绑
            this.handleEnd();
        }
    }

    handleEnd = () =>
    {
        // 移除 touchmove 和 touchend 事件监听器
        window.removeEventListener("touchmove", this.handleMove);
        window.removeEventListener("touchend", this.handleEnd);

        // 移除 mousemove 和 mouseup 事件监听器
        window.removeEventListener("mousemove", this.handleMove);
        window.removeEventListener("mouseup", this.handleEnd);
    }
}