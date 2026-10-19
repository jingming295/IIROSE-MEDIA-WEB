// src/storage/FavoritesStorageService.ts
import { BiliBiliVideoApi } from "../Api/BilibiliAPI/BiliBiliVideoAPI";

export interface FavoriteRecord {
  /**
   * 对外的主键（逻辑复合主键 `platform:type:rawId`）。存库时写入 IndexedDB 的主键是
   * `<ownerUid>|<逻辑主键>`；本服务对外一律只暴露逻辑主键（云同步的条目键也是它）。
   */
  id: string;
  /**
   * 归属账号：创建这条收藏时的 `window.uid`。**缺省 = 未归属**（升级瞬间或创建时 uid 无效），
   * 这类记录对当前作用域可见，并在首次出现有效 uid 时一次性归给该 uid（延迟归属），
   * 之后严格按账号隔离、不再变更。
   */
  ownerUid?: string;
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
  /** 本条最后修改时间；用于上传落地时的防覆盖判定（同键冲突裁决用的是 createdAt） */
  updatedAt: number;
  /** 软删墓碑时间；有值即视为已删除（不进列表、参与合并；只有**已同步**的墓碑才允许物理清理） */
  deletedAt?: number;
  /** 尚未同步到云端；只有上传成功后才会被清除，未清除的墓碑不得物理清理（否则会被云端复活） */
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

/** 与后端 cloud/sync/logic.js 的 UID_PATTERN 对齐 */
const UID_PATTERN = /^[0-9a-f]{8,32}$/;
/** 归属分隔符：主键值 = `<ownerUid>|<逻辑主键>`（逻辑主键里不会出现 `|`） */
const OWNER_SEPARATOR = "|";
/** 无有效 uid 时的作用域标签：只用于比较，不会写进记录（见「延迟归属」） */
const UNKNOWN_OWNER = "unknown";

export class FavoritesStorageService {
  private static readonly DB_NAME = "IIROSE_MEDIA_DB";
  private static readonly STORE_NAME = "favorites";
  private static readonly DB_VERSION = 3;

  /** 墓碑保留期：满 30 天在**下一次写事务**中物理清除（仅限已同步上云的墓碑） */
  public static readonly TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

  private static dbPromise: Promise<IDBDatabase> | null = null;
  /** 非墓碑记录的**存库主键**集合（含归属前缀；按当前归属取用时再拼前缀） */
  private static cachedIds: Set<string> = new Set();
  private static isInitialized = false;

  // 内存降级缓存（当环境不支持或限制 IndexedDB 时），键同为存库主键
  private static memoryFallback: Map<string, FavoriteRecord> = new Map();
  private static useFallback = false;

  // 收藏变更监听（云同步据此做 5 秒防抖上传；存储层本身不认识同步模块）
  private static changeListeners: Array<() => void> = [];
  // 外部变更监听（云端拉取落地时触发，供已渲染的收藏列表刷新；**不得**与变更监听混用）
  private static externalChangeListeners: Array<() => void> = [];

  /**
   * 当前读写作用域：有效的 `window.uid`，否则哨兵（游客/未登录）。
   * 注意「延迟归属」：升级时 uid 无效的遗留记录**不写归属**，它们在首次出现有效 uid 时
   * 一次性归给该 uid（见 `attributeUnowned`）；在那之前对当前作用域可见。
   */
  public static getCurrentOwnerUid(): string {
    return this.currentValidUid() ?? UNKNOWN_OWNER;
  }

  /** 当前有效的 uid（游客/非法值返回 null） */
  private static currentValidUid(): string | null {
    const uid = typeof window !== "undefined" ? window.uid : undefined;
    if (typeof uid !== "string") return null;
    const normalized = uid.trim().toLowerCase();
    return UID_PATTERN.test(normalized) ? normalized : null;
  }

  private static storageId(ownerUid: string, logicalId: string): string {
    return `${ownerUid}${OWNER_SEPARATOR}${logicalId}`;
  }

