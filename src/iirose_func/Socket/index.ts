declare const socket: WebSocket | undefined;

export class Socket {
  /** 报文观察钩子：只读旁路，不改变发送行为（用于按房间缓存播放报文）。 */
  public static observe?: (data: string) => void;

  public send(data: string) {
    if (!window.WebSocket) return;
    if (socket) {
      socket.send(data);
      // 旁路观察：记录失败不能影响发送本身。
      try {
        Socket.observe?.(data);
      } catch {
        /* 观察者异常按忽略处理 */
      }
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
