import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GDStudioOnlineMusicPlatformAPI as API } from "./index";
import { ShowMessage } from "../../iirose_func/ShowMessage";

const id = "track+part==";
let show: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.useFakeTimers();
  show = vi.spyOn(ShowMessage, "show").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// 真实 sendGet 适配器必须把取消传给 fetch，而非仅结束外层 Promise。
function pendingFetch() {
  const request = vi.fn(
    (_url: string, options: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        options.signal!.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      }),
  );
  vi.stubGlobal("fetch", request);
  return request;
}

describe("结构化取流真实适配器", () => {
  it("精确传入端点、查询参数与编码后的曲目ID", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ url: "https://media.example/audio", br: 128 }),
        ),
      );
    vi.stubGlobal("fetch", request);
    expect(await API.resolvePlayback(id)).toMatchObject({
      ok: true,
      trackId: id,
      bitrateKbps: 128,
    });
    expect(request).toHaveBeenCalledExactlyOnceWith(
      "https://music-api.gdstudio.xyz/api.php?types=url&source=joox&id=track%2Bpart%3D%3D&br=320",
      expect.objectContaining({
        method: "GET",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(show).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["caller", "timeout"])(
    "%s 取消传播到 fetch 且保持静默",
    async (reason) => {
      const request = pendingFetch();
      const controller = new AbortController();
      const operation = API.resolvePlayback(id, controller.signal);
      const signal = request.mock.calls[0][1].signal!;
      expect(signal.aborted).toBe(false);
      if (reason === "caller") controller.abort();
      else await vi.advanceTimersByTimeAsync(6000);
      expect(await operation).toMatchObject({ ok: false, kind: "timeout" });
      expect(signal.aborted).toBe(true);
      expect(show).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});

describe("歌词真实适配器兼容性", () => {
  it("查询参数与 signal 原样转发，返回非空歌词", async () => {
    const data = { lyric: "[00:01.00]原文", tlyric: "[00:01.00]译文" };
    const request = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(data)));
    vi.stubGlobal("fetch", request);
    const controller = new AbortController();
    expect(
      await API.getLyric("joox", id, {
        signal: controller.signal,
        warn: false,
      }),
    ).toEqual(data);
    expect(request).toHaveBeenCalledExactlyOnceWith(
      "https://music-api.gdstudio.xyz/api.php?types=lyric&source=joox&id=track%2Bpart%3D%3D",
      expect.objectContaining({ signal: controller.signal }),
    );
    expect(show).not.toHaveBeenCalled();
  });

  it("warn=false 的取消传给 fetch 且不产生提示或 rejection", async () => {
    const request = pendingFetch();
    const controller = new AbortController();
    const operation = API.getLyric("joox", id, {
      signal: controller.signal,
      warn: false,
    });
    expect(request.mock.calls[0][1].signal).toBe(controller.signal);
    controller.abort();
    await expect(operation).resolves.toBeUndefined();
    expect(request.mock.calls[0][1].signal!.aborted).toBe(true);
    expect(show).not.toHaveBeenCalled();
  });

  it.each(["http", "network", "json"])(
    "warn=false 静默处理 %s 失败",
    async (kind) => {
      const request = vi.fn();
      if (kind === "network")
        request.mockRejectedValue(new TypeError("network"));
      else
        request.mockResolvedValue(
          new Response("invalid json", { status: kind === "http" ? 500 : 200 }),
        );
      vi.stubGlobal("fetch", request);
      await expect(
        API.getLyric("joox", id, { warn: false }),
      ).resolves.toBeUndefined();
      expect(show).not.toHaveBeenCalled();
    },
  );

  it("省略 options 时仍向调用方抛出 JSON 解析错误", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("invalid json")),
    );
    await expect(API.getLyric("joox", id)).rejects.toBeInstanceOf(SyntaxError);
    expect(show).not.toHaveBeenCalled();
  });
});
