declare const socket: WebSocket | undefined;

export class Socket {
  public send(data: string) {
    if (!window.WebSocket) return;
    if (socket) {
      socket.send(data);
    }
  }

  public sendMessage(data: string) {
    if (!window.WebSocket) return;
    if (socket) {
      // i 保持旧报文的字符串形态（原模板内插产出的就是字符串），
      // 宿站对该字段类型的兼容未验证，不随 JSON.stringify 改造改变形状
      socket.send(
        JSON.stringify({ m: data, mc: "008000", i: String(Date.now()) }),
      );
    }
  }
}
