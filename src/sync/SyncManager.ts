// src/sync/SyncManager.ts
// 收藏云同步的编排层：解锁 → 拉取 → 合并 → 上传 → 5 秒防抖。
// 唯一与 UI 交互的入口；持有内存中的 CryptoKey（刷新页面即失效，口令不落任何存储）。
//
// 请求量模型见 sync-protocol.md 第 5 节：不做轮询、不做长连接、不做逐条端点。
import {
  FavoritesStorageService,
  type FavoriteSyncItem,
} from "../storage/FavoritesStorageService";
import {
  PluginSettings,
  type PluginSyncSettings,
} from "../settings/pluginSettings/PluginSettings";
import { ShowMessage } from "../iirose_func/ShowMessage";
import { SyncClient, SyncClientError, describeSyncError } from "./SyncClient";
import {
  DEFAULT_KDF_ITERATIONS,
  SyncCrypto,
  type SyncEnvelope,
} from "./SyncCrypto";
import {
  SNAPSHOT_VERSION,
  buildSnapshot,
  countLiveItems,
  mergeSnapshots,
  type MergeStats,
  type SyncSnapshot,
} from "./SyncMerge";

/** 收藏增删后合并为一次上传的防抖窗口 */
const UPLOAD_DEBOUNCE_MS = 5000;
/** 与后端 cloud/sync/logic.js 的 UID_PATTERN 对齐（uid 是分区键，不是凭据） */
const UID_PATTERN = /^[0-9a-f]{8,32}$/;

export const SYNC_MESSAGE_WRONG_PASSPHRASE = "同步口令不正确，云端数据未被修改";

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
 * 已经拉取到手的云端状态（避免二次 GET，也避免「用 remoteRev 短路后只上传本地」的数据丢失）。
 * - `empty`：云端确定无快照或已被清空；
 * - `snapshot`：已经解密校验过的云端快照与版本号。
 */
type PrefetchedRemote =
  | { kind: "empty" }
  | { kind: "snapshot"; envelope: SyncEnvelope; rev: string | null };

// —— 模块级内存状态（页面刷新即全部消失，这是有意设计） ——
let cryptoKey: CryptoKey | null = null;
let kdfSalt: string | null = null;
let kdfIterations = DEFAULT_KDF_ITERATIONS;
let remoteRev: string | null = null;
let busy = false;
let debounceTimer: number | null = null;
let changeGeneration = 0;
let pendingAfterBusy = false;
let listenerRegistered = false;

function getSyncSettings(): PluginSyncSettings {
  return PluginSettings.normalizeSyncSettings(
    PluginSettings.getPluginSetting().sync,
  );
}

function updateSyncSettings(
  patch: Partial<PluginSyncSettings>,
): PluginSyncSettings {
  const pluginSettings = PluginSettings.getPluginSetting();
  pluginSettings.sync = { ...pluginSettings.sync, ...patch };
  localStorage.setItem("imwPluginSetting", JSON.stringify(pluginSettings));
  return pluginSettings.sync;
}

/** deviceId 惰性生成，生成后不再变 */
function ensureDeviceId(): string {
  const settings = getSyncSettings();
  if (settings.deviceId) return settings.deviceId;
  const deviceId = SyncCrypto.generateDeviceId();
  updateSyncSettings({ deviceId });
  return deviceId;
}

function cancelDebounce(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

function scheduleUpload(): void {
  cancelDebounce();
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    void SyncManager.uploadPendingChanges();
  }, UPLOAD_DEBOUNCE_MS);
}

/** 首次启用（云端为空）时的提示口径 */
function describeStats(stats: MergeStats): string {
  if (stats.cloud === 0) {
    return `已同步 ${stats.merged} 条收藏`;
  }
  return `同步完成：云端 ${stats.cloud} / 本地 ${stats.local} / 合并后 ${stats.merged}`;
}

export class SyncManager {
  /** 读取宿站账号标识（游客态或非法格式一律视为不可用） */
  public static getUid(): string | null {
    const uid = typeof window !== "undefined" ? window.uid : undefined;
    if (typeof uid !== "string") return null;
    const normalized = uid.trim().toLowerCase();
    return UID_PATTERN.test(normalized) ? normalized : null;
  }

