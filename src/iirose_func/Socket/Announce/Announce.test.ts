import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Announce } from "./index";
import { Socket } from "../index";
import { PluginSettings } from "../../../settings/pluginSettings/PluginSettings";

/**
 * 点播播报三档模式的矩阵行覆盖。
 * 矩阵出处：_bmad-output/implementation-artifacts/spec-request-announce-modes.md
 * 的 frozen 块「I/O & Edge-Case Matrix」（human-owned intent，行为以此为准）：
 * 默认/老用户回退 card、静默不发卡片、summary 单曲发卡片、
 * summary 批量 ≥2 仅一条总结消息、总结报文合法 JSON（\n 转义）、设置持久化读取。
 */

const sendMock = vi.fn<(data: string) => void>();

function setMode(raw: unknown) {
  localStorage.setItem(
    "imwPluginSetting",
    JSON.stringify({ announceMode: raw }),
  );
}

beforeEach(() => {
  localStorage.clear();
  (window as unknown as Record<string, unknown>).WebSocket =
    function WebSocket() {};
  (window as unknown as Record<string, unknown>).socket = { send: sendMock };
  sendMock.mockClear();
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).socket;
  delete (window as unknown as Record<string, unknown>).WebSocket;
});

describe("announceMode 归一化（默认/老用户回退发卡片）", () => {
  it("未设置 announceMode 读取回退 card", () => {
    localStorage.setItem("imwPluginSetting", JSON.stringify({}));
    expect(PluginSettings.getPluginSetting().announceMode).toBe("card");
  });

  it("非法值一律回退 card；合法值原样保留", () => {
    setMode("loud");
    expect(PluginSettings.getPluginSetting().announceMode).toBe("card");
    setMode(undefined);
    expect(PluginSettings.getPluginSetting().announceMode).toBe("card");
    setMode("silent");
    expect(PluginSettings.getPluginSetting().announceMode).toBe("silent");
    setMode("summary");
    expect(PluginSettings.getPluginSetting().announceMode).toBe("summary");
  });

  it("设置持久化：写入什么档位，重新读取仍是什么档位", () => {
    setMode("summary");
    expect(PluginSettings.getPluginSetting().announceMode).toBe("summary");
  });
});

