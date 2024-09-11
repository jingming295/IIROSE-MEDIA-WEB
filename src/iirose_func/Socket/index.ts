declare const socket: WebSocket | undefined;

export class Socket{
    public send(data: string) {
        if (!window.WebSocket) return;
        if(socket){
            socket.send(data);
        }
    }

    public sendMessage(data: string) {
        if (!window.WebSocket) return;
        if(socket){
            const timestamp = new Date().getTime();
            socket.send(`{"m":"${data}","mc":"008000","i":"${timestamp}"}`);
        }
    }
}
