declare const socket: WebSocket | undefined;

export class Socket{
    

    public sendMessage(data: string) {
        if (!window.WebSocket) return;
        if(socket){
            socket.send(data);
        }
    }
}
