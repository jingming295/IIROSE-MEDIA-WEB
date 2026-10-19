// src/sync/SyncManager.ts
// 收藏云同步的编排层：解锁 → 拉取 → 合并 → 上传 → 5 秒防抖。
// 唯一与 UI 交互的入口。两级密钥（crypto-spec.md 第 1 节）：
//   - DEK（随机、不可导出）参与快照加解密；
//   - 口令派生的 KEK 只用于包裹/解包 DEK，信封里的 `wrapped` 就是它的分发载体；
//   - DEK 句柄按 uid 缓存在本机 IndexedDB，刷新后可直接自动解锁（不再重复输口令）。
// 口令本身绝不落任何存储、日志或请求头。
//
// 请求量模型见 sync-protocol.md 第 5 节：不做轮询、不做长连接、不做逐条端点。
import {
  FavoritesStorageService,
  type FavoriteSyncItem,
} from "../storage/FavoritesStorageService";
import { PluginSettings } from "../settings/pluginSettings/PluginSettings";
import {
  ensureDeviceId,
  getRemoteRev,
  getSyncSettings,
  restoreRemoteRev,
  setRemoteRev,
  updateSyncSettings,
} from "./SyncSettingsStore";
import { ShowMessage } from "../iirose_func/ShowMessage";
import { SyncClient, SyncClientError, describeSyncError } from "./SyncClient";
import { SyncKeyCache } from "./SyncKeyCache";
import { SyncCrypto, type SyncEnvelope } from "./SyncCrypto";
import {
  SYNC_MESSAGE_WRONG_PASSPHRASE,
  normalizePassphrase,
  rememberUnlocked,
  resolveContext,
  type UnlockedSync,
} from "./SyncContext";
import {
  describeStats,
  formatMergeStats,
  shouldAutoPull,
  shouldUpload,
} from "./SyncGate";
import {
  SNAPSHOT_VERSION,
  buildSnapshot,
  countLiveItems,
  mergeSnapshots,
  type MergeStats,
  type SyncSnapshot,
} from "./SyncMerge";

export { SYNC_MESSAGE_WRONG_PASSPHRASE } from "./SyncContext";

/** 收藏增删后合并为一次上传的防抖窗口 */
const UPLOAD_DEBOUNCE_MS = 5000;
/** 与后端 cloud/sync/logic.js 的 UID_PATTERN 对齐（uid 是分区键，不是凭据） */
const UID_PATTERN = /^[0-9a-f]{8,32}$/;

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
type PrefetchedRemote =
  | { kind: "empty" }
  | {
      kind: "snapshot";
      envelope: SyncEnvelope;
      rev: string | null;
      snapshot: SyncSnapshot;
    };

/** 本轮同步看到的云端状态（`snapshot` 为 null 表示尚未解密，需要现场解） */
type RemoteState =
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
interface PendingEnable {
  ctx: UnlockedSync;
  prefetched: PrefetchedRemote;
  stats: MergeStats;
}

// —— 模块级内存状态（页面刷新即全部消失；句柄另在本机缓存在 IndexedDB） ——
let unlocked: UnlockedSync | null = null;
let busy = false;
let debounceTimer: number | null = null;
let changeGeneration = 0;
let pendingAfterBusy = false;
let listenerRegistered = false;
let runController: AbortController | null = null;
/** 预览完成、等待用户确认的合并结果（存在期间抑制一切自动上传） */
let pendingEnable: PendingEnable | null = null;

/**
 * 当前 uid 对应的已解锁上下文；uid 变了即视为未解锁。
 * 提到模块级是因为上传门（`canAutoUpload`）也要用它，判定只有这一份。
 */
function activeContext(): UnlockedSync | null {
  const uid = SyncManager.getUid();
  if (!unlocked || !uid || unlocked.uid !== uid) return null;
  return unlocked;
}

