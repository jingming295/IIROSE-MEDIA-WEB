import { beforeAll, describe, expect, it } from "vitest";
import { FavoritesStorageService } from "../FavoritesStorageService";

/**
 * 墓碑物理清理的两条守卫：
 * - 满 30 天才清理；
 * - 「云端可能已有副本」时，只清理**已同步**（dirty=false）的墓碑，
 *   否则未上传的删除会被云端活记录复活。
 *
 * purgeTombstones 挂在每次写事务上，正常测试流程不会构造出墓碑，这里直接摆数据再触发 add()。
 */
const DB_NAME = "IIROSE_MEDIA_DB";
const UID = "6e3f0a1b2c4d5";
const DAY = 24 * 60 * 60 * 1000;

function openRaw(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME);
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

function tombstone(key: string, ageDays: number, dirty: boolean) {
  const createdAt = Date.now() - ageDays * DAY - 1000;
  return {
    id: `${UID}|netease:song:${key}`,
    ownerUid: UID,
    platform: "netease",
    type: "song",
    title: key,
    coverImg: "",
    author: "",
    websiteUrl: "",
    createdAt,
    updatedAt: createdAt,
    deletedAt: createdAt + 500,
    dirty,
    platformData: {
      title: key,
      coverImg: "",
      author: "",
      websiteUrl: "",
    },
  };
}

function favorite(index: number): PlatformData {
  return {
    title: `新收藏 ${index}`,
    coverImg: "",
    author: "",
    websiteUrl: `https://music.163.com/song?id=${9000 + index}`,
    neteaseMusic: { id: 9000 + index, fee: 0 },
  } as PlatformData;
}

async function putRaw(records: any[]): Promise<void> {
  const db = await openRaw();
  const tx = db.transaction("favorites", "readwrite");
  for (const record of records) tx.objectStore("favorites").put(record);
  await new Promise<void>((resolve) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
  db.close();
}

beforeAll(async () => {
  (globalThis as any).window.uid = UID;
  localStorage.clear();
  await new Promise<void>((resolve) => {
    const del = window.indexedDB.deleteDatabase(DB_NAME);
    del.onsuccess = () => resolve();
    del.onerror = () => resolve();
    del.onblocked = () => resolve();
  });
  await FavoritesStorageService.init();
});

describe("墓碑清理", () => {
  it("云端可能有副本时：只清理已同步的过期墓碑，未同步的保留", async () => {
    localStorage.setItem(
      "imwPluginSetting",
      JSON.stringify({ sync: { enabled: false, salt: "salt" } }),
    );
    await putRaw([
      tombstone("expired-synced", 31, false),
      tombstone("expired-dirty", 31, true),
      tombstone("fresh-synced", 1, false),
    ]);

    await FavoritesStorageService.add(favorite(1));

    const db = await openRaw();
    const ids = (await readAll(db)).map((r) => r.id);
    db.close();

    expect(ids).not.toContain(`${UID}|netease:song:expired-synced`);
    // 未同步的过期墓碑必须留着，否则会被云端活记录复活
    expect(ids).toContain(`${UID}|netease:song:expired-dirty`);
    expect(ids).toContain(`${UID}|netease:song:fresh-synced`);
    expect(ids).toContain(`${UID}|netease:song:9001`);
  });

  it("云端确认没有副本时：未同步的过期墓碑也一并清理", async () => {
    // 从未启用过同步：没有 salt / lastSyncAt / enabled，云端不可能有副本
    localStorage.setItem("imwPluginSetting", JSON.stringify({ sync: {} }));

    await FavoritesStorageService.add(favorite(2));

    const db = await openRaw();
    const ids = (await readAll(db)).map((r) => r.id);
    db.close();

    expect(ids).not.toContain(`${UID}|netease:song:expired-dirty`);
    expect(ids).toContain(`${UID}|netease:song:fresh-synced`);
    expect(ids).toContain(`${UID}|netease:song:9002`);
  });
});
