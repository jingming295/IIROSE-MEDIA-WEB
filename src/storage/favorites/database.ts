// src/storage/favorites/database.ts
// 收藏库的 IndexedDB 生命周期与账号归属：
// 打开/原地升级、ID 缓存、内存降级、延迟归属。
// 业务读写（add/remove/query）留在 FavoritesStorageService，这里只提供底层状态与操作。
import type { FavoriteRecord } from "../FavoritesStorageService";
import {
  currentValidUid,
  isUnowned,
  logicalIdOf,
  storageId as toStorageId,
} from "./recordUtils";

export const DB_NAME = "IIROSE_MEDIA_DB";
export const STORE_NAME = "favorites";
export const DB_VERSION = 3;

/** 收藏库的全部可变状态（页面生命周期内单例） */
export const dbState = {
  dbPromise: null as Promise<IDBDatabase | null> | null,
  /** 非墓碑记录的**存库主键**集合（含归属前缀；按当前归属取用时再拼前缀） */
  cachedIds: new Set<string>(),
  isInitialized: false,
  /** 内存降级缓存（当环境不支持或限制 IndexedDB 时），键同为存库主键 */
  memoryFallback: new Map<string, FavoriteRecord>(),
  useFallback: false,
};

/**
 * 初始化并打开数据库
 */
export async function openDatabase(): Promise<IDBDatabase | null> {
  if (dbState.dbPromise) {
    return dbState.dbPromise;
  }

  if (typeof window === "undefined" || !window.indexedDB) {
    console.warn("[FavoritesStorage] IndexedDB 不可用，切换至内存临时存储");
    dbState.useFallback = true;
    dbState.isInitialized = true;
    return null;
  }

  dbState.dbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const target = event.target as IDBOpenDBRequest;
        const db = target.result;
        const tx = target.transaction;
        const oldVersion = (event as unknown as IDBVersionChangeEvent)
          .oldVersion;

        // 原地升级：已有 object store 时只加字段与索引，绝不重建或清空
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
          });
          objectStore.createIndex("platform", "platform", { unique: false });
          objectStore.createIndex("type", "type", { unique: false });
          objectStore.createIndex("platform_type", ["platform", "type"], {
            unique: false,
          });
          objectStore.createIndex("createdAt", "createdAt", { unique: false });
          objectStore.createIndex("deletedAt", "deletedAt", { unique: false });
          objectStore.createIndex("ownerUid", "ownerUid", { unique: false });
          return;
        }

        const objectStore = tx ? tx.objectStore(STORE_NAME) : null;
        if (!objectStore) return;

        if (!objectStore.indexNames.contains("deletedAt")) {
          objectStore.createIndex("deletedAt", "deletedAt", { unique: false });
        }
        if (!objectStore.indexNames.contains("ownerUid")) {
          objectStore.createIndex("ownerUid", "ownerUid", { unique: false });
        }

        if (oldVersion < 3) {
          // v1 记录补同步字段（updatedAt=createdAt、dirty=true）；
          // v2 记录按账号隔离：主键改为 `<ownerUid>|<逻辑主键>`，归属取升级当刻有效的
          // window.uid。**uid 无效时不写归属**（保持未归属），由 attributeUnowned()
          // 在首次出现有效 uid 时一次性归给该 uid。
          const needsSyncFields = oldVersion < 2;
          const owner = currentValidUid();
          const migrated: FavoriteRecord[] = [];
          const cursorRequest = objectStore.openCursor();
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (!cursor) {
              // 游标结束后统一重写，避免游标访问到刚写入的新键
              for (const record of migrated) {
                objectStore.put(record);
              }
              return;
            }
            const record = cursor.value as FavoriteRecord;
            const logicalId = isUnowned(record)
              ? record.id
              : logicalIdOf(record.id);
            const next: FavoriteRecord = { ...record };
            if (needsSyncFields) {
              const createdAt =
                typeof record.createdAt === "number"
                  ? record.createdAt
                  : Date.now();
              next.createdAt = createdAt;
              next.updatedAt = createdAt;
              next.dirty = true;
            }
            if (owner) {
              next.id = toStorageId(owner, logicalId);
              next.ownerUid = owner;
            } else {
              delete next.ownerUid;
            }
            if (next.id !== record.id) {
              cursor.delete();
            }
            migrated.push(next);
            cursor.continue();
          };
        }
      };

      request.onsuccess = async () => {
        const db = request.result;
        dbState.isInitialized = true;
        // 加载初始 ID 缓存
        await refreshIdCache(db);
        resolve(db);
      };

      request.onerror = (e) => {
        console.error("[FavoritesStorage] 打开 IndexedDB 失败:", e);
        dbState.useFallback = true;
        dbState.isInitialized = true;
        resolve(null as any);
      };
    } catch (err) {
      console.error("[FavoritesStorage] IndexedDB 初始化异常:", err);
      dbState.useFallback = true;
      dbState.isInitialized = true;
      resolve(null as any);
    }
  });

  return dbState.dbPromise;
}