/**
 * 当前是否放行任何自动上传。「确认前不得有任何上传」只靠这道门：
 * 预览待确认期间（`pendingEnable` 非空）一律不放行，与 `enabled` 无关。
 */
function canAutoUpload(): boolean {
  return shouldUpload({
    enabled: getSyncSettings().enabled,
    hasContext: !!activeContext(),
    previewPending: pendingEnable !== null,
  });
}

/** 插件 UI 打开期间的兜底拉取间隔：聊天站里页面常驻可见，光靠可见性事件不会触发 */
const UI_PULL_INTERVAL_MS = 5 * 60_000;
/** 上次成功发出 GET 的时间（含 304）；只存内存，刷新后归零 */
let lastPullAt = 0;
let uiPullTimer: number | null = null;
let activateTriggersRegistered = false;

function cancelDebounce(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

function scheduleUpload(): void {
  cancelDebounce();
  // 预览待确认期间连定时器都不排：任何一次自动上传都会把未经确认的合并结果写进云端
  if (!canAutoUpload()) return;
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    void SyncManager.uploadPendingChanges();
  }, UPLOAD_DEBOUNCE_MS);
}

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

export class SyncManager {
  /** 读取宿站账号标识（游客态或非法格式一律视为不可用） */
  public static getUid(): string | null {
    const uid = typeof window !== "undefined" ? window.uid : undefined;
    if (typeof uid !== "string") return null;
    const normalized = uid.trim().toLowerCase();
    return UID_PATTERN.test(normalized) ? normalized : null;
  }

  /** 当前 uid 对应的已解锁上下文；uid 变了即视为未解锁 */
  private static currentContext(): UnlockedSync | null {
    return activeContext();
  }

  public static getState(): SyncStateView {
    const settings = getSyncSettings();
    return {
      uid: this.getUid(),
      enabled: settings.enabled,
      unlocked: settings.enabled && !!this.currentContext(),
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
   * 注册收藏变更监听，并尝试用本机缓存里的 DEK 句柄自动解锁 + 拉取
   * （「刷新后再进来不用重新输口令」与「插件激活时自动拉取」都靠这一步）。
   * 收藏的增删只在存储层发生，同步层通过回调感知，存储层不需要认识同步模块。
   */
  public static async init(): Promise<void> {
    if (!listenerRegistered) {
      listenerRegistered = true;
      FavoritesStorageService.onChange(() => {
        changeGeneration += 1;
        if (!getSyncSettings().enabled || !this.currentContext()) return;
        scheduleUpload();
      });
    }
    this.registerActivateTriggers();
    await this.autoUnlockFromCache();
  }

  /**
   * 注册「用户回到页面」类触发：切回标签页、窗口获得焦点。
   * 聊天站里页面常驻可见，光靠这些事件不够，因此插件 UI 打开期间另有兜底定时器
   * （见 onUiOpened），两条路都只发一次 GET，命中 304 时出网约 200 字节。
   */
  private static registerActivateTriggers(): void {
    if (activateTriggersRegistered) return;
    if (typeof document === "undefined" || typeof window === "undefined")
      return;
    activateTriggersRegistered = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") this.maybeAutoPull();
    });
    window.addEventListener("focus", () => this.maybeAutoPull());
  }

  /** 事件触发的静默拉取：只拉不写，失败不打扰用户 */
  private static maybeAutoPull(): void {
    const allowed = shouldAutoPull({
      enabled: getSyncSettings().enabled,
      hasContext: !!this.currentContext(),
      busy,
      lastPullAt,
      now: Date.now(),
    });
    if (!allowed) return;
    // 先占位再发请求，避免同一批事件（focus + visibilitychange）连发两次
    lastPullAt = Date.now();
    void this.pullOnly();
  }

  /** 插件 UI 打开：立刻尝试拉一次，并启动 UI 期间的兜底定时器 */
  public static onUiOpened(): void {
    if (uiPullTimer === null && typeof window !== "undefined") {
      uiPullTimer = window.setInterval(
        () => this.maybeAutoPull(),
        UI_PULL_INTERVAL_MS,
      );
    }
    this.maybeAutoPull();
  }

