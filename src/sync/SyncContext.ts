// src/sync/SyncContext.ts
// 同步上下文装配：口令 → KEK → 解包/解密 DEK 与云端快照。
// 这一层只碰密钥与解密，不写设置、不发 PUT——「用错口令也绝不上传」的边界在这里。
import type { PluginSyncSettings } from "../settings/pluginSettings/PluginSettings";
import { SyncKeyCache } from "./SyncKeyCache";
import { describeSyncError, type SyncClient } from "./SyncClient";
import {
  DEFAULT_KDF_ITERATIONS,
  SyncCrypto,
  type SyncEnvelope,
  type SyncWrappedKey,
} from "./SyncCrypto";
import type { SyncSnapshot } from "./SyncMerge";

export const SYNC_MESSAGE_WRONG_PASSPHRASE = "同步口令不正确，云端数据未被修改";

/**
 * 已解锁的同步上下文。`uid` 与句柄绑定：页内换了 iirose 账号即视为未解锁，
 * 绝不用 A 账号的密钥去读写 B 账号的分区。
 */
export interface UnlockedSync {
  uid: string;
  deviceId: string;
  salt: string;
  iterations: number;
  wrapped: SyncWrappedKey;
  dek: CryptoKey;
  client: SyncClient;
}

/** 口令入口统一做 Unicode 归一化：不同 IME 输入的等价字形必须派生同一把密钥 */
export function normalizePassphrase(passphrase: string): string {
  return typeof passphrase === "string" ? passphrase.normalize("NFC") : "";
}

/**
 * 用口令得到本次会话的同步上下文：
 * - v2 信封：口令 → KEK → 解包 DEK → 解密快照；
 * - v1 信封（历史格式）：口令派生的旧密钥直接解密快照，再生成新 DEK 用同一 KEK 包裹（迁移）；
 * - 云端为空：复用本机缓存里同一 uid 的 DEK，否则新建。
 * 解密/解包抛错即视为口令不正确或密文被篡改，调用方**禁止 PUT**。
 */
export async function resolveContext(
  uid: string,
  settings: PluginSyncSettings,
  deviceId: string,
  client: SyncClient,
  passphrase: string,
  rawPassphrase: string,
  envelope: SyncEnvelope | null,
): Promise<
  | { ok: true; ctx: UnlockedSync; snapshot: SyncSnapshot | null }
  | { ok: false; message: string }
> {
  const salt = envelope
    ? envelope.kdf.salt
    : settings.salt || SyncCrypto.generateSalt();
  const iterations = envelope ? envelope.kdf.iter : DEFAULT_KDF_ITERATIONS;

  let kek: CryptoKey;
  try {
    kek = await SyncCrypto.deriveKek(passphrase, salt, iterations);
  } catch (error) {
    return { ok: false, message: describeSyncError(error) };
  }

  let dek: CryptoKey;
  let wrapped: SyncWrappedKey;
  let snapshot: SyncSnapshot | null = null;
  try {
    if (!envelope) {
      // 云端没有信封：本机缓存可以复用 DEK，但**必须先用显式口令校验**它
      //（口令派生 KEK 去解包缓存的 wrapped）：否则打错的口令也会被静默「启用」，
      // 而 wrapped 与真实口令不符，换设备就再也解不开。
      const cached = await SyncKeyCache.get(uid);
      if (
        cached &&
        cached.salt === salt &&
        (await cacheMatchesPassphrase(cached, kek, uid))
      ) {
        dek = cached.dek;
        wrapped = cached.wrapped;
      } else {
        const created = await SyncCrypto.createDek(kek, uid);
        dek = created.dek;
        wrapped = created.wrapped;
      }
    } else if (SyncCrypto.isLegacyEnvelope(envelope)) {
      // v1 一次性迁移：旧密钥就是 KEK；云端旧对象不删，靠 COS 版本控制可回滚。
      // 升级前写下的 v1 快照用的是**未归一化**的口令，含合成字符时 NFC 会派生出
      // 不同密钥，因此归一化口令解不开时用原串再试一次。
      try {
        snapshot = await SyncCrypto.decrypt(kek, uid, envelope);
      } catch (legacyError) {
        if (rawPassphrase === passphrase) throw legacyError;
        kek = await SyncCrypto.deriveKek(rawPassphrase, salt, iterations);
        snapshot = await SyncCrypto.decrypt(kek, uid, envelope);
      }
      const created = await SyncCrypto.createDek(kek, uid);
      dek = created.dek;
      wrapped = created.wrapped;
    } else {
      if (!envelope.wrapped) {
        return { ok: false, message: "云端密钥包裹块缺失，已停止同步" };
      }
      dek = await SyncCrypto.unwrapDek(kek, envelope.wrapped, uid);
      wrapped = envelope.wrapped;
      snapshot = await SyncCrypto.decrypt(dek, uid, envelope);
    }
  } catch {
    return { ok: false, message: SYNC_MESSAGE_WRONG_PASSPHRASE };
  }

  return {
    ok: true,
    ctx: { uid, deviceId, salt, iterations, wrapped, dek, client },
    snapshot,
  };
}

/**
 * 校验本机缓存的 DEK 是否属于这把口令：用口令派生的 KEK 解包缓存的 wrapped 块。
 * 解不开就说明口令不对（或缓存已陈旧），调用方应改走新建 DEK。
 */
async function cacheMatchesPassphrase(
  cached: { wrapped: SyncWrappedKey },
  kek: CryptoKey,
  uid: string,
): Promise<boolean> {
  try {
    await SyncCrypto.unwrapDek(kek, cached.wrapped, uid);
    return true;
  } catch {
    return false;
  }
}

/** 解锁成功后把 DEK 句柄（连同公开的包裹参数）写进本机缓存 */
export async function rememberUnlocked(ctx: UnlockedSync): Promise<void> {
  await SyncKeyCache.set({
    uid: ctx.uid,
    salt: ctx.salt,
    iterations: ctx.iterations,
    dek: ctx.dek,
    wrapped: ctx.wrapped,
    cachedAt: Date.now(),
  });
}
