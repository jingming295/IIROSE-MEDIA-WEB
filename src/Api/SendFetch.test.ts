import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../iirose_func/ShowMessage", () => ({
  ShowMessage: { show: vi.fn() },
}));

import { SendFetch } from "./index";

/**
 * `sendGet`/`sendPost` 接受的是 `Headers` 实例，而 `Headers` 没有可枚举自有
 * 属性——早先用 `{...headers}` 展开会把调用方设置的头全部丢光（含统一入口
 * 透传的 content-type），且不会有任何报错。这两条用例钉住真实到达 fetch 的
 * 头，防止再次退化成「静默不发送」。
 */
describe("SendFetch：请求头合并", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sendGet 把 Headers 里的自定义头带到 fetch，并保留 Origin", async () => {
    const headers = new Headers();
    headers.set("x-probe", "get");

    await (SendFetch as any).sendGet(
      "https://example.com/api",
      new URLSearchParams("q=1"),
      headers,
    );

    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe("GET");
    expect(init.headers["x-probe"]).toBe("get");
    expect(init.headers.Origin).toBe("https://iirose.com");
  });

  it("sendPost 把 Headers 里的 content-type 带到 fetch，并保留 Origin", async () => {
    const headers = new Headers();
    headers.set("content-type", "application/x-www-form-urlencoded");
    headers.set("x-probe", "post");

    await (SendFetch as any).sendPost(
      "https://example.com/api",
      new URLSearchParams("a=1"),
      headers,
    );

    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe("POST");
    expect(init.headers["content-type"]).toBe(
      "application/x-www-form-urlencoded",
    );
    expect(init.headers["x-probe"]).toBe("post");
    expect(init.headers.Origin).toBe("https://iirose.com");
  });
});
