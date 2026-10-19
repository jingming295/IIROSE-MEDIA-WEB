// src/sync/SyncSettingsStore.ts
// 同步设置的读写与「云端版本号」的单一存放点。
// 所有对 localStorage 的写入都收敛在这里，便于核对「哪些字段何时落盘」。
import {
  PluginSettings,
  type PluginSyncSettings,
} from "../settings/pluginSettings/PluginSettings";
import { SyncCrypto } from "./SyncCrypto";

/** 上次确认过的云端版本号（ETag）；只存内存 + 设置里各一份 */
let remoteRev: string | null = null;

export function getSyncSettings(): PluginSyncSettings {
  return PluginSettings.normalizeSyncSettings(
    PluginSettings.getPluginSetting().sync,
  );
}

export function updateSyncSettings(
  patch: Partial<PluginSyncSettings>,
): PluginSyncSettings {
  const pluginSettings = PluginSettings.getPluginSetting();
  pluginSettings.sync = { ...pluginSettings.sync, ...patch };
  localStorage.setItem("imwPluginSetting", JSON.stringify(pluginSettings));
  return pluginSettings.sync;
}

/** deviceId 惰性生成，生成后不再变（归一化会把非法值清空，这里补生成并落盘） */
export function ensureDeviceId(): string {
  const settings = getSyncSettings();
  if (settings.deviceId) return settings.deviceId;
  const deviceId = SyncCrypto.generateDeviceId();
  updateSyncSettings({ deviceId });
  return deviceId;
}

/** 当前会话持有的云端版本号；调用方不得绕过 setRemoteRev 直接改 */
export function getRemoteRev(): string | null {
  return remoteRev;
}

/**
 * `remoteRev` 的唯一写入口：同时落盘，保证重开页面后的首个 GET 也能走 304。
 * 注意只在「PUT 成功落地」或「已确认云端版本」时更新，不能用 GET 响应头提前写入，
 * 否则会出现「带着新 rev 短路成 304，于是只用本地覆盖云端」的数据丢失。
 */
export function setRemoteRev(rev: string | null): void {
  remoteRev = rev;
  updateSyncSettings({ lastRev: rev });
}

/** 从设置里恢复上次的云端版本号（页面加载/解锁时调用） */
export function restoreRemoteRev(): void {
  remoteRev = getSyncSettings().lastRev;
}
