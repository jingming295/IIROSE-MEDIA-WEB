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
    ["Thursday, 01-Jan-70 00:00:30 GMT", 30000],
    ["Thu Jan  1 00:00:30 1970", 30000],
    ["Thu Jan 01 00:00:30 1970", 30000],
    ["1970-01-01T00:00:30Z", 60000],
    ["01/01/1970", 60000],
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

  it("并发429乱序返回时，较短冷却不覆盖已有较长截止时间", async () => {
    const resolve = await resolver();
    let finishFirst!: (value: Response) => void;
    let finishSecond!: (value: Response) => void;
    const first = resolve(
      "a",
      () =>
        new Promise((r) => {
          finishFirst = r;
        }),
    );
    const second = resolve(
      "b",
      () =>
        new Promise((r) => {
          finishSecond = r;
        }),
    );
    finishSecond(response({}, 429, { "Retry-After": "120" }));
    expect(await second).toMatchObject({ retryAfterMs: 120000 });
    await vi.advanceTimersByTimeAsync(1000);
    finishFirst(response({}, 429, { "Retry-After": "10" }));
    expect(await first).toMatchObject({ retryAfterMs: 119000 });
    const request = vi.fn().mockResolvedValue(response({ url: "" }));
    await vi.advanceTimersByTimeAsync(10000);
    expect(await resolve("c", request)).toMatchObject({ retryAfterMs: 109000 });
    expect(request).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(109000);
    expect(await resolve("c", request)).toMatchObject({ kind: "empty_url" });
    expect(request).toHaveBeenCalledTimes(1);
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
