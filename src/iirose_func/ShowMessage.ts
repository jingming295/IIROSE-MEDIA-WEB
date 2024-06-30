export class ShowMessage
{

    public show(message: string)
    {
        if (!window._alert) return
        window._alert(message)
    }
}