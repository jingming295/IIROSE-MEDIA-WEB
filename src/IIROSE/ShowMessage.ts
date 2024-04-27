
declare global {
    interface Window {
        _alert?: (message: string) => void;
    }
}

export class showMessage{

    public showMessage(message:string){
        if(!window._alert) return
        window._alert(message)
    }
}