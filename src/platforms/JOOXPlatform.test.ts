import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JOOXPlatform } from "./JOOXPlatform";
import { GDStudioOnlineMusicPlatformAPI as API } from "../Api/GD-Studio's-Online-Music-Platform-API";
import { ParseMediaMetaData } from "../tools/parseMediaMetaData";
import { Socket } from "../iirose_func/Socket";
import { ShowMessage } from "../iirose_func/ShowMessage";
import { Announce } from "../iirose_func/Socket/Announce";

const item = (id = "a") =>
  ({
    title: "测试曲",
    author: "作者",
    coverImg: "https://cover.example/image",
    websiteUrl: "https://source.example/song",
    joox: { id, isSong: true },
  }) as unknown as PlatformData;
const success = (
  url = "https://media.example/a",
  bitrateKbps: number | undefined = 128,
) => ({
  ok: true as const,
  channel: "aggregate" as const,
  trackId: "a",
  urls: [url],
  preview: "unknown" as const,
  bitrateKbps,
});
let sent: string[];
let show: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sent = [];
  vi.spyOn(Socket.prototype, "send").mockImplementation((data) => {
    sent.push(data);
  });
  vi.spyOn(Socket.prototype, "sendMessage").mockImplementation(() => {});
  show = vi.spyOn(ShowMessage, "show").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const events = () => sent.filter((s) => s.startsWith("&1"));
const cards = () => sent.filter((s) => !s.startsWith("&1"));
const lyrics = () =>
  vi.spyOn(API, "getLyric").mockResolvedValue({ lyric: "", tlyric: "" });

