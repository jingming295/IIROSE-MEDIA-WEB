import {
  AnnounceMode,
  PluginSettings,
} from "../../../settings/pluginSettings/PluginSettings";
import { ShowMessage } from "../../ShowMessage";
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

/**
 * 打开中的批量窗口的入口档位快照栈，与 batchDepth 同步入栈/出栈。
 * 窗口只在 summary 档开启，故栈内快照恒为 summary；逐卡判定只消费快照，
 * 不读实时档位——批次中途切档不影响进行中的批次（CAP-3）。
 */
const batchModeSnapshots: AnnounceMode[] = [];

/**
 * 单曲强制放行窗口深度：>0 表示有手动点播的单曲正在发送。
 * 手动点播入口（MOD/MVOD/@直链等）用 runSingleAnnounce 包住发送动作，
 * 声明「我是手动点播」——批量抑制窗口挂起时其卡片仍照常发送（CAP-1）。
 * 静默档优先于单曲窗口。
 */
let forceDepth = 0;

export class Announce {
  /** 当前是否应发送 mediaCard（判定序：静默档 → 单曲窗口 → 批量快照 → 实时档位） */
  public static shouldSendCard(): boolean {
    const mode = PluginSettings.getPluginSetting().announceMode;
    if (mode === "silent") return false;
    if (forceDepth > 0) return true;
    if (batchDepth > 0) {
      // 消费入口快照：summary 批次执行中切到 card，本批剩余曲目仍不逐个发卡片
      return batchModeSnapshots[batchDepth - 1] !== "summary";
    }
    return true;
  }

  /** 档位允许时才发送媒体卡片；mediaEvent 由调用方自行照发 */
  public static sendMediaCard(socket: Socket, mediacard: string): void {
    if (!Announce.shouldSendCard()) return;
    socket.send(mediacard);
  }

  /**
   * 单曲点播窗口：手动点播单曲的入口用这个包住发送（或整个点播动作），
   * try/finally 开关 forceDepth，使其卡片不被并行的批量抑制窗口吞掉。
   * 窗口越窄越好：能只包发送动作就不要包整个网络请求过程。
   */
  public static async runSingleAnnounce(
    loop: () => Promise<void> | void,
  ): Promise<void> {
    forceDepth++;
    try {
      await loop();
    } finally {
      forceDepth--;
    }
  }

  /**
   * 批量点播播报入口：summary 档且 count ≥ 2 时，先发一条总结消息，再在抑制
   * 窗口内执行 loop；否则直接执行 loop。
   * 消息格式（宿站 markdown）：首行 `\\\*`（三反斜杠+星号）触发 markdown，
   * 第二行「🎵 已提交点播 **《标题》**，共 **N** 项」，平台有简介时再附一行 blockquote。
   * 总结先于循环发送；循环中单项失败由平台层逐项 catch 提示并跳过，
   * 逐项 catch 之外的异常走本函数的兜底 catch：终止本批、提示一次、不上抛。
   */
  public static async runBatchAnnounce(
    title: string,
    count: number,
    loop: () => Promise<void> | void,
    description?: string | null,
  ): Promise<void> {
    try {
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
      batchModeSnapshots.push(mode);
      try {
        await loop();
      } finally {
        batchDepth--;
        batchModeSnapshots.pop();
      }
    } catch (error) {
      // 兜底 catch：消除 void 调用点的 unhandled rejection，终止本批并提示一次
      Announce.showBatchItemError(error);
    }
  }

  /**
   * 批量点播单项失败的公开提示入口：平台层逐项 catch 与本模块兜底 catch 共用。
   * 同因 10 秒窗口去重（模式同 SendFetch.showNeteaseFailure）：
   * 一次大批量多曲同因失败只提示一次，避免逐曲刷屏。
   */
  private static batchItemErrorToastAt = 0;
  private static batchItemErrorToastMessage = "";

  public static showBatchItemError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const now = Date.now();
    if (
      message === Announce.batchItemErrorToastMessage &&
      now - Announce.batchItemErrorToastAt < 10000
    )
      return;
    Announce.batchItemErrorToastMessage = message;
    Announce.batchItemErrorToastAt = now;
    ShowMessage.show(message);
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