  private static logicalIdOf(storageId: string): string {
    const index = storageId.indexOf(OWNER_SEPARATOR);
    return index === -1 ? storageId : storageId.slice(index + 1);
  }

  /** 未归属记录：ownerUid 缺省或为空（升级时 uid 无效的遗留记录） */
  private static isUnowned(record: FavoriteRecord): boolean {
    return !(typeof record.ownerUid === "string" && record.ownerUid);
  }

  /** 记录的归属：未归属返回空串 */
  private static ownerOf(record: FavoriteRecord): string {
    return typeof record.ownerUid === "string" ? record.ownerUid : "";
  }

  /** 是否属于当前作用域：未归属记录对任何作用域可见，等待首次归属 */
  private static inScope(record: FavoriteRecord, owner: string): boolean {
    const recordOwner = this.ownerOf(record);
    if (!recordOwner) return true;
    return recordOwner === owner;
  }

  /** 存库记录 → 对外记录（只暴露逻辑主键，绝不泄漏归属前缀） */
  private static toPublicRecord(record: FavoriteRecord): FavoriteRecord {
    return { ...record, id: this.logicalIdOf(record.id) };
  }

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
            store.createIndex("ownerUid", "ownerUid", { unique: false });
            return;
          }

          const store = tx ? tx.objectStore(this.STORE_NAME) : null;
          if (!store) return;

          if (!store.indexNames.contains("deletedAt")) {
            store.createIndex("deletedAt", "deletedAt", { unique: false });
          }
          if (!store.indexNames.contains("ownerUid")) {
            store.createIndex("ownerUid", "ownerUid", { unique: false });
          }

