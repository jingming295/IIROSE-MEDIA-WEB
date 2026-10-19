// src/sync/SyncTransport.ts
// 同步的传输与编排：GET（带 If-None-Match 短路）→ 解密 → 并集合并 → PUT → 落地，
// 以及防抖上传的排程与补排。这一层不判断「该不该启用」，只负责把一次同步跑完。
import {
  FavoritesStorageService,
  type FavoriteSyncItem,
} from "../storage/FavoritesStorageService";
import { ShowMessage } from "../iirose_func/ShowMessage";
import { SyncClientError, describeSyncError } from "./SyncClient";
import { SyncCrypto } from "./SyncCrypto";
import {
  SYNC_MESSAGE_WRONG_PASSPHRASE,
  type UnlockedSync,
} from "./SyncContext";
import { describeStats } from "./SyncGate";
import {
  SNAPSHOT_VERSION,
  buildSnapshot,
  countLiveItems,
  mergeSnapshots,
  type MergeStats,
  type SyncSnapshot,
} from "./SyncMerge";
import {
  getRemoteRev,
  getSyncSettings,
  setRemoteRev,
  updateSyncSettings,
} from "./SyncSettingsStore";
import {
  UPLOAD_DEBOUNCE_MS,
  activeContext,
  beginRun,
  canAutoUpload,
  cancelDebounce,
  endRun,
  getUid,
  rt,
} from "./SyncRuntime";
import type { PrefetchedRemote, RemoteState, SyncResult } from "./SyncTypes";

/** 两份条目集合是否逐条一致（用于「纯拉取时是否还需要写回云端」的判定） */
function sameItems(a: FavoriteSyncItem[], b: FavoriteSyncItem[]): boolean {
  if (a.length !== b.length) return false;
  const canonical = (list: FavoriteSyncItem[]) =>
    list
      .map((item) => JSON.stringify(item))
      .sort()
      .join("\n");
  return canonical(a) === canonical(b);
}

export function scheduleUpload(): void {
  cancelDebounce();
  // 预览待确认期间连定时器都不排：任何一次自动上传都会把未经确认的合并结果写进云端
  if (!canAutoUpload()) return;
  rt.debounceTimer = window.setTimeout(() => {
    rt.debounceTimer = null;
    void uploadPendingChanges();
  }, UPLOAD_DEBOUNCE_MS);
}

export function flushPendingUpload(): void {
  if (!rt.pendingAfterBusy) return;
  rt.pendingAfterBusy = false;
  if (canAutoUpload()) scheduleUpload();
}

/** 防抖到期后的实际上传；失败只提示，本地数据不受影响 */
export async function uploadPendingChanges(): Promise<void> {
  // 预览待确认期间零 PUT：这道门比 `enabled` 更强，仅靠 enabled 表达预览中是不够的
  if (!canAutoUpload()) return;
  if (rt.busy) {
    rt.pendingAfterBusy = true;
    return;
  }
  const result = await syncNow();
  if (!result.ok) ShowMessage.show(result.message);
}

/** 拉取云端状态（首次尝试带 If-None-Match 短路） */
async function readRemote(
  ctx: UnlockedSync,
  useRev: boolean,
  signal: AbortSignal,
): Promise<RemoteState> {
  const result = await ctx.client.get(useRev ? getRemoteRev() : null, signal);
  // 成功拿到响应（200 或 304）都算「刚拉过」，用于自动拉取的冷却判定
  rt.lastPullAt = Date.now();
  if (result.notModified) return { notModified: true };
  return {
    notModified: false,
    envelope: result.envelope,
    rev: result.rev,
    snapshot: null,
  };
}

/** 激活时的静默拉取：云端没有变化就一个请求都不多发 */
export async function pullOnly(): Promise<SyncResult> {
  const ctx = activeContext();
  if (!ctx || rt.busy) {
    return { ok: false, message: "请先输入同步口令解锁" };
  }
  rt.busy = true;
  try {
    return await performSync(ctx, undefined, { pullOnly: true });
  } catch (error) {
    return { ok: false, message: describeSyncError(error) };
  } finally {
    rt.busy = false;
    flushPendingUpload();
  }
}

/** 手动「立即同步」：需要已启用且已解锁 */
export async function syncNow(): Promise<SyncResult> {
  if (!getUid()) {
    return { ok: false, message: "未登录蔷薇账号，无法使用云端同步" };
  }
  if (!getSyncSettings().enabled) {
    return { ok: false, message: "请先启用云端同步" };
  }
  const ctx = activeContext();
  if (!ctx) {
    return { ok: false, message: "请先输入同步口令解锁" };
  }
  if (rt.busy) return { ok: false, message: "同步正在进行，请稍候" };

  rt.busy = true;
  try {
    return await performSync(ctx);
  } catch (error) {
    return { ok: false, message: describeSyncError(error) };
  } finally {
    rt.busy = false;
    flushPendingUpload();
  }
}

/**
 * 稳态同步：GET（带 If-None-Match 短路）→ 解密 → 并集合并 → PUT → 落地。
 * 上传成功后才把合并结果写回本地，因此上传失败时本地的 dirty 标记完好无损。
 * `pullOnly` 用于插件激活时的静默拉取：本地没有可上传的改动就不写回云端。
 * `dryRun` 用于首次启用的预览：只算 `items`/`stats`，不加密、不上传、不落地。
 */
