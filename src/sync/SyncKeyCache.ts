// src/sync/SyncKeyCache.ts
// 本机密钥缓存：把 DEK 的**不可导出 CryptoKey 句柄**按 uid 存进 IndexedDB，
// 让「刷新后重新进入插件」不必再输口令（crypto-spec.md 第 1.1 节）。
//
// 硬约束（crypto-spec.md 第 6 节）：**只**允许存 extractable:false 的 CryptoKey 句柄，
// 绝不存口令、也绝不存 DEK 的原始字节。读取时再度校验句柄不可导出，任何不匹配即视为无缓存。
//
// 同时缓存 `wrapped`（被 KEK 包裹的 DEK）与 `salt`/`iterations`：这三项都是**公开值**
// （逐字出现在云端信封里），重写信封时必须原样带上，因此与句柄一起放在本机缓存里。
import { SyncCrypto, type SyncWrappedKey } from "./SyncCrypto";

export interface CachedSyncKey {
  /** 归属账号；与当前 uid 不一致即视为无缓存 */
  uid: string;
  /** 与 `wrapped` 配套的 base64 盐 */
  salt: string;
  /** 与 `wrapped` 配套的 PBKDF2 迭代次数 */
  iterations: number;
  /** 不可导出的 DEK 句柄（结构化克隆后仍不可导出） */
  dek: CryptoKey;
  /** 被 KEK 包裹的 DEK；与云端信封里的是同一份公开密文 */
  wrapped: SyncWrappedKey;
  cachedAt: number;
}

export class SyncKeyCache {
  private static readonly DB_NAME = "IIROSE_MEDIA_SYNC_KEYS";
  private static readonly STORE_NAME = "keys";
  private static readonly DB_VERSION = 1;

  private static dbPromise: Promise<IDBDatabase | null> | null = null;
  private static warned = false;

  private static open(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    if (typeof window === "undefined" || !window.indexedDB) {
      return Promise.resolve(null);
    }
    this.dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(this.DB_NAME, this.DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            db.createObjectStore(this.STORE_NAME, { keyPath: "uid" });
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          // 其它上下文要升级/删除这个库时主动让路，避免把对方卡在 blocked
          db.onversionchange = () => {
            db.close();
            this.dbPromise = null;
          };
          resolve(db);
        };
        request.onerror = () => resolve(null);
        // 被其它连接阻塞时不能让 Promise 永远悬着（否则 enable() 永久挂起）
        request.onblocked = () => resolve(null);
      } catch (e) {
        console.warn("[SyncKeyCache] 打开密钥缓存失败:", e);
        resolve(null);
      }
    });
    return this.dbPromise;
  }

  private static async store(
    mode: IDBTransactionMode,
  ): Promise<IDBObjectStore | null> {
    const db = await this.open();
    if (!db) {
      if (!this.warned) {
        this.warned = true;
        console.warn("[SyncKeyCache] IndexedDB 不可用，本机密钥缓存停用");
      }
      return null;
    }
    try {
      return db.transaction(this.STORE_NAME, mode).objectStore(this.STORE_NAME);
    } catch (e) {
      console.warn("[SyncKeyCache] 打开密钥缓存事务失败:", e);
      return null;
    }
  }

  /** 读出当前 uid 的 DEK 句柄；uid 不匹配、字段缺失或句柄可导出都视为无缓存 */
  public static async get(uid: string): Promise<CachedSyncKey | null> {
    if (!uid) return null;
    const store = await this.store("readonly");
    if (!store) return null;
    const record = await new Promise<CachedSyncKey | undefined>((resolve) => {
      try {
        const req = store.get(uid);
        req.onsuccess = () => resolve(req.result as CachedSyncKey | undefined);
        req.onerror = () => resolve(undefined);
      } catch {
        resolve(undefined);
      }
    });
    if (!record || record.uid !== uid) return null;
    if (typeof record.salt !== "string" || !record.salt) return null;
    if (!Number.isInteger(record.iterations)) return null;
    if (!SyncCrypto.isValidWrapped(record.wrapped)) return null;
    const dek = record.dek as CryptoKey | undefined;
    if (!dek || typeof dek !== "object") return null;
    if (dek.extractable !== false) return null;
    if (typeof dek.usages === "undefined") return null;
    return record;
  }

  /** 写入（覆盖）当前 uid 的句柄与公开包裹参数 */
  public static async set(entry: CachedSyncKey): Promise<void> {
    const store = await this.store("readwrite");
    if (!store) return;
    await new Promise<void>((resolve) => {
      try {
        const req = store.put({ ...entry, cachedAt: Date.now() });
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch (e) {
        console.warn("[SyncKeyCache] 写入本机密钥缓存失败:", e);
        resolve();
      }
    });
  }

  /** 「忘记本机密钥」：删除缓存句柄，回到需要输口令的状态 */
  public static async forget(uid: string): Promise<void> {
    if (!uid) return;
    const store = await this.store("readwrite");
    if (!store) return;
    await new Promise<void>((resolve) => {
      try {
        const req = store.delete(uid);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}