describe("shouldSendCard / sendMediaCard（按档位决定是否发卡片）", () => {
  it("card 档：发送卡片", () => {
    setMode("card");
    Announce.sendMediaCard(new Socket(), "CARD");
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith("CARD");
  });

  it("silent 档：不发送卡片（mediaEvent 由调用方照发，不受档位影响）", () => {
    setMode("silent");
    expect(Announce.shouldSendCard()).toBe(false);
    Announce.sendMediaCard(new Socket(), "CARD");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("summary 档默认（无批量窗口）：单曲点播仍发卡片", () => {
    setMode("summary");
    expect(Announce.shouldSendCard()).toBe(true);
    Announce.sendMediaCard(new Socket(), "CARD");
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});

describe("runBatchAnnounce（批量点播播报）", () => {
  it("card 档批量 ≥2：不总结，循环内外卡片照发（与现状一致）", async () => {
    setMode("card");
    let inLoop = false;
    await Announce.runBatchAnnounce("歌单", 5, async () => {
      inLoop = Announce.shouldSendCard();
    });
    expect(inLoop).toBe(true);
    expect(Announce.shouldSendCard()).toBe(true);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("silent 档批量：循环内不发卡片，也不发总结", async () => {
    setMode("silent");
    let inLoop = true;
    await Announce.runBatchAnnounce("歌单", 5, async () => {
      inLoop = Announce.shouldSendCard();
    });
    expect(inLoop).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("summary 档批量 ≥2：先发一条总结消息，循环内抑制卡片，结束后恢复", async () => {
    setMode("summary");
    let inLoop = true;
    await Announce.runBatchAnnounce("冬日歌单", 5, async () => {
      inLoop = Announce.shouldSendCard();
    });
    // 仅一条总结消息，无逐曲卡片
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(inLoop).toBe(false);
    expect(Announce.shouldSendCard()).toBe(true);
  });

  it("总结报文：合法 JSON，解析后 m 为 \\\* 独行 + 正文行（换行经 \\n 转义）", async () => {
    setMode("summary");
    await Announce.runBatchAnnounce("冬日歌单", 5, async () => {});
    const raw = sendMock.mock.calls[0][0];
    const parsed = JSON.parse(raw) as { m: string; mc: string; i: string };
    // 首行为宿站 markdown 触发写法：三个反斜杠 + 星号
    expect(parsed.m).toBe("\\\\\\*\n🎵 已点播 **《冬日歌单》**，共 **5** 项");
    expect(parsed.m.split("\n")[0]).toBe("\\\\\\*");
    expect(parsed.m.split("\n")[1]).toBe(
      "🎵 已点播 **《冬日歌单》**，共 **5** 项",
    );
    // 无简介时正文只有两行，不带详情行
    expect(parsed.m.split("\n")).toHaveLength(2);
    // 封套契约：mc 颜色固定，i 为字符串形态（宿站对该字段类型兼容未验证，钉住形状）
    expect(parsed.mc).toBe("008000");
    expect(typeof parsed.i).toBe("string");
    // 原始报文里不允许出现裸换行
    expect(raw).not.toMatch(/\n/);
  });

  it("总结附简介：平台有详细介绍时以 blockquote 追加为第三行", async () => {
    setMode("summary");
    await Announce.runBatchAnnounce(
      "冬日歌单",
      5,
      async () => {},
      "第一行简介\n\n第二行简介",
    );
    const parsed = JSON.parse(sendMock.mock.calls[0][0]) as { m: string };
    const lines = parsed.m.split("\n");
    expect(lines).toHaveLength(3);
    // 简介压平为单行 blockquote
    expect(lines[2]).toBe("> 第一行简介 第二行简介");
  });

  it("简介超长按码点截断（emoji 不劈代理对，总长 ≤120）；空白简介不带详情行", async () => {
    setMode("summary");
    await Announce.runBatchAnnounce("歌单", 2, async () => {}, "a".repeat(150));
    let parsed = JSON.parse(sendMock.mock.calls[0][0]) as { m: string };
    // 119 码点 + 省略号 = 120 字符，与冻结矩阵「≤120」一致
    expect(parsed.m.split("\n")[2]).toBe(`> ${"a".repeat(119)}…`);

    // emoji 跨截断点不产生孤立代理项
    await Announce.runBatchAnnounce(
      "歌单",
      2,
      async () => {},
      "x" + "🎵".repeat(130),
    );
    parsed = JSON.parse(sendMock.mock.calls[1][0]) as { m: string };
    expect(parsed.m.split("\n")[2]).toBe(`> x${"🎵".repeat(118)}…`);

    await Announce.runBatchAnnounce("歌单", 2, async () => {}, "  \n  ");
    parsed = JSON.parse(sendMock.mock.calls[2][0]) as { m: string };
    expect(parsed.m.split("\n")).toHaveLength(2);
  });

  it("简介/标题净化：剥 HTML 标签、转义 markdown 元字符", async () => {
    setMode("summary");
    await Announce.runBatchAnnounce(
      "歌单",
      2,
      async () => {},
      "第一行<br>第二行 **加粗**",
    );
    let parsed = JSON.parse(sendMock.mock.calls[0][0]) as { m: string };
    // <br> 剥为空格、md 元字符转义，不破坏 blockquote 排版
    expect(parsed.m.split("\n")[2]).toBe("> 第一行 第二行 \\*\\*加粗\\*\\*");

    // 标题里的 md 元字符同样转义，不破坏 **《...》** 包裹
    await Announce.runBatchAnnounce("*星*号", 2, async () => {});
    parsed = JSON.parse(sendMock.mock.calls[1][0]) as { m: string };
    expect(parsed.m.split("\n")[1]).toBe(
      "🎵 已点播 **《\\*星\\*号》**，共 **2** 项",
    );
  });

  it("summary 档批量 count=2 边界（<2 判定的唯一边界）：仍发总结并抑制", async () => {
    setMode("summary");
    let inLoop = true;
    await Announce.runBatchAnnounce("双曲歌单", 2, async () => {
      inLoop = Announce.shouldSendCard();
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(inLoop).toBe(false);
    expect(Announce.shouldSendCard()).toBe(true);
  });

  it("summary 档单曲（count=1）：不总结、不抑制，仍发卡片", async () => {
    setMode("summary");
    let inLoop = false;
    await Announce.runBatchAnnounce("单曲", 1, async () => {
      inLoop = Announce.shouldSendCard();
    });
    expect(inLoop).toBe(true);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("循环抛异常时 finally 关闭抑制窗口", async () => {
    setMode("summary");
    await expect(
      Announce.runBatchAnnounce("歌单", 3, async () => {
        throw new Error("单项失败");
      }),
    ).rejects.toThrow("单项失败");
    expect(Announce.shouldSendCard()).toBe(true);
  });

  it("空标题兜底：标题为空串/undefined/纯空白时正文使用「批量点播」", async () => {
    setMode("summary");
    await Announce.runBatchAnnounce("", 2, async () => {});
    await Announce.runBatchAnnounce(
      undefined as unknown as string,
      2,
      async () => {},
    );
    // 纯空白串是 truthy，不能绕过 trim 兜底
    await Announce.runBatchAnnounce("   ", 2, async () => {});
    const first = JSON.parse(sendMock.mock.calls[0][0]) as { m: string };
    const second = JSON.parse(sendMock.mock.calls[1][0]) as { m: string };
    const third = JSON.parse(sendMock.mock.calls[2][0]) as { m: string };
    const expected = "\\\\\\*\n🎵 已点播 **《批量点播》**，共 **2** 项";
    expect(first.m).toBe(expected);
    expect(second.m).toBe(expected);
    expect(third.m).toBe(expected);
  });

  it("并发批量回归：后启动的一批先结束，先启动批量的剩余部分仍被抑制", async () => {
    setMode("summary");
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let inRestOfFirst = true;

    // 第一批：进入 loop 后挂起（窗口深度 1）。runBatchAnnounce 的同步前缀
    // （发总结、深度 +1）在调用返回前就已执行完，无需额外让步。
    const first = Announce.runBatchAnnounce("歌单A", 3, async () => {
      await firstGate;
      inRestOfFirst = Announce.shouldSendCard();
    });

    // 第二批完成时第一批仍在执行：旧的单布尔实现会在此把窗口整个关掉
    const second = Announce.runBatchAnnounce("歌单B", 2, async () => {});
    await second;

    releaseFirst();
    await first;

    expect(inRestOfFirst).toBe(false);
    expect(Announce.shouldSendCard()).toBe(true);
    // 两个批量各一条总结，无逐曲卡片
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});
