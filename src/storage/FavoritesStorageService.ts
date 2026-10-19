// src/storage/FavoritesStorageService.ts
import { BiliBiliVideoApi } from "../Api/BilibiliAPI/BiliBiliVideoAPI";

export interface FavoriteRecord {
  id: string;
  platform: "netease" | "joox" | "bilibili";
  type: "song" | "album" | "playlist" | "video";
  title: string;
  subtitle?: string;
  coverImg: string;
  author: string;
  websiteUrl: string;
  duration?: number;
  trackCount?: string;
  createdAt: number;
  /** 本条最后修改时间；云同步的 LWW 与合并依据 */
  updatedAt: number;
  /** 软删墓碑时间；有值即视为已删除（不进列表、参与合并、满 30 天物理清理） */
  deletedAt?: number;
  /** 尚未同步到云端 */
  dirty?: boolean;
  /** 本条上次成功同步时间（诊断用） */
  syncedAt?: number;
  platformData: PlatformData;
}

/** 云同步的条目形态：墓碑条目 `record` 为 null，只保留 key 与 deletedAt */
export interface FavoriteSyncItem {
  key: string;
  record: FavoriteRecord | null;
  deletedAt: number | null;
}

export class FavoritesStorageService {
  private static readonly DB_NAME = "IIROSE_MEDIA_DB";
  private static readonly STORE_NAME = "favorites";
  private static readonly DB_VERSION = 2;

  /** 墓碑保留期：满 30 天在下一次写事务中物理清除 */
  public static readonly TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

  private static dbPromise: Promise<IDBDatabase> | null = null;
  private static cachedIds: Set<string> = new Set();
  private static isInitialized = false;

  // 内存降级缓存（当环境不支持或限制 IndexedDB 时）
  private static memoryFallback: Map<string, FavoriteRecord> = new Map();
  private static useFallback = false;

  // 收藏变更监听（云同步据此做 5 秒防抖上传；存储层本身不认识同步模块）
  private static changeListeners: Array<() => void> = [];

  /**
   * 初始化并打开数据库
   */
  public static async init(): Promise<IDBDatabase | null> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    if (typeof window === "undefined" || !window.indexedDB) {
      console.warn("[FavoritesStorage] IndexedDB 不可用，切换至内存临时存储");
      this.useFallback = true;
      this.isInitialized = true;
      return null;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(this.DB_NAME, this.DB_VERSION);

        request.onupgradeneeded = (event) => {
          const target = event.target as IDBOpenDBRequest;
          const db = target.result;
          const tx = target.transaction;
          const oldVersion = (event as unknown as IDBVersionChangeEvent)
            .oldVersion;

          // 原地升级：已有 store 时只加字段与索引，绝不重建或清空
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            const store = db.createObjectStore(this.STORE_NAME, {
              keyPath: "id",
            });
            store.createIndex("platform", "platform", { unique: false });
            store.createIndex("type", "type", { unique: false });
            store.createIndex("platform_type", ["platform", "type"], {
              unique: false,
            });
            store.createIndex("createdAt", "createdAt", { unique: false });
            store.createIndex("deletedAt", "deletedAt", { unique: false });
            return;
          }

          const store = tx ? tx.objectStore(this.STORE_NAME) : null;
          if (!store) return;

          if (!store.indexNames.contains("deletedAt")) {
            store.createIndex("deletedAt", "deletedAt", { unique: false });
          }

          if (oldVersion < 2) {
            // v1 老记录缺少同步字段：用游标逐条回填 updatedAt=createdAt、dirty=true
            const cursorRequest = store.openCursor();
            cursorRequest.onsuccess = () => {
              const cursor = cursorRequest.result;
              if (!cursor) return;
              const record = cursor.value as FavoriteRecord;
              const createdAt =
                typeof record.createdAt === "number"
                  ? record.createdAt
                  : Date.now();
              record.createdAt = createdAt;
              record.updatedAt = createdAt;
              record.dirty = true;
              cursor.update(record);
              cursor.continue();
            };
          }
        };

