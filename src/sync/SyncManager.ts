// src/sync/SyncManager.ts
// 收藏云同步的对外门面：解锁 → 拉取 → 合并 → 预览确认 → 上传 → 防抖。
// 具体实现已按关注点拆到同目录：
//   - SyncRuntime    运行态（解锁句柄、在途请求、防抖、待确认预览）与上传门
//   - SyncTransport  一次同步的读写与防抖排程
//   - SyncEnableFlow 首次启用的「预览 → 确认/取消」
//   - SyncLifecycle  注册触发、解锁、启停、清空与状态查询
//   - SyncContext    口令 → KEK → DEK 与解密
//   - SyncSettingsStore 设置持久化与 remoteRev 单一入口
//   - SyncGate       纯判定与文案
// UI 与宿主代码只通过本文件交互。
import { getUid } from "./SyncRuntime";
import * as enableFlow from "./SyncEnableFlow";
import * as lifecycle from "./SyncLifecycle";
import * as transport from "./SyncTransport";
import type { SyncPreviewResult, SyncResult, SyncStateView } from "./SyncTypes";

export { SYNC_MESSAGE_WRONG_PASSPHRASE } from "./SyncContext";
export {
  chooseEnableStep,
  formatMergeStats,
  shouldAutoPull,
  shouldUpload,
} from "./SyncGate";
export type { EnableStep, UploadGate, AutoPullGate } from "./SyncGate";
export type { SyncPreviewResult, SyncResult, SyncStateView } from "./SyncTypes";

export class SyncManager {
  /** 读取宿站账号标识（游客态或非法格式一律视为不可用） */
  public static getUid(): string | null {
    return getUid();
  }

  public static getState(): SyncStateView {
    return lifecycle.getState();
  }

  public static formatLastSyncAt(lastSyncAt: number | null): string {
    return lifecycle.formatLastSyncAt(lastSyncAt);
  }

  public static init(): Promise<void> {
    return lifecycle.init();
  }

  public static onUiOpened(): void {
    lifecycle.onUiOpened();
  }

  public static onUiClosed(): void {
    lifecycle.onUiClosed();
  }

  public static uploadPendingChanges(): Promise<void> {
    return transport.uploadPendingChanges();
  }

  public static previewEnable(passphrase: string): Promise<SyncPreviewResult> {
    return enableFlow.previewEnable(passphrase);
  }

  public static commitEnable(): Promise<SyncResult> {
    return enableFlow.commitEnable();
  }

  public static cancelEnable(): SyncResult {
    return enableFlow.cancelEnable();
  }

  public static unlock(passphrase: string): Promise<SyncResult> {
    return lifecycle.unlock(passphrase);
  }

  public static syncNow(): Promise<SyncResult> {
    return transport.syncNow();
  }

  public static hasLocalKey(): Promise<boolean> {
    return lifecycle.hasLocalKey();
  }

  public static disable(): SyncResult {
    return lifecycle.disable();
  }

  public static forgetLocalKey(): Promise<SyncResult> {
    return lifecycle.forgetLocalKey();
  }

  public static clearCloud(): Promise<SyncResult> {
    return lifecycle.clearCloud();
  }
}
