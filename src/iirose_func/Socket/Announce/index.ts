import { PluginSettings } from "../../../settings/pluginSettings/PluginSettings";
import { Socket } from "../index";

/**
 * 点播播报统一入口：三档模式（card 发卡片 / silent 静默 / summary 批量总结）
 * 的唯一判定点。所有平台的 mediaCard 发送都必须经过这里；
 * mediaEvent 是独立的播放触发报文，永不受档位影响，由调用方照常发送。
 */

/** 批量抑制窗口：summary 档批量循环执行期间为 true，循环内跳过逐项卡片 */
let batchSuppressing = false;

export class Announce {
  /** 当前是否应发送 mediaCard（读档位 + 批量抑制窗口） */
  public static shouldSendCard(): boolean {
    const mode = PluginSettings.getPluginSetting().announceMode;
    if (mode === "silent") return false;
    if (batchSuppressing) return false;
    return true;
  }

  /** 档位允许时才发送媒体卡片；mediaEvent 由调用方自行照发 */
  public static sendMediaCard(socket: Socket, mediacard: string): void {
    if (!Announce.shouldSendCard()) return;
    socket.send(mediacard);
  }

  /**
   * 批量点播播报入口：summary 档且 count ≥ 2 时，先发一条总结消息
   * （`\*` 独立一行 + 正文行「已点播《标题》共 N 项」），再在抑制窗口内
   * 执行 loop；否则直接执行 loop。
   * 总结先于循环发送；循环中单项失败不回收总结，仍按现状各自提示。
   */
  public static async runBatchAnnounce(
    title: string,
    count: number,
    loop: () => Promise<void> | void,
  ): Promise<void> {
    const mode = PluginSettings.getPluginSetting().announceMode;
    if (mode !== "summary" || count < 2) {
      await loop();
      return;
    }

    // 报文必须经 JSON.stringify 构造，换行/反斜杠才能以 \n、\\* 合法转义嵌入
    const content = "\\*" + "\n" + `已点播《${title}》共 ${count} 项`;
    new Socket().sendMessage(content);

    batchSuppressing = true;
    try {
      await loop();
    } finally {
      batchSuppressing = false;
    }
  }
}