export async function performSync(
  ctx: UnlockedSync,
  prefetched?: PrefetchedRemote,
  options?: { pullOnly?: boolean; dryRun?: boolean },
): Promise<SyncResult> {
  const generation = rt.generation;
  const controller = rt.runController ?? beginRun();
  // 服务端 409 回带的 updatedAt 会抬升本地时钟下限：本机时钟慢时也能推过服务端时间戳
  let clockFloor = 0;

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      // 首次尝试优先用调用方已经拉到的云端状态：既省一次 GET，也避免
      // 「带着 remoteRev 短路成 304，于是只上传本地」把云端数据冲掉。
      const remote: RemoteState =
        attempt === 0 && prefetched
          ? prefetched.kind === "empty"
            ? {
                notModified: false,
                envelope: null,
                rev: null,
                snapshot: null,
              }
            : {
                notModified: false,
                envelope: prefetched.envelope,
                rev: prefetched.rev,
                snapshot: prefetched.snapshot,
              }
          : await readRemote(ctx, attempt === 0, controller.signal);

      let items: FavoriteSyncItem[];
      let stats: MergeStats;

      if (remote.notModified) {
        // 云端与上次上传完全一致（304）：本地即权威，本地也没改动就什么都不用做
        if (!(await FavoritesStorageService.hasDirtyRecords())) {
          return { ok: true, message: "云端收藏已是最新，无需同步" };
        }
        const local = await FavoritesStorageService.getAllForSync();
        items = buildSnapshot(local, Date.now()).items;
        const live = countLiveItems(items);
        stats = { cloud: live, local: live, merged: live };
      } else if (!remote.envelope) {
        const local = await FavoritesStorageService.getAllForSync();
        items = buildSnapshot(local, Date.now()).items;
        const live = countLiveItems(items);
        stats = { cloud: 0, local: live, merged: live };
        if (
          options?.pullOnly &&
          live === 0 &&
          !(await FavoritesStorageService.hasDirtyRecords())
        ) {
          return { ok: true, message: "云端与本机都没有收藏，无需同步" };
        }
      } else {
        let snapshot: SyncSnapshot;
        if (remote.snapshot) {
          snapshot = remote.snapshot;
        } else {
          try {
            snapshot = await SyncCrypto.decrypt(
              ctx.dek,
              ctx.uid,
              remote.envelope,
            );
          } catch {
            // crypto.subtle 的 OperationError 不能直接冒泡：调用方（含
            // autoUnlockFromCache）靠这个常量识别「口令/缓存不对」并清理缓存
            return { ok: false, message: SYNC_MESSAGE_WRONG_PASSPHRASE };
          }
        }
        // 注意：这里**不**记录 remote.rev——只有 PUT 成功落地后才更新 remoteRev，
        // 否则一旦上传失败，下次 GET 会被 304 短路成「只上传本地」，冲掉云端数据。
        const local = await FavoritesStorageService.getAllForSync();
        const merged = mergeSnapshots(snapshot, local);
        items = merged.items;
        stats = merged.stats;

        if (options?.pullOnly) {
          // 纯拉取：本地没有可上传的改动就只落地，省掉一次 PUT
          const remoteItems = mergeSnapshots(snapshot, []).items;
          if (sameItems(items, remoteItems)) {
            await FavoritesStorageService.applyRemoteMerge(
              items,
              snapshot.updatedAt,
              Date.now(),
            );
            setRemoteRev(remote.rev);
            return { ok: true, message: "已拉取云端收藏", stats };
          }
        }
      }

      if (options?.dryRun) {
        // 预览的纯读出口：三条分支都已算出 items/stats，到这里就返回——
        // 不加密、不上传、不落地，也不碰 dirty / remoteRev
        return { ok: true, message: describeStats(stats), stats };
      }

      const updatedAt = Math.max(Date.now(), clockFloor);
      const snapshot: SyncSnapshot = {
        version: SNAPSHOT_VERSION,
        updatedAt,
        items,
      };
      const envelope = await SyncCrypto.encrypt({
        dek: ctx.dek,
        wrapped: ctx.wrapped,
        uid: ctx.uid,
        snapshot,
        updatedAt,
        salt: ctx.salt,
        iterations: ctx.iterations,
        itemCount: countLiveItems(items),
        writer: ctx.deviceId,
      });

      try {
        const written = await ctx.client.put(envelope, controller.signal);

        if (rt.generation !== generation) {
          // 上传期间本地又变了：不落旧快照，稍后自动再传一次
          scheduleUpload();
          return {
            ok: true,
            message: "同步完成；检测到新的本地改动，稍后会自动再次上传",
            stats,
          };
        }

        // 上传成功：落地合并结果并清除 dirty / 写 syncedAt（30 天墓碑清理的前提）
        await FavoritesStorageService.applyRemoteMerge(
          items,
          updatedAt,
          written.updatedAt,
        );
        setRemoteRev(written.rev);
        updateSyncSettings({ lastSyncAt: written.updatedAt });
        return { ok: true, message: describeStats(stats), stats };
      } catch (error) {
        if (error instanceof SyncClientError && error.kind === "conflict") {
          // 服务端有更新的快照：抬升时钟下限，重新拉取合并后重写（最多重试一次）
          clockFloor = Math.max(clockFloor, (error.updatedAt ?? 0) + 1);
          continue;
        }
        return { ok: false, message: describeSyncError(error), stats };
      }
    }

    return {
      ok: false,
      message: "云端快照更新过于频繁，本次同步未完成，请稍后再试",
    };
  } finally {
    endRun(controller);
  }
}
