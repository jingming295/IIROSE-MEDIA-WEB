import { PluginSettings } from "../../../settings/pluginSettings/PluginSettings";
import { Socket } from "../index";

/**
 * 点播播报统一入口：三档模式（card 发卡片 / silent 静默 / summary 批量总结）
 * 的唯一判定点。所有平台的 mediaCard 发送都必须经过这里；
 * mediaEvent 是独立的播放触发报文，永不受档位影响，由调用方照常发送。
 */

/**
 * 批量抑制窗口深度：>0 表示仍有批量循环在执行（多批可交错），
 * 循环内跳过逐项卡片。用深度计数而非单布尔：先结束的一批只递减自己的深度，
 * 不会把仍在执行的另一批的窗口提前关掉。
 */
let batchDepth = 0;

export class Announce {
  /** 当前是否应发送 mediaCard（读档位 + 批量抑制窗口） */
  public static shouldSendCard(): boolean {
    const mode = PluginSettings.getPluginSetting().announceMode;
    if (mode === "silent") return false;
    if (batchDepth > 0) return false;
    return true;
  }

  /** 档位允许时才发送媒体卡片；mediaEvent 由调用方自行照发 */
  public static sendMediaCard(socket: Socket, mediacard: string): void {
    if (!Announce.shouldSendCard()) return;
    socket.send(mediacard);
  }

  /**
   * 批量点播播报入口：summary 档且 count ≥ 2 时，先发一条总结消息，再在抑制
   * 窗口内执行 loop；否则直接执行 loop。
   * 消息格式（宿站 markdown）：首行 `\\\*`（三反斜杠+星号）触发 markdown，
   * 第二行「🎵 已点播 **《标题》**，共 **N** 项」，平台有简介时再附一行 blockquote。
   * 总结先于循环发送；循环中单项失败不回收总结，仍按现状各自提示。
   */
  public static async runBatchAnnounce(
    title: string,
    count: number,
    loop: () => Promise<void> | void,
    description?: string | null,
  ): Promise<void> {
    const mode = PluginSettings.getPluginSetting().announceMode;
    if (mode !== "summary" || count < 2) {
      await loop();
      return;
    }

    // 报文必须经 JSON.stringify 构造，换行/反斜杠才能以 \n、\\* 合法转义嵌入；
    // 标题经净化（剥 HTML/转义 md 元字符/trim），空标题兜底为通用措辞
    const safeTitle = Announce.sanitizeText(title) || "批量点播";
    const lines = [
      "\\\\\\*",
      // 「已提交」而非「已点播」：无版权跳过、分集解析失败会让实际播放数 < N，不用确定语气
      `🎵 已提交点播 **《${safeTitle}》**，共 **${count}** 项`,
    ];
    const quote = Announce.buildDescriptionQuote(description);
    if (quote) lines.push(quote);
    new Socket().sendMessage(lines.join("\n"));

    batchDepth++;
    try {
      await loop();
    } finally {
      batchDepth--;
    }
  }

  /**
   * 文本净化：剥 HTML 标签（B 站 desc 常含 <br> 等）、压平换行为单行、
   * 转义 markdown 元字符（*_`）防止打乱总结消息排版、去首尾空白。
   */
  private static sanitizeText(raw: string): string {
    if (!raw) return "";
    return raw
      .replace(/<[^>]*>/g, " ")
      .replace(/\s*\n+\s*/g, " ")
      .replace(/([*_`])/g, "\\$1")
      .trim();
  }

  /**
   * 集合简介整理为单行 blockquote；空白简介返回空串（不带详情行）。
   * 按码点截断（防 emoji 被劈成孤立代理项），119 码点 + 省略号保证总长 ≤120。
   */
  private static buildDescriptionQuote(description?: string | null): string {
    if (!description) return "";
    const flat = Announce.sanitizeText(description);
    if (!flat) return "";
    const cps = Array.from(flat);
    const clipped = cps.length > 119 ? cps.slice(0, 119).join("") + "…" : flat;
    return `> ${clipped}`;
  }
}
