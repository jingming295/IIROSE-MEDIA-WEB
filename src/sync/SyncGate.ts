// src/sync/SyncGate.ts
// 同步的纯判定与文案口径：不持有状态、不发请求，只回答「能不能做」「走哪一步」。
// 判错一次的代价很高（例如把预览当成已启用就会把未确认的合并写进云端），
// 因此这里全部是纯函数，便于单测直接盯着。
import type { MergeStats } from "./SyncMerge";

/** 防抖上传的放行条件 */
export interface UploadGate {
  /** 同步已启用 */
  enabled: boolean;
  /** 当前 uid 已有解锁句柄 */
  hasContext: boolean;
  /** 首次启用的合并结果仍待用户确认 */
  previewPending: boolean;
}

/**
 * 防抖上传是否放行：预览待确认期间一律不放行。
 * 「确认前不得有任何上传」只能靠这道门——不能用提前置 `enabled` 的方式来表达预览中。
 */
export function shouldUpload(gate: UploadGate): boolean {
  return gate.enabled && gate.hasContext && !gate.previewPending;
}

/** 预览之后走哪一步：中止 / 直接提交（云端为空）/ 等用户确认（云端有数据） */
export type EnableStep = "abort" | "commit" | "confirm";

/**
 * 「云端为空 → 直接提交 / 云端非空 → 弹确认框 / 预览失败 → 中止」的唯一分支点。
 * 抽成纯函数是因为分支写反就等于把未经确认的合并直接写进云端，必须有测试盯着。
 */
export function chooseEnableStep(preview: {
  ok: boolean;
  cloudEmpty?: boolean;
}): EnableStep {
  if (!preview.ok) return "abort";
  return preview.cloudEmpty ? "commit" : "confirm";
}

/** 事件触发的自动拉取之间的最小间隔（避免反复切标签页时连发） */
export const AUTO_PULL_COOLDOWN_MS = 60_000;

/** 自动拉取的放行条件 */
export interface AutoPullGate {
  /** 同步已启用 */
  enabled: boolean;
  /** 当前 uid 已有解锁句柄 */
  hasContext: boolean;
  /** 已有同步在进行 */
  busy: boolean;
  /** 上次自动拉取值拉取的时间戳（0 表示本次会话还没拉过） */
  lastPullAt: number;
  /** 现在 */
  now: number;
  /** 冷却窗口，缺省用 AUTO_PULL_COOLDOWN_MS（测试可覆盖） */
  cooldownMs?: number;
}

/**
 * 是否允许这次事件触发的静默拉取。抽成纯函数是为了单测「B 设备到底会不会自己更新」——
 * 这条曾被误判为 low 的需求，正是用户第一天就撞上的问题。
 */
export function shouldAutoPull(gate: AutoPullGate): boolean {
  if (!gate.enabled || !gate.hasContext || gate.busy) return false;
  const cooldown = gate.cooldownMs ?? AUTO_PULL_COOLDOWN_MS;
  return gate.now - gate.lastPullAt >= cooldown;
}

/** 「云端 N / 本地 M / 合并后 K」的统一口径：确认框与提示条共用 */
export function formatMergeStats(stats: MergeStats): string {
  return `云端 ${stats.cloud} / 本地 ${stats.local} / 合并后 ${stats.merged}`;
}

/** 同步完成后的提示口径（首启空云端只说条数） */
export function describeStats(stats: MergeStats): string {
  if (stats.cloud === 0) {
    return `已同步 ${stats.merged} 条收藏`;
  }
  return `同步完成：${formatMergeStats(stats)}`;
}
