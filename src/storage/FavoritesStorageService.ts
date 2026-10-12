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
  platformData: PlatformData;
}

export class FavoritesStorageService {
  private static readonly DB_NAME = "IIROSE_MEDIA_DB";
  private static readonly STORE_NAME = "favorites";
  private static readonly DB_VERSION = 1;

  private static dbPromise: Promise<IDBDatabase> | null = null;
  private static cachedIds: Set<string> = new Set();
  private static isInitialized = false;

  // 内存降级缓存（当环境不支持或限制 IndexedDB 时）
  private static memoryFallback: Map<string, FavoriteRecord> = new Map();
  private static useFallback = false;

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
        const request = window.indexedDB.open(
          this.DB_NAME,
          this.DB_VERSION,
        );

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            const store = db.createObjectStore(this.STORE_NAME, {
              keyPath: "id",
            });
            store.createIndex("platform", "platform", { unique: false });
            store.createIndex("type", "type", { unique: false });
            store.createIndex(
              "platform_type",
              ["platform", "type"],
              { unique: false },
            );
            store.createIndex("createdAt", "createdAt", { unique: false });
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
   * 刷新全部收藏的 ID 缓存
   */
  private static async refreshIdCache(db: IDBDatabase): Promise<void> {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.STORE_NAME, "readonly");
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.getAllKeys();
        req.onsuccess = () => {
          this.cachedIds = new Set((req.result as string[]) || []);
          resolve();
        };
        req.onerror = () => {
          resolve();
        };
      } catch (e) {
        resolve();
      }
    });
  }

  /**
   * 根据 PlatformData 生成规范化的唯一标识符
   */
  public static deriveFavoriteId(
    data: PlatformData,
  ): {
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
      const rawId = bvid || (aid ? `av${aid}` : this.extractIdFromUrl(data.websiteUrl));
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
    const id = typeof target === "string" ? target : this.deriveFavoriteId(target)?.id;
    if (!id) return false;
    if (this.useFallback) {
      return this.memoryFallback.has(id);
    }
    return this.cachedIds.has(id);
  }

  /**
   * 获取所有已收藏的 ID 集合
   */
  public static async getAllIds(): Promise<Set<string>> {
    await this.init();
    if (this.useFallback) {
      return new Set(this.memoryFallback.keys());
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
      resolvedCover = typeof data.coverImg === "string" ? data.coverImg : await data.coverImg;
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
      createdAt: Date.now(),
      platformData: sanitizedPlatformData,
    };

    this.cachedIds.add(meta.id);

    if (this.useFallback) {
      this.memoryFallback.set(meta.id, record);
      return record;
    }

    const db = await this.dbPromise;
    if (!db) {
      this.memoryFallback.set(meta.id, record);
      return record;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.STORE_NAME, "readwrite");
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.put(record);
        req.onsuccess = () => resolve(record);
        req.onerror = (e) => {
          console.error("[FavoritesStorage] 写入 IndexedDB 失败:", e);
          this.memoryFallback.set(meta.id, record);
          resolve(record);
        };
      } catch (e) {
        this.memoryFallback.set(meta.id, record);
        resolve(record);
      }
    });
  }

  /**
   * 移除收藏
   */
  public static async remove(target: string | PlatformData): Promise<void> {
    await this.init();
    const id = typeof target === "string" ? target : this.deriveFavoriteId(target)?.id;
    if (!id) return;

    this.cachedIds.delete(id);
    if (this.useFallback) {
      this.memoryFallback.delete(id);
      return;
    }

    const db = await this.dbPromise;
    if (!db) {
      this.memoryFallback.delete(id);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.STORE_NAME, "readwrite");
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => {
          this.memoryFallback.delete(id);
          resolve();
        };
      } catch {
        this.memoryFallback.delete(id);
        resolve();
      }
    });
  }

  /**
   * 切换收藏状态（如果已收藏则删除，未收藏则添加）
   */
  public static async toggle(data: PlatformData): Promise<{ isFavorited: boolean; record?: FavoriteRecord | null }> {
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
            req.onsuccess = () => resolve((req.result as FavoriteRecord[]) || []);
            req.onerror = () => resolve([]);
          } catch {
            resolve([]);
          }
        });
      }
    }

    // 按条件在内存中高效过滤
    const filtered = records.filter((rec) => {
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