        request.onsuccess = async () => {
          const db = request.result;
          this.isInitialized = true;
          // 加载初始 ID 缓存
          await this.refreshIdCache(db);
          resolve(db);
        };

        request.onerror = (e) => {
          console.error("[FavoritesStorage] 打开 IndexedDB 失败:", e);
          this.useFallback = true;
          this.isInitialized = true;
          resolve(null as any);
        };
      } catch (err) {
        console.error("[FavoritesStorage] IndexedDB 初始化异常:", err);
        this.useFallback = true;
        this.isInitialized = true;
        resolve(null as any);
      }
    });

    return this.dbPromise;
  }

  /**
   * 注册收藏变更监听（add / remove 后触发，供云同步做防抖上传）
   */
  public static onChange(listener: () => void): void {
    if (!this.changeListeners.includes(listener)) {
      this.changeListeners.push(listener);
    }
  }

  private static emitChange(): void {
    for (const listener of this.changeListeners.slice()) {
      try {
        listener();
      } catch (e) {
        console.error("[FavoritesStorage] 变更监听回调异常:", e);
      }
    }
  }

  /**
   * 刷新全部收藏的 ID 缓存（墓碑视为未收藏，不进入缓存）
   */
  private static async refreshIdCache(db: IDBDatabase): Promise<void> {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.STORE_NAME, "readonly");
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.openCursor();
        const ids = new Set<string>();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            this.cachedIds = ids;
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
      } catch (e) {
        resolve();
      }
    });
  }

  /** 从内存降级缓存重建 ID 缓存（墓碑同样跳过） */
  private static rebuildFallbackIdCache(): void {
    this.cachedIds = new Set(
      Array.from(this.memoryFallback.values())
        .filter((record) => !record.deletedAt)
        .map((record) => record.id),
    );
  }

  /** 补齐同步字段，防止云端或旧版本数据缺字段 */
  private static normalizeRecord(record: FavoriteRecord): FavoriteRecord {
    const createdAt =
      typeof record.createdAt === "number" ? record.createdAt : Date.now();
    const updatedAt =
      typeof record.updatedAt === "number" ? record.updatedAt : createdAt;
    return { ...record, createdAt, updatedAt };
  }

  /**
   * 物理清除满 30 天的墓碑；由写事务顺带执行，不单独触发上传
   */
  private static purgeTombstones(store: IDBObjectStore): void {
    try {
      if (!store.indexNames.contains("deletedAt")) return;
      const cutoff = Date.now() - this.TOMBSTONE_TTL_MS;
      const req = store
        .index("deletedAt")
        .openCursor(IDBKeyRange.upperBound(cutoff));
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
    } catch (e) {
      console.error("[FavoritesStorage] 清理过期墓碑失败:", e);
    }
  }

  /**
   * 根据 PlatformData 生成规范化的唯一标识符
   */
  public static deriveFavoriteId(data: PlatformData): {
    id: string;
    platform: "netease" | "joox" | "bilibili";
    type: "song" | "album" | "playlist" | "video";
  } | null {
    // 1. 网易云
    if (data.neteaseMusic || data.websiteUrl?.includes("163.com")) {
      const nm = data.neteaseMusic;
      const rawId = nm?.id || this.extractIdFromUrl(data.websiteUrl);
      if (!rawId) return null;
      let type: "song" | "album" | "playlist" | "video" = "song";
      if (nm?.isAlbum || data.websiteUrl?.includes("album")) {
        type = "album";
      } else if (nm?.isSongList || data.websiteUrl?.includes("playlist")) {
        type = "playlist";
      } else if (nm?.isMV || data.websiteUrl?.includes("mv")) {
        type = "video";
      }
      return {
        id: `netease:${type}:${rawId}`,
        platform: "netease",
        type,
      };
    }

    // 2. JOOX
    if (data.joox || data.websiteUrl?.includes("joox.com")) {
      const rawId = data.joox?.id || this.extractIdFromUrl(data.websiteUrl);
      if (!rawId) return null;
      return {
        id: `joox:song:${rawId}`,
        platform: "joox",
        type: "song",
      };
    }

    // 3. 哔哩哔哩
    if (data.bilibili || data.websiteUrl?.includes("bilibili.com")) {
      const bvid = data.bilibili?.bvid;
      const aid = data.bilibili?.aid;
      const rawId =
        bvid || (aid ? `av${aid}` : this.extractIdFromUrl(data.websiteUrl));
      if (!rawId) return null;
      return {
        id: `bilibili:video:${rawId}`,
        platform: "bilibili",
        type: "video",
      };
    }

    return null;
  }

  private static extractIdFromUrl(url: string): string | null {
    if (!url) return null;
    const match = url.match(
      /(?:id=|video\/|song\?id=|album\?id=|playlist\?id=|single\/)([a-zA-Z0-9_-]+)/,
    );
    return match ? match[1] : null;
  }

  /**
   * 判断指定资源或 ID 是否已收藏
   */
  public static isFavorited(target: string | PlatformData): boolean {
    const id =
      typeof target === "string" ? target : this.deriveFavoriteId(target)?.id;
    if (!id) return false;
    if (this.useFallback) {
      const record = this.memoryFallback.get(id);
      return !!record && !record.deletedAt;
    }
    return this.cachedIds.has(id);
  }

  /**
   * 获取所有已收藏的 ID 集合（墓碑视为未收藏）
   */
  public static async getAllIds(): Promise<Set<string>> {
    await this.init();
    if (this.useFallback) {
      return new Set(
        Array.from(this.memoryFallback.values())
          .filter((record) => !record.deletedAt)
          .map((record) => record.id),
      );
    }
    return this.cachedIds;
  }

  /**
   * 添加收藏
   */
  public static async add(data: PlatformData): Promise<FavoriteRecord | null> {
    await this.init();
    const meta = this.deriveFavoriteId(data);
    if (!meta) {
      console.warn("[FavoritesStorage] 无法提取有效收藏主键", data);
      return null;
    }

    // 解析并升级 HTTPS 封面
    let resolvedCover = "";
    try {
      resolvedCover =
        typeof data.coverImg === "string" ? data.coverImg : await data.coverImg;
    } catch {
      resolvedCover = "";
    }
    if (resolvedCover) {
      resolvedCover = resolvedCover.replace(/^http:\/\//, "https://");
    }

    // 复制 platformData，剥离无法序列化的 Promise 属性
    const sanitizedPlatformData: PlatformData = {
      ...data,
      coverImg: resolvedCover,
      multiPage: undefined, // 存库时脱钩，恢复时重组
    };

    const now = Date.now();
    const record: FavoriteRecord = {
      id: meta.id,
      platform: meta.platform,
      type: meta.type,
      title: data.title,
      subtitle: data.subtitle,
      coverImg: resolvedCover,
      author: data.author || "",
      websiteUrl: data.websiteUrl || "",
      duration: data.duration,
      trackCount: data.trackCount,
      createdAt: now,
      updatedAt: now,
      // 同键再次收藏：写入的新记录天然覆盖旧墓碑
      deletedAt: undefined,
      dirty: true,
      platformData: sanitizedPlatformData,
    };

    this.cachedIds.add(meta.id);

    if (this.useFallback) {
      this.memoryFallback.set(meta.id, record);
      this.emitChange();
      return record;
    }

    const db = await this.dbPromise;
    if (!db) {
      this.memoryFallback.set(meta.id, record);
      this.emitChange();
      return record;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.STORE_NAME, "readwrite");
        const store = tx.objectStore(this.STORE_NAME);
        this.purgeTombstones(store);
        const req = store.put(record);
        req.onsuccess = () => {
          this.emitChange();
          resolve(record);
        };
        req.onerror = (e) => {
          console.error("[FavoritesStorage] 写入 IndexedDB 失败:", e);
          this.memoryFallback.set(meta.id, record);
          this.emitChange();
          resolve(record);
        };
      } catch (e) {
        this.memoryFallback.set(meta.id, record);
        this.emitChange();
        resolve(record);
      }
    });
  }

  /**
   * 移除收藏：不物理删除，改写入软删墓碑（deletedAt + updatedAt + dirty）
   */
  public static async remove(target: string | PlatformData): Promise<void> {
    await this.init();
    const id =
      typeof target === "string" ? target : this.deriveFavoriteId(target)?.id;
    if (!id) return;

    this.cachedIds.delete(id);

    const now = Date.now();

    if (this.useFallback) {
      const existing = this.memoryFallback.get(id);
      if (existing && !existing.deletedAt) {
        this.memoryFallback.set(id, {
          ...existing,
          deletedAt: now,
          updatedAt: now,
          dirty: true,
        });
        this.emitChange();
      }
      return;
    }

    const db = await this.dbPromise;
    if (!db) {
      const existing = this.memoryFallback.get(id);
      if (existing && !existing.deletedAt) {
        this.memoryFallback.set(id, {
          ...existing,
          deletedAt: now,
          updatedAt: now,
          dirty: true,
        });
        this.emitChange();
      }
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.STORE_NAME, "readwrite");
        const store = tx.objectStore(this.STORE_NAME);
        this.purgeTombstones(store);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const existing = getReq.result as FavoriteRecord | undefined;
          if (!existing) {
            resolve();
            return;
          }
          const putReq = store.put({
            ...existing,
            deletedAt: now,
            updatedAt: now,
            dirty: true,
          });
          putReq.onsuccess = () => {
            this.emitChange();
            resolve();
          };
          putReq.onerror = () => resolve();
        };
        getReq.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * 切换收藏状态（如果已收藏则删除，未收藏则添加）
   */
  public static async toggle(
    data: PlatformData,
  ): Promise<{ isFavorited: boolean; record?: FavoriteRecord | null }> {
    const meta = this.deriveFavoriteId(data);
    if (!meta) return { isFavorited: false };

    if (this.isFavorited(meta.id)) {
      await this.remove(meta.id);
      return { isFavorited: false };
    } else {
      const record = await this.add(data);
      return { isFavorited: true, record };
    }
  }

  /**
   * 按平台、类型、关键词检索收藏数据（按时间倒序排列）
   */
  public static async query(options?: {
    platform?: "all" | "netease" | "joox" | "bilibili";
    type?: "all" | "song" | "album" | "playlist" | "video";
    keyword?: string;
  }): Promise<FavoriteRecord[]> {
    await this.init();
    const platform = options?.platform || "all";
    const type = options?.type || "all";
    const keyword = options?.keyword?.trim().toLowerCase();

    let records: FavoriteRecord[] = [];

    if (this.useFallback) {
      records = Array.from(this.memoryFallback.values());
    } else {
      const db = await this.dbPromise;
      if (!db) {
        records = Array.from(this.memoryFallback.values());
      } else {
        records = await new Promise<FavoriteRecord[]>((resolve) => {
          try {
            const tx = db.transaction(this.STORE_NAME, "readonly");
            const store = tx.objectStore(this.STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () =>
              resolve((req.result as FavoriteRecord[]) || []);
            req.onerror = () => resolve([]);
          } catch {
            resolve([]);
          }
        });
      }
    }

    // 按条件在内存中高效过滤（墓碑不进收藏列表）
    const filtered = records.filter((rec) => {
      if (rec.deletedAt) return false;
      if (platform !== "all" && rec.platform !== platform) return false;
      if (type !== "all" && rec.type !== type) return false;
      if (keyword) {
        const matchTitle = rec.title?.toLowerCase().includes(keyword);
        const matchAuthor = rec.author?.toLowerCase().includes(keyword);
        if (!matchTitle && !matchAuthor) return false;
      }
      return true;
    });

    // 按创建时间倒序（最新收藏在最前）
    filtered.sort((a, b) => b.createdAt - a.createdAt);

    return filtered;
  }

  /**
   * 导出全量收藏（含墓碑），供云同步构造快照
   */
  public static async getAllForSync(): Promise<FavoriteRecord[]> {
    await this.init();
    if (this.useFallback) {
      return Array.from(this.memoryFallback.values()).map((record) => ({
        ...record,
      }));
    }
    const db = await this.dbPromise;
    if (!db) {
      return Array.from(this.memoryFallback.values()).map((record) => ({
        ...record,
      }));
    }
    return new Promise<FavoriteRecord[]>((resolve) => {
      try {
        const tx = db.transaction(this.STORE_NAME, "readonly");
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as FavoriteRecord[]) || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  /**
   * 把「已成功写入云端」的合并结果批量落地到本地：
   * - 活记录 → 覆盖写回并清除 dirty；
   * - 墓碑条目 → 只影响本地已有的同键记录（本地没有则该墓碑对本地无意义）；
   * - `snapshotUpdatedAt` 之后被本地改动过的记录跳过，避免用旧快照覆盖新改动；
   * - 顺带物理清理满 30 天的墓碑。
   */
  public static async applyRemoteMerge(
    items: FavoriteSyncItem[],
    snapshotUpdatedAt: number,
  ): Promise<void> {
    if (!items || items.length === 0) return;
    await this.init();

    const now = Date.now();
    const existing = await this.getAllForSync();
    const existingMap = new Map(existing.map((record) => [record.id, record]));

    const nextRecords: FavoriteRecord[] = [];
    for (const item of items) {
      if (!item || typeof item.key !== "string") continue;
      const previous = existingMap.get(item.key);
      const previousUpdatedAt = previous
        ? (previous.updatedAt ?? previous.createdAt ?? 0)
        : 0;
      if (previous && previousUpdatedAt > snapshotUpdatedAt) continue;

      if (item.record) {
        nextRecords.push(
          this.normalizeRecord({
            ...item.record,
            id: item.key,
            deletedAt: undefined,
            dirty: false,
            syncedAt: now,
          }),
        );
      } else if (item.deletedAt && previous) {
        nextRecords.push(
          this.normalizeRecord({
            ...previous,
            deletedAt: item.deletedAt,
            updatedAt: item.deletedAt,
            dirty: false,
            syncedAt: now,
          }),
        );
      }
    }

    if (this.useFallback) {
      for (const record of nextRecords) {
        this.memoryFallback.set(record.id, record);
      }
      this.rebuildFallbackIdCache();
      return;
    }

    const db = await this.dbPromise;
    if (!db) {
      for (const record of nextRecords) {
        this.memoryFallback.set(record.id, record);
      }
      this.rebuildFallbackIdCache();
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.STORE_NAME, "readwrite");
        const store = tx.objectStore(this.STORE_NAME);
        this.purgeTombstones(store);
        for (const record of nextRecords) {
          store.put(record);
        }
        tx.oncomplete = () => {
          void this.refreshIdCache(db).then(() => resolve());
        };
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * 将 FavoriteRecord 还原为可直接驱动播放/选集的同构 PlatformData
   */
  public static restorePlatformData(record: FavoriteRecord): PlatformData {
    const base = { ...record.platformData };

    // 确保封面是 HTTPS
    const cover = (record.coverImg || "").replace(/^http:\/\//, "https://");
    base.coverImg = cover;

    // 为不同形态动态重组 multiPage Promise
    if (record.platform === "netease") {
      if (record.type === "album" || record.type === "playlist") {
        base.multiPage = Promise.resolve({ platform: "neteasemusic" });
      }
    } else if (record.platform === "bilibili") {
      base.multiPage = (async () => {
        try {
          const res = await BiliBiliVideoApi.getBilibiliPagesAndCids(
            base.bilibili?.aid || null,
            base.bilibili?.bvid || null,
          );
          if (res?.data?.length && res.data.length > 1) {
            return { platform: "bilibili" };
          }
        } catch (e) {
          console.error("[FavoritesStorage] 探测分 P 失败:", e);
        }
        return undefined;
      })();
    }

    return base;
  }
}