describe("整个点播操作矩阵", () => {
  it.each(["card", "silent", "summary"])(
    "%s：同曲并发只取流、检查、提交一次，结束后可再次点播",
    async (mode) => {
      localStorage.setItem(
        "imwPluginSetting",
        JSON.stringify({ announceMode: mode }),
      );
      const resolve = vi
        .spyOn(API, "resolvePlayback")
        .mockResolvedValue(success());
      const probe = vi
        .spyOn(ParseMediaMetaData, "getAudioDuration")
        .mockResolvedValue(269);
      const lyric = lyrics();
      await Promise.all([JOOXPlatform.MOD(item()), JOOXPlatform.MOD(item())]);
      expect(resolve).toHaveBeenCalledTimes(1);
      expect(probe).toHaveBeenCalledTimes(1);
      expect(lyric).toHaveBeenCalledTimes(1);
      expect(events()).toHaveLength(1);
      expect(cards()).toHaveLength(mode === "silent" ? 0 : 1);
      if (mode !== "silent") expect(JSON.parse(cards()[0]).m).toMatch(/>128$/);
      expect(JSON.parse(events()[0].slice(2))).toMatchObject({
        d: 269,
        s: "s://media.example/a",
      });
      expect(show).not.toHaveBeenCalled();
      await JOOXPlatform.MOD(item());
      expect(resolve).toHaveBeenCalledTimes(2);
      expect(events()).toHaveLength(2);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each([
    [{ url: " ", br: -1 }, "未取得播放链接"],
    [
      { url: "https://media.example/a", node_is_preview: true, duration: 58 },
      "试听",
    ],
    [{ refrain_url: "https://media.example/preview" }, "试听"],
    [{ code: 9009002 }, "返回异常"],
  ])(
    "真实解析归一化：%j 不重试、不检查、不提交，只提示一次",
    async (data, message) => {
      lyrics();
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(data)));
      vi.stubGlobal("fetch", fetchMock);
      const probe = vi.spyOn(ParseMediaMetaData, "getAudioDuration");
      await Promise.all([JOOXPlatform.MOD(item()), JOOXPlatform.MOD(item())]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(probe).not.toHaveBeenCalled();
      expect(sent).toHaveLength(0);
      expect(show).toHaveBeenCalledTimes(1);
      expect(show).toHaveBeenCalledWith(expect.stringContaining(message));
    },
  );

  it("非JSON失败也只提示一次", async () => {
    lyrics();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("html")));
    await JOOXPlatform.MOD(item());
    expect(sent).toHaveLength(0);
    expect(show).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])("媒体失败只刷新一次，第二候选成功=%s", async (ok) => {
    lyrics();
    const resolve = vi
      .spyOn(API, "resolvePlayback")
      .mockResolvedValueOnce(success())
      .mockResolvedValueOnce(success("https://media.example/b"));
    const probe = vi
      .spyOn(ParseMediaMetaData, "getAudioDuration")
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(ok ? 269 : 0);
    await JOOXPlatform.MOD(item());
    expect(resolve).toHaveBeenCalledTimes(2);
    expect(probe).toHaveBeenCalledTimes(2);
    expect(events()).toHaveLength(ok ? 1 : 0);
    expect(show).toHaveBeenCalledTimes(ok ? 0 : 1);
  });

  it("刷新相同URL不重复探测", async () => {
    lyrics();
    const resolve = vi
      .spyOn(API, "resolvePlayback")
      .mockResolvedValue(success());
    const probe = vi
      .spyOn(ParseMediaMetaData, "getAudioDuration")
      .mockResolvedValue(0);
    await JOOXPlatform.MOD(item());
    expect(resolve).toHaveBeenCalledTimes(2);
    expect(probe).toHaveBeenCalledTimes(1);
    expect(events()).toHaveLength(0);
    expect(show).toHaveBeenCalledTimes(1);
  });

  it("独立完整时长269秒与实际58秒不符时拒绝", async () => {
    lyrics();
    vi.spyOn(API, "resolvePlayback").mockResolvedValue({
      ...success(),
      expectedDurationSeconds: 269,
    });
    vi.spyOn(ParseMediaMetaData, "getAudioDuration").mockResolvedValue(58);
    await JOOXPlatform.MOD(item());
    expect(events()).toHaveLength(0);
    expect(show).toHaveBeenCalledTimes(1);
  });

  it.each(["reject", "hang"])(
    "歌词%s不阻塞有效音频，取消后用空歌词",
    async (kind) => {
      let signal!: AbortSignal;
      vi.spyOn(API, "getLyric").mockImplementation((_source, _id, options) => {
        signal = options!.signal!;
        return kind === "reject"
          ? Promise.reject(new Error("歌词失败"))
          : new Promise(() => {});
      });
      vi.spyOn(API, "resolvePlayback").mockResolvedValue({
        ...success(),
        bitrateKbps: undefined,
      });
      vi.spyOn(ParseMediaMetaData, "getAudioDuration").mockResolvedValue(269);
      await JOOXPlatform.MOD(item());
      expect(JSON.parse(events()[0].slice(2)).l).toBe("");
      expect(JSON.parse(cards()[0]).m).toMatch(/>$/);
      expect(show).not.toHaveBeenCalled();
      expect(signal.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("挂起解析在6秒取消，迟到成功不能发送", async () => {
    lyrics();
    let finish!: (r: Response) => void;
    let signal!: AbortSignal;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, options) => {
        signal = options.signal;
        return new Promise((r) => {
          finish = r;
        });
      }),
    );
    const operation = JOOXPlatform.MOD(item());
    await vi.advanceTimersByTimeAsync(6000);
    await operation;
    expect(signal.aborted).toBe(true);
    expect(show).toHaveBeenCalledTimes(1);
    finish(new Response(JSON.stringify({ url: "https://media.example/a" })));
    await vi.runAllTimersAsync();
    expect(sent).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("20秒截止清理真实探测资源；迟到媒体回调不能提交", async () => {
    lyrics();
    const audios: {
      src: string;
      duration: number;
      onloadedmetadata: (() => void) | null;
      onerror: (() => void) | null;
      removeAttribute: ReturnType<typeof vi.fn>;
      load: ReturnType<typeof vi.fn>;
    }[] = [];
    vi.stubGlobal(
      "Audio",
      class {
        src = "";
        duration = 269;
        onloadedmetadata = null;
        onerror = null;
        removeAttribute = vi.fn(() => {
          this.src = "";
        });
        load = vi.fn();
        constructor() {
          audios.push(this);
        }
      },
    );
    const resolve = vi
      .spyOn(API, "resolvePlayback")
      .mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 4000));
        return success(`https://media.example/${Date.now()}`);
      });
    const operation = JOOXPlatform.MOD(item());
    await vi.advanceTimersByTimeAsync(5000);
    const late = audios[0].onloadedmetadata!;
    await vi.advanceTimersByTimeAsync(15000);
    await operation;
    late();
    expect(resolve).toHaveBeenCalledTimes(2);
    expect(audios).toHaveLength(2);
    for (const audio of audios) {
      expect(audio.src).toBe("");
      expect(audio.onloadedmetadata).toBeNull();
      expect(audio.load).toHaveBeenCalledTimes(1);
    }
    expect(sent).toHaveLength(0);
    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith(expect.stringContaining("超时"));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("不同曲目的并发操作不合并", async () => {
    lyrics();
    const resolve = vi
      .spyOn(API, "resolvePlayback")
      .mockResolvedValue(success());
    vi.spyOn(ParseMediaMetaData, "getAudioDuration").mockResolvedValue(269);
    await Promise.all([
      JOOXPlatform.MOD(item("a")),
      JOOXPlatform.MOD(item("b")),
    ]);
    expect(resolve).toHaveBeenCalledTimes(2);
    expect(events()).toHaveLength(2);
  });

  it("明确限流跨曲冷却，每次操作只有一条剩余时间提示", async () => {
    const lyric = lyrics();
    const request = vi.fn().mockResolvedValue(
      new Response("{}", {
        status: 429,
        headers: { "Retry-After": "60" },
      }),
    );
    vi.stubGlobal("fetch", request);
    await Promise.all([JOOXPlatform.MOD(item()), JOOXPlatform.MOD(item())]);
    await vi.advanceTimersByTimeAsync(1000);
    await JOOXPlatform.MOD(item("b"));
    expect(request).toHaveBeenCalledTimes(1);
    expect(events()).toHaveLength(0);
    expect(show).toHaveBeenCalledTimes(2);
    expect(show).toHaveBeenLastCalledWith(expect.stringContaining("59 秒"));
    expect(lyric).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60000);
  });

  it("单曲网络等待不放行批量卡片，提交窗口仍遵守单曲语义", async () => {
    localStorage.setItem(
      "imwPluginSetting",
      JSON.stringify({ announceMode: "summary" }),
    );
    lyrics();
    let finish!: (value: ReturnType<typeof success>) => void;
    vi.spyOn(API, "resolvePlayback").mockReturnValue(
      new Promise((r) => {
        finish = r;
      }),
    );
    vi.spyOn(ParseMediaMetaData, "getAudioDuration").mockResolvedValue(269);
    await Announce.runBatchAnnounce("集合", 2, async () => {
      const operation = JOOXPlatform.MOD(item());
      expect(Announce.shouldSendCard()).toBe(false);
      Announce.sendMediaCard(new Socket(), "批量卡片");
      finish(success());
      await operation;
      expect(Announce.shouldSendCard()).toBe(false);
    });
    expect(cards()).toHaveLength(1);
    expect(events()).toHaveLength(1);
    expect(sent).not.toContain("批量卡片");
  });
});