  public static getState(): SyncStateView {
    const settings = getSyncSettings();
    return {
      uid: this.getUid(),
      enabled: settings.enabled,
      unlocked: settings.enabled && !!cryptoKey && !!kdfSalt,
      busy,
      lastSyncAt: settings.lastSyncAt,
      serverUrl: settings.serverUrl,
    };
  }

  public static formatLastSyncAt(lastSyncAt: number | null): string {
    if (!lastSyncAt) return "从未同步";
    const date = new Date(lastSyncAt);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  /**
   * 注册收藏变更监听。收藏的增删只在存储层发生，同步层通过回调感知，
   * 这样存储层不需要认识同步模块（无循环依赖）。
   */
  public static init(): void {
    if (listenerRegistered) return;
    listenerRegistered = true;
    FavoritesStorageService.onChange(() => {
      changeGeneration += 1;
      if (!getSyncSettings().enabled || !cryptoKey || !kdfSalt) return;
      scheduleUpload();
    });
  }

  /** 防抖到期后的实际上传；失败只提示，本地数据不受影响 */
  public static async uploadPendingChanges(): Promise<void> {
    if (!getSyncSettings().enabled || !cryptoKey || !kdfSalt) return;
    if (busy) {
      pendingAfterBusy = true;
      return;
    }
    const result = await this.syncNow();
    if (!result.ok) ShowMessage.show(result.message);
  }

  /**
   * 启用同步并完成首次同步：
   * - 云端为空 → 本地全量加密上传；
   * - 云端有数据 → 校验口令后并集合并、上传，并报告三个数字。
   */
  public static async enable(passphrase: string): Promise<SyncResult> {
    const uid = this.getUid();
    if (!uid) {
      return { ok: false, message: "未登录蔷薇账号，无法启用云端同步" };
    }
    if (!passphrase) {
      return { ok: false, message: "同步口令不能为空" };
    }
    if (!SyncCrypto.isAvailable()) {
      return {
        ok: false,
        message: "当前环境不支持 WebCrypto，无法启用云端同步",
      };
    }
    if (busy) return { ok: false, message: "同步正在进行，请稍候" };

    busy = true;
    try {
      const deviceId = ensureDeviceId();
      const client = new SyncClient(getSyncSettings().serverUrl, uid);
      const remote = await client.get(null);

      if (!remote.notModified && remote.envelope) {
        return await this.adoptRemote(
          client,
          uid,
          deviceId,
          remote.envelope,
          remote.rev,
          passphrase,
        );
      }

      const salt = getSyncSettings().salt || SyncCrypto.generateSalt();
      const iterations = DEFAULT_KDF_ITERATIONS;
      const key = await SyncCrypto.deriveKey(passphrase, salt, iterations);
      cryptoKey = key;
      kdfSalt = salt;
      kdfIterations = iterations;
      remoteRev = null;
      updateSyncSettings({ enabled: true, salt, deviceId });

      return await this.performSync(
        client,
        uid,
        deviceId,
        key,
        salt,
        iterations,
        { kind: "empty" },
      );
    } catch (error) {
      return { ok: false, message: describeSyncError(error) };
    } finally {
      busy = false;
      this.flushPendingUpload();
    }
  }

  /**
   * 已启用状态下用口令解锁（口令只进内存）。刷新页面后必须重新走这一步。
   */
  public static async unlock(passphrase: string): Promise<SyncResult> {
    const uid = this.getUid();
    if (!uid) {
      return { ok: false, message: "未登录蔷薇账号，无法使用云端同步" };
    }
    if (!passphrase) {
      return { ok: false, message: "同步口令不能为空" };
    }
    const settings = getSyncSettings();
    if (!settings.enabled) {
      return { ok: false, message: "请先启用云端同步" };
    }
    if (busy) return { ok: false, message: "同步正在进行，请稍候" };

    busy = true;
    try {
      const deviceId = ensureDeviceId();
      const client = new SyncClient(settings.serverUrl, uid);
      const remote = await client.get(null);

      let salt = settings.salt;
      let iterations = DEFAULT_KDF_ITERATIONS;
      const envelope = remote.notModified ? null : remote.envelope;
      if (envelope) {
        salt = envelope.kdf.salt;
        iterations = envelope.kdf.iter;
      }
      if (!salt) salt = SyncCrypto.generateSalt();

      const key = await SyncCrypto.deriveKey(passphrase, salt, iterations);
      if (envelope) {
        // 口令正确与否只能由 AEAD 解密是否抛错来判定
        try {
          await SyncCrypto.decrypt(key, uid, envelope);
        } catch {
          return { ok: false, message: SYNC_MESSAGE_WRONG_PASSPHRASE };
        }
      }

      cryptoKey = key;
      kdfSalt = salt;
      kdfIterations = iterations;
      if (settings.salt !== salt) updateSyncSettings({ salt });

      return await this.performSync(
        client,
        uid,
        deviceId,
        key,
        salt,
        iterations,
        envelope
          ? {
              kind: "snapshot",
              envelope,
              rev: remote.notModified ? null : remote.rev,
            }
          : { kind: "empty" },
      );
    } catch (error) {
      return { ok: false, message: describeSyncError(error) };
    } finally {
      busy = false;
      this.flushPendingUpload();
    }
  }

  /** 手动「立即同步」：需要已启用且已解锁 */
  public static async syncNow(): Promise<SyncResult> {
    const uid = this.getUid();
    if (!uid) {
      return { ok: false, message: "未登录蔷薇账号，无法使用云端同步" };
    }
    const settings = getSyncSettings();
    if (!settings.enabled) {
      return { ok: false, message: "请先启用云端同步" };
    }
    if (!cryptoKey || !kdfSalt) {
      return { ok: false, message: "请先输入同步口令解锁" };
    }
    if (busy) return { ok: false, message: "同步正在进行，请稍候" };

    busy = true;
    try {
      const deviceId = ensureDeviceId();
      const client = new SyncClient(settings.serverUrl, uid);
      return await this.performSync(
        client,
        uid,
        deviceId,
        cryptoKey,
        kdfSalt,
        kdfIterations,
      );
    } catch (error) {
      return { ok: false, message: describeSyncError(error) };
    } finally {
      busy = false;
      this.flushPendingUpload();
    }
  }

  /** 关闭同步：停止一切请求，本地数据保留不动 */
  public static disable(): SyncResult {
    cancelDebounce();
    pendingAfterBusy = false;
    cryptoKey = null;
    kdfSalt = null;
    kdfIterations = DEFAULT_KDF_ITERATIONS;
    remoteRev = null;
    updateSyncSettings({ enabled: false });
    return { ok: true, message: "已关闭云端同步，本地收藏保持不变" };
  }

  /** 清空云端副本：DELETE 后本地数据不变 */
  public static async clearCloud(): Promise<SyncResult> {
    const uid = this.getUid();
    if (!uid) {
      return { ok: false, message: "未登录蔷薇账号，无法使用云端同步" };
    }
    const settings = getSyncSettings();
    if (!settings.enabled) {
      return { ok: false, message: "请先启用云端同步" };
    }
    if (busy) return { ok: false, message: "同步正在进行，请稍候" };

    // 取消待发的防抖上传，否则刚清空的云端会被立刻又写回去
    cancelDebounce();
    busy = true;
    try {
      const client = new SyncClient(settings.serverUrl, uid);
      await client.removeCloud();
      remoteRev = null;
      return { ok: true, message: "云端收藏已清空，本地收藏不受影响" };
    } catch (error) {
      return { ok: false, message: describeSyncError(error) };
    } finally {
      busy = false;
    }
  }

  // —— 内部实现 ——

  private static flushPendingUpload(): void {
    if (!pendingAfterBusy) return;
    pendingAfterBusy = false;
    if (getSyncSettings().enabled && cryptoKey && kdfSalt) scheduleUpload();
  }

  /** 启用时云端已有数据：先用口令解开，成功才落设置再合并上传 */
  private static async adoptRemote(
    client: SyncClient,
    uid: string,
    deviceId: string,
    envelope: SyncEnvelope,
    rev: string | null,
    passphrase: string,
  ): Promise<SyncResult> {
    let key: CryptoKey;
    try {
      key = await SyncCrypto.deriveKey(
        passphrase,
        envelope.kdf.salt,
        envelope.kdf.iter,
      );
    } catch (error) {
      return { ok: false, message: describeSyncError(error) };
    }

    try {
      await SyncCrypto.decrypt(key, uid, envelope);
    } catch {
      // 口令错误：禁止 PUT，云端数据一动不动
      return { ok: false, message: SYNC_MESSAGE_WRONG_PASSPHRASE };
    }

    cryptoKey = key;
    kdfSalt = envelope.kdf.salt;
    kdfIterations = envelope.kdf.iter;
    remoteRev = rev;
    updateSyncSettings({
      enabled: true,
      salt: envelope.kdf.salt,
      deviceId,
    });

    return this.performSync(
      client,
      uid,
      deviceId,
      key,
      envelope.kdf.salt,
      envelope.kdf.iter,
      { kind: "snapshot", envelope, rev },
    );
  }

  /**
   * 稳态同步：GET（带 If-None-Match 短路）→ 解密 → 并集合并 → PUT → 落地。
   * 上传成功后才把合并结果写回本地，因此上传失败时本地的 dirty 标记完好无损。
   */
  private static async performSync(
    client: SyncClient,
    uid: string,
    deviceId: string,
    key: CryptoKey,
    salt: string,
    iterations: number,
    prefetched?: PrefetchedRemote,
  ): Promise<SyncResult> {
    const generation = changeGeneration;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      // 首次尝试优先用调用方已经拉到的云端状态：既省一次 GET，也避免
      // 「带着 remoteRev 短路成 304，于是只上传本地」把云端数据冲掉。
      const remote =
        attempt === 0 && prefetched
          ? prefetched.kind === "empty"
            ? { notModified: false as const, envelope: null, rev: null }
            : {
                notModified: false as const,
                envelope: prefetched.envelope,
                rev: prefetched.rev,
              }
          : await client.get(attempt === 0 ? remoteRev : null);

      let items: FavoriteSyncItem[];
      let stats: MergeStats;

      if (remote.notModified) {
        // 云端与上次上传完全一致（稳态）：只回 304，省下全部出网流量
        const local = await FavoritesStorageService.getAllForSync();
        const built = buildSnapshot(local, Date.now());
        items = built.items;
        const live = countLiveItems(items);
        stats = { cloud: live, local: live, merged: live };
      } else if (!remote.envelope) {
        const local = await FavoritesStorageService.getAllForSync();
        const built = buildSnapshot(local, Date.now());
        items = built.items;
        const live = countLiveItems(items);
        stats = { cloud: 0, local: live, merged: live };
      } else {
        let snapshot: SyncSnapshot;
        try {
          snapshot = await SyncCrypto.decrypt(key, uid, remote.envelope);
        } catch {
          return { ok: false, message: SYNC_MESSAGE_WRONG_PASSPHRASE };
        }
        // 注意：这里**不**记录 remote.rev——只有 PUT 成功落地后才更新 remoteRev，
        // 否则一旦上传失败，下次 GET 会被 304 短路成「只上传本地」，冲掉云端数据。
        const local = await FavoritesStorageService.getAllForSync();
        const merged = mergeSnapshots(snapshot, local);
        items = merged.items;
        stats = merged.stats;
      }

      const updatedAt = Date.now();
      const snapshot: SyncSnapshot = {
        version: SNAPSHOT_VERSION,
        updatedAt,
        items,
      };
      const envelope = await SyncCrypto.encrypt({
        key,
        uid,
        snapshot,
        updatedAt,
        salt,
        iterations,
        itemCount: countLiveItems(items),
        writer: deviceId,
      });

      try {
        const written = await client.put(envelope);

        if (changeGeneration !== generation) {
          // 上传期间本地又变了：不落旧快照，稍后自动再传一次
          scheduleUpload();
          return {
            ok: true,
            message: "同步完成；检测到新的本地改动，稍后会自动再次上传",
            stats,
          };
        }

        await FavoritesStorageService.applyRemoteMerge(items, updatedAt);
        remoteRev = written.rev;
        updateSyncSettings({ lastSyncAt: written.updatedAt });
        return { ok: true, message: describeStats(stats), stats };
      } catch (error) {
        if (error instanceof SyncClientError && error.kind === "conflict") {
          // 服务端有更新的快照：重新拉取合并后重写（最多重试一次）
          continue;
        }
        return { ok: false, message: describeSyncError(error), stats };
      }
    }

    return {
      ok: false,
      message: "云端快照更新过于频繁，本次同步未完成，请稍后再试",
    };
  }
}