  /** 插件 UI 关闭：停掉兜底定时器，避免后台空转 */
  public static onUiClosed(): void {
    if (uiPullTimer !== null) {
      clearInterval(uiPullTimer);
      uiPullTimer = null;
    }
  }

  /** 防抖到期后的实际上传；失败只提示，本地数据不受影响 */
  public static async uploadPendingChanges(): Promise<void> {
    // 预览待确认期间零 PUT：这道门比 `enabled` 更强，仅靠 enabled 表达预览中是不够的
    if (!canAutoUpload()) return;
    if (busy) {
      pendingAfterBusy = true;
      return;
    }
    const result = await this.syncNow();
    if (!result.ok) ShowMessage.show(result.message);
  }

  /**
   * 首次启用第 1 段：**纯读**预览。
   *
   * 只做 GET → 解密 → 并集合并，算出「云端 / 本地 / 合并后」三个数字就停手：
   * 不 PUT、不翻转 `enabled`、不写 salt、不写本机密钥缓存。
   * 已解密的上下文与云端快照暂存在内存里，`commitEnable()` 直接复用（确认后不再二次 GET）。
   * 云端为空时没有可确认的合并，调用方可以直接 `commitEnable()`（`cloudEmpty` 为真）。
   */
  public static async previewEnable(
    passphrase: string,
  ): Promise<SyncPreviewResult> {
    const phrase = normalizePassphrase(passphrase);
    const rawPhrase = typeof passphrase === "string" ? passphrase : "";
    const uid = this.getUid();
    if (!uid) {
      return { ok: false, message: "未登录蔷薇账号，无法启用云端同步" };
    }
    if (!phrase) {
      return { ok: false, message: "同步口令不能为空" };
    }
    if (!SyncCrypto.isAvailable()) {
      return {
        ok: false,
        message: "当前环境不支持 WebCrypto，无法启用云端同步",
      };
    }
    if (busy) return { ok: false, message: "同步正在进行，请稍候" };

    const settings = getSyncSettings();
    // 预览是纯读：缺 deviceId 时只在本轮内生成候选值，**不落盘**（确认时才随 enabled/salt 一起写）
    const deviceId = settings.deviceId || SyncCrypto.generateDeviceId();
    // 重新预览先丢掉上一次的暂存，避免确认时用上过期的云端快照
    pendingEnable = null;
    busy = true;
    const controller = this.beginRun();
    try {
      const client = new SyncClient(settings.serverUrl, uid);
      const remote = await client.get(null, controller.signal);
      const envelope = remote.notModified ? null : remote.envelope;
      const resolved = await resolveContext(
        uid,
        settings,
        deviceId,
        client,
        phrase,
        rawPhrase,
        envelope,
      );
      if (!resolved.ok) return resolved;

      const prefetched: PrefetchedRemote =
        envelope && resolved.snapshot
          ? {
              kind: "snapshot",
              envelope,
              rev: remote.notModified ? null : remote.rev,
              snapshot: resolved.snapshot,
            }
          : { kind: "empty" };

      // dryRun：算完三个数字就返回，不加密、不上传（见 performSync 的提前返回点）
      const preview = await this.performSync(resolved.ctx, prefetched, {
        dryRun: true,
      });
      if (!preview.ok || !preview.stats) {
        return { ok: false, message: preview.message };
      }

      pendingEnable = {
        ctx: resolved.ctx,
        prefetched,
        stats: preview.stats,
      };
      return {
        ok: true,
        // 预览阶段什么都没写，提示语只描述「将会发生什么」，不要复用上传成功的文案
        message:
          prefetched.kind === "empty"
            ? `云端暂无收藏，确认后将上传本地 ${preview.stats.merged} 条`
            : `合并预览：${formatMergeStats(preview.stats)}`,
        stats: preview.stats,
        cloudEmpty: prefetched.kind === "empty",
      };
    } catch (error) {
      return { ok: false, message: describeSyncError(error) };
    } finally {
      this.endRun(controller);
      busy = false;
      this.flushPendingUpload();
    }
  }

