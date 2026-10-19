import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  FavoritesStorageService,
  type FavoriteRecord,
} from "../storage/FavoritesStorageService";
import { PluginSettings } from "../settings/pluginSettings/PluginSettings";
import { SyncCrypto } from "./SyncCrypto";
import { SyncKeyCache } from "./SyncKeyCache";
import { SyncManager } from "./SyncManager";
import { buildSnapshot } from "./SyncMerge";

/**
 * 首次启用两段式的行为验收（CAP-3）：
 * 预览必须是纯读——确认前零 PUT、不置 enabled、不缓存密钥；确认后只发一次 PUT，且不再二次 GET。
 * 这里用真实加解密 + 假 fetch，本地收藏层用 spy 顶掉（与本用例无关）。
 */
const UID = "6e3f0a1b2c4d5";
const PASSPHRASE = "correct horse battery";
const LOCAL_KEY = "imwPluginSetting";

function record(id: string): FavoriteRecord {
  const createdAt = 1_700_000_000_000;
  return {
    id,
    platform: "netease",
    type: "song",
    title: id,
    coverImg: "",
    author: "",
    websiteUrl: "",
    createdAt,
    updatedAt: createdAt,
    platformData: { title: id, coverImg: "", author: "", websiteUrl: "" },
  };
}

/** 云端 3 条（a/b/c，其中 c 与本地重叠）+ 本地 2 条（c/d）→ 合并后 4 条 */
const LOCAL_RECORDS = [record("netease:song:c"), record("netease:song:d")];
const requests: string[] = [];
/** 用例开始前的 window.uid，afterAll 还原，避免污染同进程的其他文件 */
const originalUid = (globalThis as any).window?.uid;
let envelope: Awaited<ReturnType<typeof SyncCrypto.encrypt>>;
let respond: (method: string) => Response | Promise<Response>;

/** 默认的健康后端：GET 回云端快照，其余方法（PUT）回写入成功 */
const healthyRespond = (method: string): Response => {
  if (method === "GET") {
    return new Response(JSON.stringify({ snapshot: envelope }), {
      status: 200,
      headers: { ETag: '"rev-1"' },
    });
  }
  return new Response(
    JSON.stringify({ ok: true, updatedAt: Date.now(), rev: "rev-2" }),
    { status: 200 },
  );
};

beforeAll(async () => {
  (globalThis as any).window.uid = UID;
  localStorage.clear();

  const salt = SyncCrypto.generateSalt();
  const kek = await SyncCrypto.deriveKek(PASSPHRASE, salt, 100_000);
  const { dek, wrapped } = await SyncCrypto.createDek(kek, UID);
  const snapshot = buildSnapshot(
    ["a", "b", "c"].map((id) => record(`netease:song:${id}`)),
    1_700_000_100_000,
  );
  envelope = await SyncCrypto.encrypt({
    dek,
    wrapped,
    uid: UID,
    snapshot,
    updatedAt: snapshot.updatedAt,
    salt,
    iterations: 100_000,
    itemCount: snapshot.items.length,
    writer: SyncCrypto.generateDeviceId(),
  });

  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      const method = (init?.method ?? "GET").toUpperCase();
      requests.push(method);
      return respond(method);
    }),
  );
});

// 配置里开了 restoreMocks：spy 必须在每个用例前重新装（beforeAll 里装的会被还原掉）
beforeEach(() => {
  requests.length = 0;
  // 每条用例都从健康后端起步，避免用例重排后继承上一条自定义的响应
  respond = healthyRespond;
  vi.spyOn(FavoritesStorageService, "getAllForSync").mockResolvedValue([
    ...LOCAL_RECORDS,
  ]);
  vi.spyOn(FavoritesStorageService, "hasDirtyRecords").mockResolvedValue(true);
  vi.spyOn(FavoritesStorageService, "applyRemoteMerge").mockResolvedValue();
});

afterAll(() => {
  SyncManager.disable();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  (globalThis as any).window.uid = originalUid;
});

const count = (method: string) =>
  requests.filter((item) => item === method).length;

