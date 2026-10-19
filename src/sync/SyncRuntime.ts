// src/sync/SyncRuntime.ts
// 同步层的模块级运行态：解锁句柄、在途请求、防抖定时器、待确认预览。
// 页面刷新即全部消失；只有 DEK 句柄另存在本机 IndexedDB。
//
// 这些状态原本散落在 SyncManager 里，抽出来是为了让 transport / enable / lifecycle
// 三个模块共享同一份判定（尤其 `canAutoUpload`：判错一次就等于未经确认上传）。
import { shouldUpload } from "./SyncGate";
import { getSyncSettings } from "./SyncSettingsStore";
import type { UnlockedSync } from "./SyncContext";
import type { PendingEnable } from "./SyncTypes";

/** 收藏增删后合并为一次上传的防抖窗口 */
export const UPLOAD_DEBOUNCE_MS = 5000;

/** 与后端 cloud/sync/logic.js 的 UID_PATTERN 对齐（uid 是分区键，不是凭据） */
const UID_PATTERN = /^[0-9a-f]{8,32}$/;

/** 读取宿站账号标识（游客态或非法格式一律视为不可用） */
export function getUid(): string | null {
  const uid = typeof window !== "undefined" ? window.uid : undefined;
  if (typeof uid !== "string") return null;
  const normalized = uid.trim().toLowerCase();
  return UID_PATTERN.test(normalized) ? normalized : null;
}

/** 同步层的全部可变运行态 */
export const rt = {
  unlocked: null as UnlockedSync | null,
  busy: false,
  debounceTimer: null as number | null,
  /** 收藏变更代数：用于判断「上传期间本地又变了」 */
  generation: 0,
  /** 同步在跑时又收到上传请求：跑完补排一次 */
  pendingAfterBusy: false,
  listenerRegistered: false,
  runController: null as AbortController | null,
  /** 预览完成、等待用户确认的合并结果（存在期间抑制一切自动上传） */
  pendingEnable: null as PendingEnable | null,
  /** 上次成功发出 GET 的时间（含 304）；只存内存，刷新后归零 */
  lastPullAt: 0,
  uiPullTimer: null as number | null,
  activateTriggersRegistered: false,
};

/**
 * 当前 uid 对应的已解锁上下文；uid 变了即视为未解锁。
 * 上传门与「立即同步」都读这一份判定。
 */
export function activeContext(): UnlockedSync | null {
  const uid = getUid();
  if (!rt.unlocked || !uid || rt.unlocked.uid !== uid) return null;
  return rt.unlocked;
}

/**
 * 当前是否放行任何自动上传。「确认前不得有任何上传」只靠这道门：
 * 预览待确认期间（`pendingEnable` 非空）一律不放行，与 `enabled` 无关。
 */
export function canAutoUpload(): boolean {
  return shouldUpload({
    enabled: getSyncSettings().enabled,
    hasContext: !!activeContext(),
    previewPending: rt.pendingEnable !== null,
  });
}

export function cancelDebounce(): void {
  if (rt.debounceTimer !== null) {
    clearTimeout(rt.debounceTimer);
    rt.debounceTimer = null;
  }
}

export function beginRun(): AbortController {
  const controller = new AbortController();
  rt.runController = controller;
  return controller;
}

export function endRun(controller: AbortController): void {
  if (rt.runController === controller) rt.runController = null;
}

// —— 同步状态（供设置面板常驻显示） —— //

export type SyncPhase = "idle" | "syncing" | "error";

export interface SyncStatus {
  phase: SyncPhase;
  /** 最近一次失败原因（成功后清空） */
  message: string | null;
  /** 状态变化时间戳 */
  at: number;
}

let status: SyncStatus = { phase: "idle", message: null, at: 0 };
const statusListeners = new Set<(next: SyncStatus) => void>();

export function getSyncStatus(): SyncStatus {
  return status;
}

/** 订阅状态变化；返回取消订阅函数（面板离开时必须调用，避免重复渲染） */
export function onSyncStateChange(
  listener: (next: SyncStatus) => void,
): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

function publish(next: SyncStatus): void {
  status = next;
  for (const listener of Array.from(statusListeners)) {
    try {
      listener(status);
    } catch (error) {
      console.error("[SyncManager] 状态订阅回调异常:", error);
    }
  }
}

/** 设置状态（启用/停用）变化时补发一次，供常驻指示器刷新可见性 */
export function notifySyncState(): void {
  publish({ ...status, at: Date.now() });
}

/** 进入/离开同步流程：进入即「同步中」，离开时按有无失败原因回落 */
export function setBusy(busy: boolean): void {
  rt.busy = busy;
  publish({
    phase: busy ? "syncing" : status.message ? "error" : "idle",
    message: status.message,
    at: Date.now(),
  });
}

/**
 * 记录一次同步结果：成功清空失败原因并回到空闲，失败保留原因供面板显示「待重试」。
 * 只在「已启用」的同步路径上调用——预览口令错误不是待重试状态。
 */
export function recordSyncResult(result: {
  ok: boolean;
  message: string;
}): void {
  if (result.ok) {
    publish({
      phase: rt.busy ? "syncing" : "idle",
      message: null,
      at: Date.now(),
    });
    return;
  }
  publish({
    phase: "error",
    message: result.message,
    at: Date.now(),
  });
}
