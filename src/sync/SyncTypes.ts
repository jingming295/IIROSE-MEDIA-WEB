// src/sync/SyncTypes.ts
// 同步层的公共类型。放在单独文件是为了让 runtime / transport / enable / lifecycle
// 四个模块都能引用同一份定义，而不必互相依赖实现。
import type { UnlockedSync } from "./SyncContext";
import type { MergeStats, SyncSnapshot } from "./SyncMerge";
import type { SyncEnvelope } from "./SyncCrypto";

export interface SyncStateView {
  uid: string | null;
  enabled: boolean;
  unlocked: boolean;
  busy: boolean;
  lastSyncAt: number | null;
  serverUrl: string;
}

export interface SyncResult {
  ok: boolean;
  message: string;
  stats?: MergeStats;
}

/**
 * 首次启用预览的结果：`cloudEmpty` 为真时没有可确认的合并（云端为空），UI 直接提交即可。
 * 成功时 `stats` 必有值——确认框要显示的就是这三个数字。
 */
export type SyncPreviewResult =
  | { ok: true; message: string; stats: MergeStats; cloudEmpty: boolean }
  | { ok: false; message: string };

/**
 * 已经拉取到手的云端状态（避免二次 GET，也避免「用 remoteRev 短路后只上传本地」的数据丢失）。
 * - `empty`：云端确定无快照或已被清空；
 * - `snapshot`：已经解密校验过的云端快照、信封与版本号。
 */
export type PrefetchedRemote =
  | { kind: "empty" }
  | {
      kind: "snapshot";
      envelope: SyncEnvelope;
      rev: string | null;
      snapshot: SyncSnapshot;
    };

/** `performSync` 内部使用的云端状态：304 / 有信封 / 空 */
export type RemoteState =
  | { notModified: true }
  | {
      notModified: false;
      envelope: SyncEnvelope | null;
      rev: string | null;
      snapshot: SyncSnapshot | null;
    };

/**
 * 首次启用的预览结果：确认时直接复用这里的已解密上下文与云端快照，
 * 因此「确认合并」不会再发第二次 GET，也不会重新解密。
 *
 * 不记录预览时刻的变更代数：`commitEnable` 走的是 `performSync`，它在上传前会重新读一遍
 * 本地收藏，所以预览停留期间新增/删除的条目自然进入合并结果，不需要补传第二步。
 */
export interface PendingEnable {
  ctx: UnlockedSync;
  prefetched: PrefetchedRemote;
  stats: MergeStats;
}
