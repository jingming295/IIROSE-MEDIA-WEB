export class ShowMessage
{

    public static show(message: string)
    {
        if (!window._alert) return
        window._alert(message)
    }
}