          if (oldVersion < 3) {
            // v1 记录补同步字段（updatedAt=createdAt、dirty=true）；
            // v2 记录按账号隔离：主键改为 `<ownerUid>|<逻辑主键>`，归属取升级当刻有效的
            // window.uid。**uid 无效时不写归属**（保持未归属），由 attributeUnowned()
            // 在首次出现有效 uid 时一次性归给该 uid。
            const needsSyncFields = oldVersion < 2;
            const owner = this.currentValidUid();
            const migrated: FavoriteRecord[] = [];
            const cursorRequest = store.openCursor();
            cursorRequest.onsuccess = () => {
              const cursor = cursorRequest.result;
              if (!cursor) {
                // 游标结束后统一重写，避免游标访问到刚写入的新键
                for (const record of migrated) {
                  store.put(record);
                }
                return;
              }
              const record = cursor.value as FavoriteRecord;
              const logicalId = this.isUnowned(record)
                ? record.id
                : this.logicalIdOf(record.id);
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
                next.id = this.storageId(owner, logicalId);
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

  /**
   * 注册「外部变更」监听：云端拉取落地后触发，供已渲染的收藏列表刷新。
   * 刻意与 `onChange` 分开——外部变更绝不能反过来触发上传（会形成循环）。
   */
  public static onExternalChange(listener: () => void): void {
    if (!this.externalChangeListeners.includes(listener)) {
      this.externalChangeListeners.push(listener);
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

  private static emitExternalChange(): void {
    for (const listener of this.externalChangeListeners.slice()) {
      try {
        listener();
      } catch (e) {
        console.error("[FavoritesStorage] 外部变更监听回调异常:", e);
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
   * 云端是否可能已有副本：以「同步盐/上次同步时间已存在」为准
   * （`enable()` 时写入 salt，关闭同步不清除）。读不出来时按「可能有副本」保守处理。
   */
  private static cloudCopyMayExist(): boolean {
    try {
      const raw = localStorage.getItem("imwPluginSetting");
      if (!raw) return false;
      const sync = (
        JSON.parse(raw) as {
          sync?: { salt?: unknown; lastSyncAt?: unknown; enabled?: unknown };
        }
      ).sync;
      if (!sync) return false;
      return !!sync.salt || !!sync.lastSyncAt || sync.enabled === true;
    } catch {
      return true;
    }
  }

  /**
   * 物理清除满 30 天的墓碑；由写事务顺带执行，不单独触发上传。
   * **只清理已同步上云的墓碑**（`dirty` 已清除）：从没上传过的墓碑一旦被清掉，
   * 下次并集合并就会用云端的活记录把已删条目复活。
   */
  private static purgeTombstones(store: IDBObjectStore): void {
    try {
      if (!store.indexNames.contains("deletedAt")) return;
      const cutoff = Date.now() - this.TOMBSTONE_TTL_MS;
      // 守卫只对「云端可能已有副本」的用户生效：从未启用过同步时云端没有副本，
      // 清掉本地墓碑不会被任何云端活记录复活，因此不受 dirty 限制
      //（否则这些墓碑会无限累积，与 512KB 快照额度冲突）。
      const guardDirty = this.cloudCopyMayExist();
      const req = store
        .index("deletedAt")
        .openCursor(IDBKeyRange.upperBound(cutoff));
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const record = cursor.value as FavoriteRecord | undefined;
        if (guardDirty && record && record.dirty === true) {
          // 还没同步上云：留着，等上传成功后再清理（否则会被云端活记录复活）
          cursor.continue();
          return;
        }
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
   * 判断指定资源或逻辑 ID 在当前账号下是否已收藏（墓碑视为未收藏）
   */
  public static isFavorited(target: string | PlatformData): boolean {
    const logicalId =
      typeof target === "string" ? target : this.deriveFavoriteId(target)?.id;
    if (!logicalId) return false;
    const storageId = this.storageId(this.getCurrentOwnerUid(), logicalId);
    // 未归属记录（键就是逻辑主键）同样算「已收藏」，等待延迟归属
    if (this.useFallback) {
      const record =
        this.memoryFallback.get(storageId) ??
        this.memoryFallback.get(logicalId);
      return !!record && !record.deletedAt;
    }
    return this.cachedIds.has(storageId) || this.cachedIds.has(logicalId);
  }

  /**
   * 获取当前账号所有已收藏的逻辑 ID 集合（墓碑视为未收藏；不含其他账号与哨兵归属的收藏）
   */
  public static async getAllIds(): Promise<Set<string>> {
    await this.ensureOwnerScope();
    const prefix = `${this.getCurrentOwnerUid()}${OWNER_SEPARATOR}`;
    const ids = new Set<string>();
    for (const key of this.cachedIds) {
      if (key.startsWith(prefix)) {
        ids.add(key.slice(prefix.length));
      } else if (key.indexOf(OWNER_SEPARATOR) === -1) {
        // 未归属记录：键就是逻辑主键
        ids.add(key);
      }
    }
    return ids;
  }

  /**
   * 添加收藏（归属当前账号）
   */
  public static async add(data: PlatformData): Promise<FavoriteRecord | null> {
    await this.ensureOwnerScope();
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

    const ownerUid = this.currentValidUid();
    const storageId = ownerUid ? this.storageId(ownerUid, meta.id) : meta.id;
    const now = Date.now();
    const record: FavoriteRecord = {
      id: storageId,
      ...(ownerUid ? { ownerUid } : {}),
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

    this.cachedIds.add(storageId);

    if (this.useFallback) {
      this.memoryFallback.set(storageId, record);
      this.emitChange();
      return this.toPublicRecord(record);
    }

    const db = await this.dbPromise;
    if (!db) {
      this.memoryFallback.set(storageId, record);
      this.emitChange();
      return this.toPublicRecord(record);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.STORE_NAME, "readwrite");
        const store = tx.objectStore(this.STORE_NAME);
        this.purgeTombstones(store);
        const req = store.put(record);
        req.onsuccess = () => {
          this.emitChange();
          resolve(this.toPublicRecord(record));
        };
        req.onerror = (e) => {
          console.error("[FavoritesStorage] 写入 IndexedDB 失败:", e);
          this.memoryFallback.set(storageId, record);
          this.emitChange();
          resolve(this.toPublicRecord(record));
        };
      } catch (e) {
        this.memoryFallback.set(storageId, record);
        this.emitChange();
        resolve(this.toPublicRecord(record));
      }
    });
  }

  /**
   * 移除收藏：不物理删除，改写入软删墓碑（deletedAt + updatedAt + dirty），
   * 作用域限定在当前账号。
   */
  public static async remove(target: string | PlatformData): Promise<void> {
    await this.ensureOwnerScope();
    const logicalId =
      typeof target === "string" ? target : this.deriveFavoriteId(target)?.id;
    if (!logicalId) return;

    // 与 isFavorited() 对称：优先当前账号的键；未归属记录（游客态/升级时 uid 无效）
    // 的键就是裸逻辑主键，必须回退到它，否则取消收藏会静默失败、星标反弹。
    const ownerKey = this.storageId(this.getCurrentOwnerUid(), logicalId);
    const storageId = this.cachedIds.has(ownerKey) ? ownerKey : logicalId;

    this.cachedIds.delete(ownerKey);
    this.cachedIds.delete(logicalId);

    const now = Date.now();

    if (this.useFallback) {
      const existing = this.memoryFallback.get(storageId);
      if (existing && !existing.deletedAt) {
        this.memoryFallback.set(storageId, {
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
      const existing = this.memoryFallback.get(storageId);
      if (existing && !existing.deletedAt) {
        this.memoryFallback.set(storageId, {
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
        const getReq = store.get(storageId);
        getReq.onsuccess = () => {
          const existing = getReq.result as FavoriteRecord | undefined;
          if (!existing || existing.deletedAt) {
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
   * 按平台、类型、关键词检索**当前账号**的收藏数据（按时间倒序排列）
   */
  public static async query(options?: {
    platform?: "all" | "netease" | "joox" | "bilibili";
    type?: "all" | "song" | "album" | "playlist" | "video";
    keyword?: string;
  }): Promise<FavoriteRecord[]> {
    await this.ensureOwnerScope();
    const platform = options?.platform || "all";
    const type = options?.type || "all";
    const keyword = options?.keyword?.trim().toLowerCase();
    const owner = this.getCurrentOwnerUid();

    const all = await this.readAll();
    const records = all.filter((rec) => this.inScope(rec, owner));

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

    return filtered.map((rec) => this.toPublicRecord(rec));
  }

  /** 读取全部存库记录（含墓碑、含所有归属，主键为存库主键） */
  private static async readAll(): Promise<FavoriteRecord[]> {
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
   * 需要当前账号作用域的操作入口：先打开数据库，再完成一次「延迟归属」。
   */
  private static async ensureOwnerScope(): Promise<void> {
    await this.init();
    await this.attributeUnowned();
  }

  /**
   * 延迟归属：把升级时「未归属」的遗留记录一次性归给当前账号并落库。
   * 只在首次出现有效 uid 时发生一次（归属后记录带上 ownerUid，之后不会再被归走）；
   * 无有效 uid（游客/未登录）时不做任何事。
   */
  private static async attributeUnowned(): Promise<void> {
    const owner = this.currentValidUid();
    if (!owner) return;

    const all = await this.readAll();
    const unowned = all.filter((record) => this.isUnowned(record));
    if (unowned.length === 0) return;

    const owned = new Map(
      all
        .filter((record) => !this.isUnowned(record))
        .map((record) => [record.id, record]),
    );

    // 目标键上可能已经有归属记录：按 updatedAt 做 LWW，绝不用（可能更旧的）未归属记录
    // 覆盖它——例如一条陈旧的墓碑会把活记录覆盖掉，等于收藏凭空消失。
    const removals: string[] = [];
    const writes: FavoriteRecord[] = [];
    for (const record of unowned) {
      const targetId = this.storageId(owner, record.id);
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

    if (this.useFallback || !this.dbPromise) {
      for (const key of removals) this.memoryFallback.delete(key);
      for (const record of writes) this.memoryFallback.set(record.id, record);
      this.rebuildFallbackIdCache();
      return;
    }

    const db = await this.dbPromise;
    if (!db) {
      for (const key of removals) this.memoryFallback.delete(key);
      for (const record of writes) this.memoryFallback.set(record.id, record);
      this.rebuildFallbackIdCache();
      return;
    }

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(this.STORE_NAME, "readwrite");
        const store = tx.objectStore(this.STORE_NAME);
        for (const key of removals) {
          store.delete(key);
        }
        for (const record of writes) {
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
   * 导出**当前账号**的全量收藏（含墓碑），供云同步构造快照。
   * 快照键是逻辑主键（去掉归属前缀）；无有效 uid（游客态）时不导出任何东西。
   */
  public static async getAllForSync(): Promise<FavoriteRecord[]> {
    await this.ensureOwnerScope();
    const owner = this.currentValidUid();
    if (!owner) return []; // 游客态不参与任何同步
    const all = await this.readAll();
    return all
      .filter((record) => this.inScope(record, owner))
      .map((record) => this.toPublicRecord(record));
  }

  /**
   * 当前账号是否有尚未同步成功的记录（含墓碑）。
   * 用于判断稳态 304 之后是否还需要写回云端。
   */
  public static async hasDirtyRecords(): Promise<boolean> {
    await this.ensureOwnerScope();
    const owner = this.currentValidUid();
    if (!owner) return false;
    const all = await this.readAll();
    return all.some(
      (record) => this.inScope(record, owner) && record.dirty === true,
    );
  }

  /**
   * 把「已成功写入云端」的合并结果批量落地到当前账号：
   * - 活记录 → 覆盖写回并**清除 dirty**、写 `syncedAt`（30 天墓碑清理的前提）；
   * - 墓碑条目 → 只影响本地已有的同键记录（本地没有则该墓碑对本地无意义）；
   * - `snapshotUpdatedAt` 之后被本地改动过的记录跳过，避免用旧快照覆盖新改动；
   * - 顺带物理清理满 30 天的**已同步**墓碑；
   * - 落地后发出「外部变更」通知，供已渲染的收藏列表刷新。
   *
   * @param snapshotUpdatedAt 本次快照的 `updatedAt`（判断本地改动是否更新）
   * @param syncedAt 本次写入云端被服务端确认的时间（缺省用当前时间）
   */
  public static async applyRemoteMerge(
    items: FavoriteSyncItem[],
    snapshotUpdatedAt: number,
    syncedAt?: number,
  ): Promise<void> {
    if (!items || items.length === 0) return;
    await this.ensureOwnerScope();
    const owner = this.currentValidUid();
    if (!owner) return;

    const now = typeof syncedAt === "number" ? syncedAt : Date.now();
    const existing = await this.readAll();
    const existingMap = new Map(existing.map((record) => [record.id, record]));

    const nextRecords: FavoriteRecord[] = [];
    for (const item of items) {
      if (!item || typeof item.key !== "string") continue;
      const storageId = this.storageId(owner, item.key);
      const previous = existingMap.get(storageId);
      const previousUpdatedAt = previous
        ? (previous.updatedAt ?? previous.createdAt ?? 0)
        : 0;
      if (previous && previousUpdatedAt > snapshotUpdatedAt) continue;

      if (item.record) {
        nextRecords.push(
          this.normalizeRecord({
            ...item.record,
            id: storageId,
            ownerUid: owner,
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
      this.emitExternalChange();
      return;
    }

    const db = await this.dbPromise;
    if (!db) {
      for (const record of nextRecords) {
        this.memoryFallback.set(record.id, record);
      }
      this.rebuildFallbackIdCache();
      this.emitExternalChange();
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
          void this.refreshIdCache(db).then(() => {
            this.emitExternalChange();
            resolve();
          });
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
