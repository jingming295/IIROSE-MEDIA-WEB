// src/storage/favorites/recordUtils.ts
// 收藏记录的纯函数：主键/归属映射、字段归一化、平台 ID 推导、平台数据还原。
// 不碰 IndexedDB、不持有状态——存储服务与同步层都从这里取同一套规则。
import type { FavoriteRecord } from "../FavoritesStorageService";

/** 与后端 cloud/sync/logic.js 的 UID_PATTERN 对齐 */
export const UID_PATTERN = /^[0-9a-f]{8,32}$/;
/** 归属分隔符：主键值 = `<ownerUid>|<逻辑主键>`（逻辑主键里不会出现 `|`） */
export const OWNER_SEPARATOR = "|";
/** 无有效 uid 时的作用域标签：只用于比较，不会写进记录（见「延迟归属」） */
export const UNKNOWN_OWNER = "unknown";

/** 当前有效的 uid（游客/非法值返回 null） */
export function currentValidUid(): string | null {
  const uid = typeof window !== "undefined" ? window.uid : undefined;
  if (typeof uid !== "string") return null;
  const normalized = uid.trim().toLowerCase();
  return UID_PATTERN.test(normalized) ? normalized : null;
}

/**
 * 当前读写作用域：有效的 `window.uid`，否则哨兵（游客/未登录）。
 * 注意「延迟归属」：升级时 uid 无效的遗留记录**不写归属**，它们在首次出现有效 uid 时
 * 一次性归给该 uid（见 `attributeUnowned`）；在那之前对当前作用域可见。
 */
export function getCurrentOwnerUid(): string {
  return currentValidUid() ?? UNKNOWN_OWNER;
}

export function storageId(ownerUid: string, logicalId: string): string {
  return `${ownerUid}${OWNER_SEPARATOR}${logicalId}`;
}

export function logicalIdOf(storedId: string): string {
  const index = storedId.indexOf(OWNER_SEPARATOR);
  return index === -1 ? storedId : storedId.slice(index + 1);
}

/** 未归属记录：ownerUid 缺省或为空（升级时 uid 无效的遗留记录） */
export function isUnowned(record: FavoriteRecord): boolean {
  return !(typeof record.ownerUid === "string" && record.ownerUid);
}

/** 记录的归属：未归属返回空串 */
export function ownerOf(record: FavoriteRecord): string {
  return typeof record.ownerUid === "string" ? record.ownerUid : "";
}

/** 是否属于当前作用域：未归属记录对任何作用域可见，等待首次归属 */
export function inScope(record: FavoriteRecord, owner: string): boolean {
  const recordOwner = ownerOf(record);
  if (!recordOwner) return true;
  return recordOwner === owner;
}

/** 存库记录 → 对外记录（只暴露逻辑主键，绝不泄漏归属前缀） */
export function toPublicRecord(record: FavoriteRecord): FavoriteRecord {
  return { ...record, id: logicalIdOf(record.id) };
}

export function normalizeRecord(record: FavoriteRecord): FavoriteRecord {
  const createdAt =
    typeof record.createdAt === "number" ? record.createdAt : Date.now();
  const updatedAt =
    typeof record.updatedAt === "number" ? record.updatedAt : createdAt;
  return { ...record, createdAt, updatedAt };
}

/**
 * 根据 PlatformData 生成规范化的唯一标识符
 */
export function deriveFavoriteId(data: PlatformData): {
  id: string;
  platform: "netease" | "bilibili";
  type: "song" | "album" | "playlist" | "video";
} | null {
  // 1. 网易云
  if (data.neteaseMusic || data.websiteUrl?.includes("163.com")) {
    const nm = data.neteaseMusic;
    const rawId = nm?.id || extractIdFromUrl(data.websiteUrl);
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

  // 2. 哔哩哔哩
  if (data.bilibili || data.websiteUrl?.includes("bilibili.com")) {
    const bvid = data.bilibili?.bvid;
    const aid = data.bilibili?.aid;
    const rawId =
      bvid || (aid ? `av${aid}` : extractIdFromUrl(data.websiteUrl));
    if (!rawId) return null;
    return {
      id: `bilibili:video:${rawId}`,
      platform: "bilibili",
      type: "video",
    };
  }

  return null;
}

export function extractIdFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:id=|video\/|song\?id=|album\?id=|playlist\?id=|single\/)([a-zA-Z0-9_-]+)/,
  );
  return match ? match[1] : null;
}