describe("首次启用：预览 → 确认", () => {
  it("预览只 GET：算出三个数字，不 PUT、不置 enabled、不缓存密钥", async () => {
    const preview = await SyncManager.previewEnable(PASSPHRASE);

    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.cloudEmpty).toBe(false);
    expect(preview.stats).toEqual({ cloud: 3, local: 2, merged: 4 });

    expect(count("GET")).toBe(1);
    expect(count("PUT")).toBe(0);
    expect(PluginSettings.getPluginSetting().sync.enabled).toBe(false);
    expect(await SyncManager.hasLocalKey()).toBe(false);
    // 纯读：连设置项都没落盘（salt/deviceId/enabled 一律等确认后才写）
    expect(localStorage.getItem(LOCAL_KEY)).toBeNull();
  });

  it("取消：零 PUT，保持未启用，暂存作废", async () => {
    const before = count("PUT");
    SyncManager.cancelEnable();

    expect(count("PUT")).toBe(before);
    expect(PluginSettings.getPluginSetting().sync.enabled).toBe(false);
    // 没有暂存时确认会被拒（说明取消确实清干净了）
    const late = await SyncManager.commitEnable();
    expect(late.ok).toBe(false);
    expect(count("PUT")).toBe(before);
  });

  it("再次预览 → 确认：只有一次 PUT，且不再二次 GET；成功后置 enabled 并缓存密钥", async () => {
    const preview = await SyncManager.previewEnable(PASSPHRASE);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;

    const getsBefore = count("GET");
    const putsBefore = count("PUT");

    const committed = await SyncManager.commitEnable();

    expect(committed.ok).toBe(true);
    expect(committed.stats).toEqual({ cloud: 3, local: 2, merged: 4 });
    // 提示条与确认框必须是同一组数字
    expect(committed.message).toBe("同步完成：云端 3 / 本地 2 / 合并后 4");
    expect(count("PUT")).toBe(putsBefore + 1);
    // 确认后复用预览阶段已解密的快照，不得再发 GET
    expect(count("GET")).toBe(getsBefore);
    expect(PluginSettings.getPluginSetting().sync.enabled).toBe(true);
    // 会话内必须已解锁：面板显示「已解锁」，且后续防抖上传不必再输口令
    expect(SyncManager.getState().unlocked).toBe(true);
    expect(await SyncManager.hasLocalKey()).toBe(true);
    expect(localStorage.getItem(LOCAL_KEY)).toContain('"enabled":true');
  });

  it("云端为空：预览即标 cloudEmpty（无可确认的合并），提交后提示「已同步 N 条」且只 PUT 一次", async () => {
    SyncManager.disable();
    localStorage.clear();
    requests.length = 0;
    respond = () =>
      new Response(JSON.stringify({ snapshot: null }), { status: 200 });

    const preview = await SyncManager.previewEnable(PASSPHRASE);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.cloudEmpty).toBe(true);
    expect(preview.stats).toEqual({ cloud: 0, local: 2, merged: 2 });
    expect(count("PUT")).toBe(0);

    const committed = await SyncManager.commitEnable();
    expect(committed.ok).toBe(true);
    expect(committed.message).toBe("已同步 2 条收藏");
    expect(count("PUT")).toBe(1);
    expect(PluginSettings.getPluginSetting().sync.enabled).toBe(true);
  });

  it("确认后上传失败（503）：保持未启用、作废预览，重试需重新预览", async () => {
    SyncManager.disable();
    localStorage.clear();
    await SyncKeyCache.forget(UID); // 前面用例的成功提交留下过缓存，这里要看「失败不写缓存」
    requests.length = 0;
    respond = (method: string) =>
      method === "GET"
        ? new Response(JSON.stringify({ snapshot: envelope }), { status: 200 })
        : new Response(JSON.stringify({ message: "" }), { status: 503 });

    const preview = await SyncManager.previewEnable(PASSPHRASE);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;

    const committed = await SyncManager.commitEnable();
    expect(committed.ok).toBe(false);
    expect(committed.message).toBe(
      "同步服务暂时不可用；本地收藏不受影响，请稍后重试",
    );
    expect(PluginSettings.getPluginSetting().sync.enabled).toBe(false);
    expect(await SyncManager.hasLocalKey()).toBe(false);

    // 预览已作废：直接再确认会被拒，必须重新预览一次
    const retried = await SyncManager.commitEnable();
    expect(retried.ok).toBe(false);
    expect(count("PUT")).toBe(1);
  });
});

/** 恢复「云端有信封 + PUT 成功」的响应，供后续用例复用 */
function useHealthyCloud(): void {
  respond = (method: string) =>
    method === "GET"
      ? new Response(JSON.stringify({ snapshot: envelope }), {
          status: 200,
          headers: { ETag: '"rev-reset"' },
        })
      : new Response(
          JSON.stringify({ ok: true, updatedAt: Date.now(), rev: "rev-next" }),
          { status: 200 },
        );
}

describe("首次启用：守卫与预览期间的零 PUT", () => {
  it("预览停留期间：防抖上传与立即上传都被拦下，零 PUT，本地收藏不被回写", async () => {
    SyncManager.disable();
    localStorage.clear();
    requests.length = 0;
    useHealthyCloud();

    const preview = await SyncManager.previewEnable(PASSPHRASE);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    const putBefore = count("PUT");

    // 防抖到期后走的就是这个入口：预览待确认期间必须直接返回
    await SyncManager.uploadPendingChanges();
    expect(count("PUT")).toBe(putBefore);

    // 取消后本地收藏原样：预览是纯读，不会把云端合并结果写回本地
    SyncManager.cancelEnable();
    expect(count("PUT")).toBe(putBefore);
    expect(FavoritesStorageService.applyRemoteMerge).not.toHaveBeenCalled();
  });

  it("未登录账号：不发任何请求，直接给出原因", async () => {
    SyncManager.disable();
    localStorage.clear();
    requests.length = 0;
    useHealthyCloud();

    const uid = (globalThis as any).window.uid;
    delete (globalThis as any).window.uid;
    try {
      const preview = await SyncManager.previewEnable(PASSPHRASE);
      expect(preview.ok).toBe(false);
      if (preview.ok) return;
      expect(preview.message).toBe("未登录蔷薇账号，无法启用云端同步");
      expect(requests).toEqual([]);
    } finally {
      (globalThis as any).window.uid = uid;
    }
  });

  it("已在进行中：并发预览被拒绝，且不重复发 GET", async () => {
    SyncManager.disable();
    localStorage.clear();
    requests.length = 0;

    let release: (value: Response) => void = () => {};
    respond = () =>
      new Promise<Response>((resolve) => {
        release = resolve;
      });

    const first = SyncManager.previewEnable(PASSPHRASE);
    // 让第一次预览真正进入 busy（GET 已发出但尚未返回）
    await Promise.resolve();

    const second = await SyncManager.previewEnable(PASSPHRASE);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.message).toBe("同步正在进行，请稍候");
    expect(count("GET")).toBe(1);

    release(
      new Response(JSON.stringify({ snapshot: envelope }), {
        status: 200,
        headers: { ETag: '"rev-concurrent"' },
      }),
    );
    const firstResult = await first;
    expect(firstResult.ok).toBe(true);
    SyncManager.cancelEnable();
  });
});
