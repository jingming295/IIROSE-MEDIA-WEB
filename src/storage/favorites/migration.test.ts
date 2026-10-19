import { beforeAll, describe, expect, it } from "vitest";
import { FavoritesStorageService } from "../FavoritesStorageService";

/**
 * v1 → v3 原地升级。这条分支在正常开发流程里永远跑不到：干净的测试库直接建 v3，
 * 只有真实老用户升级才会触发 onupgradeneeded。这里用 fake-indexeddb 造一个 v1 库，
 * 再让服务走一次 init()，验证老收藏不丢、字段补齐、主键加上归属前缀。
 */
const DB_NAME = "IIROSE_MEDIA_DB";
const UID = "6e3f0a1b2c4d5";

function openRaw(version?: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = version
      ? window.indexedDB.open(DB_NAME, version)
      : window.indexedDB.open(DB_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readAll(db: IDBDatabase): Promise<any[]> {
  return new Promise((resolve) => {
    const tx = db.transaction("favorites", "readonly");
    const req = tx.objectStore("favorites").getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

beforeAll(async () => {
  (globalThis as any).window.uid = UID;

  // 造一个 v1 库：逻辑主键、无 updatedAt/dirty/ownerUid、无 v3 索引
  await new Promise<void>((resolve) => {
    const del = window.indexedDB.deleteDatabase(DB_NAME);
    del.onsuccess = () => resolve();
    del.onerror = () => resolve();
    del.onblocked = () => resolve();
  });

  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore("favorites", {
        keyPath: "id",
      });
      store.createIndex("platform", "platform", { unique: false });
      store.createIndex("type", "type", { unique: false });
      store.createIndex("platform_type", ["platform", "type"], {
        unique: false,
      });
      store.createIndex("createdAt", "createdAt", { unique: false });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const createdAt = 1_700_000_000_000;
  const tx = db.transaction("favorites", "readwrite");
  tx.objectStore("favorites").put({
    id: "netease:song:old1",
    platform: "netease",
    type: "song",
    title: "旧收藏 A",
    coverImg: "http://p1.music.126.net/a.jpg",
    author: "旧作者",
    websiteUrl: "https://music.163.com/song?id=101",
    createdAt,
    platformData: {
      title: "旧收藏 A",
      coverImg: "http://p1.music.126.net/a.jpg",
      author: "旧作者",
      websiteUrl: "https://music.163.com/song?id=101",
    },
  });
  tx.objectStore("favorites").put({
    id: "netease:song:old2",
    platform: "netease",
    type: "song",
    title: "旧收藏 B",
    coverImg: "",
    author: "旧作者",
    websiteUrl: "https://music.163.com/song?id=102",
    createdAt: createdAt + 1000,
    platformData: {
      title: "旧收藏 B",
      coverImg: "",
      author: "旧作者",
      websiteUrl: "https://music.163.com/song?id=102",
    },
  });
  await new Promise<void>((resolve) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
  db.close();

  // 触发升级：服务内部以 v3 打开同一个库
  await FavoritesStorageService.init();
});

describe("v1 → v3 原地升级", () => {
  it("老收藏全部保留，并按当前账号加归属前缀", async () => {
    const db = await openRaw();
    const all = await readAll(db);
    db.close();

    expect(all).toHaveLength(2);
    expect(all.map((r) => r.id).sort()).toEqual([
      `${UID}|netease:song:old1`,
      `${UID}|netease:song:old2`,
    ]);
    for (const record of all) {
      expect(record.ownerUid).toBe(UID);
      expect(record.title).toMatch(/^旧收藏 [AB]$/);
    }
  });

  it("补齐同步字段：updatedAt 回填为 createdAt，dirty 置真", async () => {
    const db = await openRaw();
    const all = await readAll(db);
    db.close();

    const a = all.find((r) => r.id.endsWith("old1"));
    const b = all.find((r) => r.id.endsWith("old2"));
    expect(a.updatedAt).toBe(a.createdAt);
    expect(b.updatedAt).toBe(b.createdAt);
    expect(a.dirty).toBe(true);
    expect(b.dirty).toBe(true);
  });

  it("升级后库版本为 3，且补齐 v3 索引", async () => {
    const db = await openRaw();
    expect(db.version).toBe(3);
    const tx = db.transaction("favorites", "readonly");
    const names = [...tx.objectStore("favorites").indexNames];
    db.close();
    expect(names).toEqual(expect.arrayContaining(["deletedAt", "ownerUid"]));
  });
});
