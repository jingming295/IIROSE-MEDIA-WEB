import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizePlayback } from "./playback";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => {
  vi.useRealTimers();
});

async function resolver() {
  vi.resetModules();
  return (await import("./playback")).resolveAggregatePlayback;
}

const response = (data: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers });

describe("聚合响应门禁", () => {
  it.each([
    [{ url: "  ", br: -1 }, "empty_url"],
    [
      {
        url: "https://media.example/test",
        node_is_preview: true,
        duration: 58,
      },
      "preview_only",
    ],
    [{ refrain_url: "https://media.example/preview" }, "preview_only"],
    [{ url: "http://media.example/test" }, "invalid_response"],
    [{ url: "javascript:void(0)" }, "invalid_response"],
    [{ url: "https://user:secret@media.example/test" }, "invalid_response"],
    [{ url: 123 }, "invalid_response"],
    [[], "invalid_response"],
    [{ code: 9009002, url: "https://media.example/test" }, "invalid_response"],
    [{ code: 429 }, "rate_limited"],
  ])("拒绝异常响应 %j", (data, kind) => {
    expect(normalizePlayback(data, "track")).toMatchObject({ ok: false, kind });
  });

  it("原聚合完整性未知，保留实际码率但不采信自身时长", () => {
    expect(
      normalizePlayback(
        { url: "https://media.example/test", br: 128, duration: 58 },
        "track",
      ),
    ).toEqual({
      ok: true,
      trackId: "track",
      channel: "aggregate",
      urls: ["https://media.example/test"],
      preview: "unknown",
      bitrateKbps: 128,
    });
    expect(
      normalizePlayback({ url: "https://media.example/test", br: -1 }, "track"),
    ).not.toHaveProperty("bitrateKbps");
  });
});

describe("解析预算与通道冷却", () => {
  it.each([
    ["12", 12000],
    ["Thu, 01 Jan 1970 00:00:30 GMT", 30000],
    ["invalid", 60000],
    ["-1", 60000],
    [undefined, 60000],
  ])("HTTP 429 的 Retry-After %s 跨曲生效", async (header, ms) => {
    const resolve = await resolver();
    const request = vi
      .fn()
      .mockResolvedValue(
        response({}, 429, header ? { "Retry-After": header } : {}),
      );
    expect(await resolve("a", request)).toMatchObject({
      kind: "rate_limited",
      retryAfterMs: ms,
    });
    await vi.advanceTimersByTimeAsync(1000);
    expect(await resolve("b", request)).toMatchObject({
      retryAfterMs: ms - 1000,
    });
    expect(request).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(ms);
    await resolve("b", request);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("业务429进入默认冷却；未知失败码保留而不猜原因", async () => {
    const resolve = await resolver();
    expect(
      await resolve("a", async () => response({ code: 9009002 })),
    ).toMatchObject({ kind: "invalid_response", upstreamCode: 9009002 });
    expect(
      await resolve("a", async () => response({ code: 429 })),
    ).toMatchObject({ kind: "rate_limited", retryAfterMs: 60000 });
    const request = vi.fn();
    await resolve("b", request);
    expect(request).not.toHaveBeenCalled();
  });

  it("非JSON与网络异常分别分类", async () => {
    const resolve = await resolver();
    expect(await resolve("a", async () => new Response("html"))).toMatchObject({
      kind: "invalid_response",
    });
    expect(
      await resolve("a", async () => {
        throw new TypeError("network");
      }),
    ).toMatchObject({ kind: "transport_error" });
    expect(await resolve("a", async () => null)).toMatchObject({
      kind: "transport_error",
    });
  });

  it.each([false, true])(
    "6秒取消挂起的请求或响应体（body=%s）",
    async (body) => {
      const resolve = await resolver();
      let signal!: AbortSignal;
      const operation = resolve("a", async (s) => {
        signal = s;
        if (body)
          return {
            ok: true,
            status: 200,
            json: () => new Promise(() => {}),
          } as Response;
        return new Promise(() => {});
      });
      await vi.advanceTimersByTimeAsync(6000);
      expect(await operation).toMatchObject({ kind: "timeout" });
      expect(signal.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("外层取消立即结束，迟到429不污染冷却", async () => {
    const resolve = await resolver();
    const controller = new AbortController();
    let finish!: (r: Response) => void;
    const operation = resolve(
      "a",
      () =>
        new Promise((r) => {
          finish = r;
        }),
      controller.signal,
    );
    controller.abort();
    expect(await operation).toMatchObject({ kind: "timeout" });
    finish(response({}, 429));
    await Promise.resolve();
    expect(await resolve("b", async () => response({ url: "" }))).toMatchObject(
      { kind: "empty_url" },
    );
    expect(vi.getTimerCount()).toBe(0);
  });
});