  /**
   * 首次启用第 2 段：用户确认后真正写入。
   *
   * 复用预览阶段已解密的上下文与云端快照，**不再二次 GET**；上传成功后才置 `enabled`、
   * 写 salt 与密钥缓存。上传失败则作废预览（保持未启用），重试会重新走一次预览。
   */
  public static async commitEnable(): Promise<SyncResult> {
    const pending = pendingEnable;
    if (!pending) {
      return { ok: false, message: "没有待确认的合并结果，请重新启用云端同步" };
    }
    const uid = this.getUid();
    if (!uid) {
      pendingEnable = null;
      return { ok: false, message: "未登录蔷薇账号，无法启用云端同步" };
    }
    if (busy) return { ok: false, message: "同步正在进行，请稍候" };
    if (uid !== pending.ctx.uid) {
      pendingEnable = null;
      return { ok: false, message: "账号已切换，请重新启用云端同步" };
    }

    const generation = changeGeneration;
    busy = true;
    const controller = this.beginRun();
    try {
      const result = await this.performSync(pending.ctx, pending.prefetched);
      if (!result.ok) {
        // 上传失败：本地与云端都没落地新状态，作废预览即可（重试重新预览）
        pendingEnable = null;
        return result;
      }

      pendingEnable = null;
      unlocked = pending.ctx;
      updateSyncSettings({
        enabled: true,
        salt: pending.ctx.salt,
        deviceId: pending.ctx.deviceId,
      });
      // 本机密钥缓存只是「免重复输口令」的便利，写失败不影响本次会话与已落地的云端结果，
      // 不能让它把一次成功的启用报成失败。
      try {
        await rememberUnlocked(pending.ctx);
      } catch (cacheError) {
        console.warn(
          "[SyncManager] 本机密钥缓存写入失败，本次会话仍可继续使用",
          cacheError,
        );
      }

      // 上传窗口内又有收藏增删：performSync 只在 enabled 后才会自己补传，这里补排一次防抖
      if (changeGeneration !== generation) scheduleUpload();
      return result;
    } catch (error) {
      pendingEnable = null;
      return { ok: false, message: describeSyncError(error) };
    } finally {
      this.endRun(controller);
      busy = false;
      this.flushPendingUpload();
    }
  }

  /**
   * 取消首次启用：丢掉预览暂存，本地与云端都不发生任何变化，同步保持未启用。
   * 预览期间新增/删除的收藏仍留在本地（预览是纯读的）。
   */
  public static cancelEnable(): SyncResult {
    pendingEnable = null;
    cancelDebounce();
    pendingAfterBusy = false;
    return { ok: true, message: "已取消合并，本地与云端均未改动" };
  }

