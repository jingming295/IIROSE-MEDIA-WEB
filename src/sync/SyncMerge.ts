// src/sync/SyncMerge.ts
// 收藏云同步的合并层：并集合并、同键冲突裁决、墓碑生命周期判定。
// 刻意做成纯函数（不碰 IndexedDB、不碰网络），便于用夹具脚本独立验证。
// 协议见 _bmad-output/specs/spec-favorites-cloud-sync/sync-protocol.md 第 2、4 节。
import type {
  FavoriteRecord,
  FavoriteSyncItem,
} from "../storage/FavoritesStorageService";

/** 快照自身版本（与 IndexedDB 的 DB_VERSION 无关，用于合并算法演进） */
export const SNAPSHOT_VERSION = 2;

/**
 * 明文快照：`ct` 解密后的结构，永不出端。
 * `key` 为复合主键 `platform:type:rawId`；墓碑条目 `record` 为 null。
 */
export interface SyncSnapshot {
  version: number;
  updatedAt: number;
  items: FavoriteSyncItem[];
}

export interface MergeStats {
  /** 云端活记录条数 */
  cloud: number;
  /** 本地活记录条数 */
  local: number;
  /** 合并后活记录条数 */
  merged: number;
}

export interface MergeResult {
  items: FavoriteSyncItem[];
  stats: MergeStats;
}

function byKey(a: FavoriteSyncItem, b: FavoriteSyncItem): number {
  if (a.key === b.key) return 0;
  return a.key < b.key ? -1 : 1;
}

/** 一条条目的「操作时间」：墓碑取 deletedAt，活记录取 createdAt */
export function itemOperationTime(item: FavoriteSyncItem): number {
  if (item.deletedAt) return item.deletedAt;
  const record = item.record;
  if (!record) return 0;
  return typeof record.createdAt === "number" ? record.createdAt : 0;
}

export function isTombstone(item: FavoriteSyncItem): boolean {
  return !!item.deletedAt;
}

/** 活记录（非墓碑）条数 */
export function countLiveItems(items: FavoriteSyncItem[]): number {
  let count = 0;
  for (const item of items) {
    if (item && item.record && !item.deletedAt) count += 1;
  }
  return count;
}

/** FavoriteRecord → 快照条目（剥离本地同步元数据，缩小密文体积） */
export function toSnapshotItem(record: FavoriteRecord): FavoriteSyncItem {
  if (record.deletedAt) {
    return { key: record.id, record: null, deletedAt: record.deletedAt };
  }
  const {
    dirty: _dirty,
    syncedAt: _syncedAt,
    deletedAt: _deletedAt,
    ...rest
  } = record;
  return {
    key: record.id,
    record: rest as FavoriteRecord,
    deletedAt: null,
  };
}

/**
 * 由一份本地记录构造明文快照（云端为空时的首次上传、以及稳态上传都走这里）
 */
export function buildSnapshot(
  records: FavoriteRecord[],
  updatedAt: number,
): SyncSnapshot {
  const items = records
    .filter((record) => record && typeof record.id === "string")
    .map(toSnapshotItem)
    .sort(byKey);
  return { version: SNAPSHOT_VERSION, updatedAt, items };
}

/**
 * 同键冲突裁决：
 * - 两侧都是活记录：保留 `createdAt` 更早的一条（相等保留本地，避免无意义抖动）。
 * - 一侧墓碑一侧活记录：比较墓碑 `deletedAt` 与活记录 `createdAt`，更晚的操作胜出。
 * - 两侧都是墓碑：保留 `deletedAt` 更晚的一条。
 */
export function resolveConflict(
  local: FavoriteSyncItem,
  remote: FavoriteSyncItem,
): FavoriteSyncItem {
  const localTime = itemOperationTime(local);
  const remoteTime = itemOperationTime(remote);
  const localDeleted = !!local.deletedAt;
  const remoteDeleted = !!remote.deletedAt;

  if (localDeleted && remoteDeleted) {
    return localTime >= remoteTime ? local : remote;
  }
  if (localDeleted) {
    return localTime > remoteTime ? local : remote;
  }
  if (remoteDeleted) {
    return remoteTime > localTime ? remote : local;
  }
  return remoteTime < localTime ? remote : local;
}

function normalizeItem(item: FavoriteSyncItem): FavoriteSyncItem | null {
  if (!item || typeof item.key !== "string" || item.key === "") return null;
  if (item.deletedAt) {
    return {
      key: item.key,
      record: null,
      deletedAt: typeof item.deletedAt === "number" ? item.deletedAt : 0,
    };
  }
  const record = item.record;
  if (!record) return null;
  const createdAt =
    typeof record.createdAt === "number" ? record.createdAt : Date.now();
  const updatedAt =
    typeof record.updatedAt === "number" ? record.updatedAt : createdAt;
  return {
    key: item.key,
    record: { ...record, id: item.key, createdAt, updatedAt },
    deletedAt: null,
  };
}

/**
 * 并集合并：远端快照 + 本地全量（含墓碑）→ 合并条目集合与统计。
 * 统计口径为「活记录条数」，供 UI 呈现「云端 N / 本地 M / 合并后 K」。
 */
export function mergeSnapshots(
  remote: SyncSnapshot | null,
  localRecords: FavoriteRecord[],
): MergeResult {
  const remoteItems = new Map<string, FavoriteSyncItem>();
  if (remote && Array.isArray(remote.items)) {
    for (const raw of remote.items) {
      const item = normalizeItem(raw);
      if (item) remoteItems.set(item.key, item);
    }
  }

  const localItems = new Map<string, FavoriteSyncItem>();
  for (const record of localRecords || []) {
    if (!record || typeof record.id !== "string") continue;
    const item = normalizeItem(toSnapshotItem(record));
    if (item) localItems.set(item.key, item);
  }

  const merged = new Map<string, FavoriteSyncItem>(remoteItems);
  for (const [key, localItem] of localItems) {
    const remoteItem = merged.get(key);
    merged.set(
      key,
      remoteItem ? resolveConflict(localItem, remoteItem) : localItem,
    );
  }

  const items = Array.from(merged.values()).sort(byKey);

  return {
    items,
    stats: {
      cloud: countLiveItems(Array.from(remoteItems.values())),
      local: countLiveItems(Array.from(localItems.values())),
      merged: countLiveItems(items),
    },
  };
}
