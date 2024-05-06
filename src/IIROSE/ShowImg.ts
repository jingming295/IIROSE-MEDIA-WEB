export class ShowImage
{

    public show(e: string, t?: boolean)
    {
        console.log(e);
        if (!window.showImg) return;
        window.showImg(e, t);
    }

    public hide()
    {
        if (window.Objs && window.Utils)
        {
            window.Objs.repertory.albumShowHolder.stop().fadeOut(125, function ()
            {
                if (window.Objs && window.Utils && window.Constant)
                {
                    window.Utils.imgReady.set(window.Objs.repertory.albumShow),
                        window.Objs.repertory.albumShow.style.width = window.Objs.repertory.albumShow.style.height = "",
                        (window.Objs.repertory.albumShow.style.transform || window.Constant.Others.transform) != window.Constant.Others.transform && window.Objs.repertory.albumShow.resetScroll();
                }
            });
            window.Objs.repertory.albumShowHolderAnimate.css("transform", "scale(0.9)");
        }
    }

}