  /**
   * 已启用状态下用口令解锁。若有本机缓存句柄，通常无需走到这里。
   */
  public static async unlock(passphrase: string): Promise<SyncResult> {
    const phrase = normalizePassphrase(passphrase);
    const rawPhrase = typeof passphrase === "string" ? passphrase : "";
    const uid = this.getUid();
    if (!uid) {
      return { ok: false, message: "未登录蔷薇账号，无法使用云端同步" };
    }
    if (!phrase) {
      return { ok: false, message: "同步口令不能为空" };
    }
    const settings = getSyncSettings();
    if (!settings.enabled) {
      return { ok: false, message: "请先启用云端同步" };
    }
    if (busy) return { ok: false, message: "同步正在进行，请稍候" };

    const deviceId = ensureDeviceId();
    busy = true;
    const controller = this.beginRun();
    try {
      const client = new SyncClient(settings.serverUrl, uid);
      const remote = await client.get(null, controller.signal);
      const envelope = remote.notModified ? null : remote.envelope;
      const resolved = await resolveContext(
        uid,
        settings,
        deviceId,
        client,
        phrase,
        rawPhrase,
        envelope,
      );
      if (!resolved.ok) return resolved;

      unlocked = resolved.ctx;
      restoreRemoteRev();
      if (settings.salt !== resolved.ctx.salt) {
        updateSyncSettings({ salt: resolved.ctx.salt });
      }
      await rememberUnlocked(resolved.ctx);

      return await this.performSync(
        resolved.ctx,
        envelope && resolved.snapshot
          ? {
              kind: "snapshot",
              envelope,
              rev: remote.notModified ? null : remote.rev,
              snapshot: resolved.snapshot,
            }
          : { kind: "empty" },
      );
    } catch (error) {
      return { ok: false, message: describeSyncError(error) };
    } finally {
      this.endRun(controller);
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
    if (!getSyncSettings().enabled) {
      return { ok: false, message: "请先启用云端同步" };
    }
    const ctx = this.currentContext();
    if (!ctx) {
      return { ok: false, message: "请先输入同步口令解锁" };
    }
    if (busy) return { ok: false, message: "同步正在进行，请稍候" };

    busy = true;
    try {
      return await this.performSync(ctx);
    } catch (error) {
      return { ok: false, message: describeSyncError(error) };
    } finally {
      busy = false;
      this.flushPendingUpload();
    }
  }

  /**
   * 本机是否为该 uid 缓存了 DEK 句柄（与「是否解锁」无关：关闭同步后缓存仍然在，
   * 设置面板要能据此清除它）。
   */
  public static async hasLocalKey(): Promise<boolean> {
    const uid = this.getUid();
    if (!uid) return false;
    return !!(await SyncKeyCache.get(uid));
  }

  /** 关闭同步：停止一切请求（含在途请求），本地数据保留不动 */
  public static disable(): SyncResult {
    cancelDebounce();
    pendingAfterBusy = false;
    pendingEnable = null; // 未确认的预览在这里一并作废，绝不会因为关闭而落地
    runController?.abort();
    runController = null;
    unlocked = null;
    setRemoteRev(null);
    lastPullAt = 0; // 重新启用后可以立刻拉一次
    updateSyncSettings({ enabled: false });
    return { ok: true, message: "已关闭云端同步，本地收藏保持不变" };
  }

  /**
   * 忘记本机密钥：删除本机缓存的 DEK 句柄，回到需要输口令的状态。
   * 云端密文与本地收藏都不受影响；没有口令就再也解不开云端副本。
   */
  public static async forgetLocalKey(): Promise<SyncResult> {
    const uid = this.getUid();
    cancelDebounce();
    pendingAfterBusy = false;
    pendingEnable = null;
    unlocked = null;
    setRemoteRev(null);
    if (uid) await SyncKeyCache.forget(uid);
    return {
      ok: true,
      message: "已清除本机密钥缓存，下次进入需重新输入同步口令",
    };
  }

  /**
   * 清空云端副本：DELETE 后本地数据不变。
   * 只需要 uid，**不需要**口令——否则「关掉同步又忘了口令」就成了死路。
   */
  public static async clearCloud(): Promise<SyncResult> {
    const uid = this.getUid();
    if (!uid) {
      return { ok: false, message: "未登录蔷薇账号，无法使用云端同步" };
    }
    if (busy) return { ok: false, message: "同步正在进行，请稍候" };

    // 取消待发的防抖上传，并丢掉排队中的补传标记，
    // 否则 finally 的 flush 会在清空后 5 秒把云端重新写回去
    cancelDebounce();
    pendingAfterBusy = false;
    busy = true;
    const controller = this.beginRun();
    try {
      const client = new SyncClient(getSyncSettings().serverUrl, uid);
      await client.removeCloud(controller.signal);
      setRemoteRev(null);
      return { ok: true, message: "云端收藏已清空，本地收藏不受影响" };
    } catch (error) {
      return { ok: false, message: describeSyncError(error) };
    } finally {
      this.endRun(controller);
      busy = false;
      this.flushPendingUpload();
    }
  }

  // —— 内部实现 ——

  private static beginRun(): AbortController {
    const controller = new AbortController();
    runController = controller;
    return controller;
  }

  private static endRun(controller: AbortController): void {
    if (runController === controller) runController = null;
  }

  private static flushPendingUpload(): void {
    if (!pendingAfterBusy) return;
    pendingAfterBusy = false;
    if (canAutoUpload()) scheduleUpload();
  }

  /** 拉取云端状态（首次尝试带 If-None-Match 短路） */
  private static async readRemote(
    ctx: UnlockedSync,
    useRev: boolean,
    signal: AbortSignal,
  ): Promise<RemoteState> {
    const result = await ctx.client.get(useRev ? getRemoteRev() : null, signal);
    // 成功拿到响应（200 或 304）都算「刚拉过」，用于自动拉取的冷却判定
    lastPullAt = Date.now();
    if (result.notModified) return { notModified: true };
    return {
      notModified: false,
      envelope: result.envelope,
      rev: result.rev,
      snapshot: null,
    };
  }

  /** 用本机缓存的 DEK 句柄自动解锁并发起一次「只拉不写」的同步 */
  private static async autoUnlockFromCache(): Promise<void> {
    const uid = this.getUid();
    const settings = getSyncSettings();
    if (!uid || !settings.enabled || this.currentContext() || busy) return;

    const cached = await SyncKeyCache.get(uid);
    if (!cached) return;

    unlocked = {
      uid,
      deviceId: ensureDeviceId(),
      salt: cached.salt,
      iterations: cached.iterations,
      wrapped: cached.wrapped,
      dek: cached.dek,
      client: new SyncClient(settings.serverUrl, uid),
    };
    restoreRemoteRev();

    const result = await this.pullOnly();
    if (!result.ok && result.message === SYNC_MESSAGE_WRONG_PASSPHRASE) {
      // 本机句柄与云端快照对不上（云端换了密钥等）：清掉缓存，回到需输口令的状态
      console.warn(
        "[SyncManager] 本机密钥与云端快照不匹配，已清除本机密钥缓存",
      );
      await this.forgetLocalKey();
    }
  }

  /** 激活时的静默拉取：云端没有变化就一个请求都不多发 */
  private static async pullOnly(): Promise<SyncResult> {
    const ctx = this.currentContext();
    if (!ctx || busy) {
      return { ok: false, message: "请先输入同步口令解锁" };
    }
    busy = true;
    try {
      return await this.performSync(ctx, undefined, { pullOnly: true });
    } catch (error) {
      return { ok: false, message: describeSyncError(error) };
    } finally {
      busy = false;
      this.flushPendingUpload();
    }
  }

  /**
   * 稳态同步：GET（带 If-None-Match 短路）→ 解密 → 并集合并 → PUT → 落地。
   * 上传成功后才把合并结果写回本地，因此上传失败时本地的 dirty 标记完好无损。
   * `pullOnly` 用于插件激活时的静默拉取：本地没有可上传的改动就不写回云端。
   * `dryRun` 用于首次启用的预览：只算 `items`/`stats`，不加密、不上传、不落地。
   */
  private static async performSync(
    ctx: UnlockedSync,
    prefetched?: PrefetchedRemote,
    options?: { pullOnly?: boolean; dryRun?: boolean },
  ): Promise<SyncResult> {
    const generation = changeGeneration;
    const controller = runController ?? this.beginRun();
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
            : await this.readRemote(ctx, attempt === 0, controller.signal);

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

          if (changeGeneration !== generation) {
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
      this.endRun(controller);
    }
  }
}