/**
 * 刷新全部收藏的 ID 缓存（墓碑视为未收藏，不进入缓存）
 */
export async function refreshIdCache(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const objectStore = tx.objectStore(STORE_NAME);
      const req = objectStore.openCursor();
      const ids = new Set<string>();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          dbState.cachedIds = ids;
          resolve();
          return;
        }
        const record = cursor.value as FavoriteRecord;
        if (!record.deletedAt) ids.add(record.id);
        cursor.continue();
      };
      req.onerror = () => {
        resolve();
      };
    } catch {
      resolve();
    }
  });
}

/** 从内存降级缓存重建 ID 缓存（墓碑同样跳过） */
export function rebuildFallbackIdCache(): void {
  dbState.cachedIds = new Set(
    Array.from(dbState.memoryFallback.values())
      .filter((record) => !record.deletedAt)
      .map((record) => record.id),
  );
}

/** 读取全部存库记录（含墓碑、含所有归属，主键为存库主键） */
export async function readAll(): Promise<FavoriteRecord[]> {
  if (dbState.useFallback) {
    return Array.from(dbState.memoryFallback.values()).map((record) => ({
      ...record,
    }));
  }
  const db = await dbState.dbPromise;
  if (!db) {
    return Array.from(dbState.memoryFallback.values()).map((record) => ({
      ...record,
    }));
  }
  return new Promise<FavoriteRecord[]>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const objectStore = tx.objectStore(STORE_NAME);
      const req = objectStore.getAll();
      req.onsuccess = () => resolve((req.result as FavoriteRecord[]) || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * 需要当前账号作用域的操作入口：先打开数据库，再完成一次「延迟归属」。
 */
export async function ensureOwnerScope(): Promise<void> {
  await openDatabase();
  await attributeUnowned();
}

/**
 * 延迟归属：把升级时「未归属」的遗留记录一次性归给当前账号并落库。
 * 只在首次出现有效 uid 时发生一次（归属后记录带上 ownerUid，之后不会再被归走）；
 * 无有效 uid（游客/未登录）时不做任何事。
 */
export async function attributeUnowned(): Promise<void> {
  const owner = currentValidUid();
  if (!owner) return;

  const all = await readAll();
  const unowned = all.filter((record) => isUnowned(record));
  if (unowned.length === 0) return;

  const owned = new Map(
    all
      .filter((record) => !isUnowned(record))
      .map((record) => [record.id, record]),
  );

  // 目标键上可能已经有归属记录：按 updatedAt 做 LWW，绝不用（可能更旧的）未归属记录
  // 覆盖它——例如一条陈旧的墓碑会把活记录覆盖掉，等于收藏凭空消失。
  const removals: string[] = [];
  const writes: FavoriteRecord[] = [];
  for (const record of unowned) {
    const targetId = toStorageId(owner, record.id);
    const occupied = owned.get(targetId);
    const recordTime = record.updatedAt ?? record.createdAt ?? 0;
    const occupiedTime = occupied
      ? (occupied.updatedAt ?? occupied.createdAt ?? 0)
      : -1;
    removals.push(record.id);
    if (occupied) {
      if (occupiedTime >= recordTime) continue; // 既有归属记录更新：保留它
      removals.push(targetId);
    }
    writes.push({ ...record, id: targetId, ownerUid: owner });
  }

  if (dbState.useFallback || !dbState.dbPromise) {
    for (const key of removals) dbState.memoryFallback.delete(key);
    for (const record of writes) dbState.memoryFallback.set(record.id, record);
    rebuildFallbackIdCache();
    return;
  }

  const db = await dbState.dbPromise;
  if (!db) {
    for (const key of removals) dbState.memoryFallback.delete(key);
    for (const record of writes) dbState.memoryFallback.set(record.id, record);
    rebuildFallbackIdCache();
    return;
  }

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const objectStore = tx.objectStore(STORE_NAME);
      for (const key of removals) {
        objectStore.delete(key);
      }
      for (const record of writes) {
        objectStore.put(record);
      }
      tx.oncomplete = () => {
        void refreshIdCache(db).then(() => resolve());
      };
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}
