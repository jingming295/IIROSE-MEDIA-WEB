// src/sync/SyncCrypto.ts
// 收藏云同步的加密层：PBKDF2-SHA256 派生 + AES-GCM-256 加解密 + 传输信封编解码。
// 无内部状态，全部为纯函数/静态方法；口令只作为参数出现，绝不落任何持久化。
// 参数与 AAD 构造见 _bmad-output/specs/spec-favorites-cloud-sync/crypto-spec.md。
import { SNAPSHOT_VERSION, type SyncSnapshot } from "./SyncMerge";

/** OWASP 量级迭代次数；仅在解锁时计算一次。信封自带 `kdf.iter`，下调不破坏既有数据 */
export const DEFAULT_KDF_ITERATIONS = 310000;
/** 服务端白名单要求的下限（cloud/sync/logic.js 的 MIN_KDF_ITER） */
export const MIN_KDF_ITERATIONS = 100000;

export const ENVELOPE_VERSION = 1;
export const ENVELOPE_ALG = "AES-GCM-256";
export const KDF_ALG = "PBKDF2-SHA256";

export const SALT_BYTES = 32;
export const IV_BYTES = 12;
export const GCM_TAG_BYTES = 16;
const WRITER_BYTES = 8;

/** 传输信封：服务端能看到的全部内容，除下列字段外不得出现任何其他字段 */
export interface SyncEnvelope {
  v: number;
  alg: string;
  kdf: {
    alg: string;
    iter: number;
    salt: string;
  };
  iv: string;
  ct: string;
  updatedAt: number;
  itemCount: number;
  writer: string;
}

export class SyncCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncCryptoError";
  }
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * AAD = `uid|v|updatedAt`：把密文绑定到用户与快照时间戳，
 * 防止密文被挪到别的 uid 下复用、或旧快照被改 updatedAt 后当作新快照重放。
 */
function buildAad(uid: string, v: number, updatedAt: number): Uint8Array {
  return new TextEncoder().encode(`${uid}|${v}|${updatedAt}`);
}

export interface EncryptOptions {
  key: CryptoKey;
  uid: string;
  snapshot: SyncSnapshot;
  /** 快照逻辑时间戳，必须与 `snapshot.updatedAt` 一致 */
  updatedAt: number;
  /** base64 盐，首次启用时生成并固定保存 */
  salt: string;
  iterations: number;
  itemCount: number;
  /** 写入设备随机 id，hex 16 位 */
  writer: string;
}

export class SyncCrypto {
  /** WebCrypto 在安全上下文（HTTPS）下必到；缺失时同步必须整体不可用 */
  public static isAvailable(): boolean {
    return (
      typeof crypto !== "undefined" &&
      typeof crypto.subtle !== "undefined" &&
      typeof crypto.getRandomValues === "function"
    );
  }

  public static generateSalt(): string {
    return bytesToBase64(randomBytes(SALT_BYTES));
  }

  /** 设备随机 id（hex 16），仅用于信封 writer 字段与冲突提示 */
  public static generateDeviceId(): string {
    return bytesToHex(randomBytes(WRITER_BYTES));
  }

  /** PBKDF2-SHA256(passphrase, salt, iterations, 32B) → AES-GCM-256 CryptoKey（不可导出） */
  public static async deriveKey(
    passphrase: string,
    saltBase64: string,
    iterations: number,
  ): Promise<CryptoKey> {
    if (!this.isAvailable()) {
      throw new SyncCryptoError("当前环境不支持 WebCrypto，无法启用云端同步");
    }
    if (typeof passphrase !== "string" || passphrase.length === 0) {
      throw new SyncCryptoError("同步口令不能为空");
    }
    if (!Number.isInteger(iterations) || iterations < MIN_KDF_ITERATIONS) {
      throw new SyncCryptoError("密钥派生参数不合法");
    }

    let salt: Uint8Array;
    try {
      salt = base64ToBytes(saltBase64);
    } catch {
      throw new SyncCryptoError("密钥盐格式不合法");
    }
    if (salt.length !== SALT_BYTES) {
      throw new SyncCryptoError("密钥盐长度不合法");
    }

    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(passphrase),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      material,
      256,
    );
    return crypto.subtle.importKey("raw", bits, "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]);
  }

  /** 每次写入都重新生成 IV，绝不复用 */
  public static async encrypt(options: EncryptOptions): Promise<SyncEnvelope> {
    if (!this.isAvailable()) {
      throw new SyncCryptoError("当前环境不支持 WebCrypto，无法启用云端同步");
    }
    const iv = randomBytes(IV_BYTES);
    const plaintext = new TextEncoder().encode(
      JSON.stringify(options.snapshot),
    );
    const cipher = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: buildAad(
          options.uid,
          ENVELOPE_VERSION,
          options.updatedAt,
        ),
        tagLength: 128,
      },
      options.key,
      plaintext,
    );

    return {
      v: ENVELOPE_VERSION,
      alg: ENVELOPE_ALG,
      kdf: {
        alg: KDF_ALG,
        iter: options.iterations,
        salt: options.salt,
      },
      iv: bytesToBase64(iv),
      ct: bytesToBase64(new Uint8Array(cipher)),
      updatedAt: options.updatedAt,
      itemCount: options.itemCount,
      writer: options.writer,
    };
  }

  /**
   * 解密：AAD 必须用本地重算的 `uid|v|updatedAt`，不得信任其他来源。
   * 抛错即视为「口令错误 / 密文被篡改 / 被挪到别的 uid 下」，调用方禁止 PUT。
   */
  public static async decrypt(
    key: CryptoKey,
    uid: string,
    envelope: SyncEnvelope,
  ): Promise<SyncSnapshot> {
    if (!this.isAvailable()) {
      throw new SyncCryptoError("当前环境不支持 WebCrypto，无法启用云端同步");
    }
    if (!this.isValidEnvelope(envelope)) {
      throw new SyncCryptoError("云端数据格式不合法，已停止同步");
    }

    const plain = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64ToBytes(envelope.iv),
        additionalData: buildAad(uid, envelope.v, envelope.updatedAt),
        tagLength: 128,
      },
      key,
      base64ToBytes(envelope.ct),
    );

    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(plain));
    } catch {
      throw new SyncCryptoError("云端快照无法解析，已停止同步");
    }
    if (!parsed || typeof parsed !== "object") {
      throw new SyncCryptoError("云端快照结构不合法，已停止同步");
    }
    const snapshot = parsed as Partial<SyncSnapshot>;
    if (!Array.isArray(snapshot.items)) {
      throw new SyncCryptoError("云端快照结构不合法，已停止同步");
    }
    return {
      version:
        typeof snapshot.version === "number"
          ? snapshot.version
          : SNAPSHOT_VERSION,
      updatedAt:
        typeof snapshot.updatedAt === "number"
          ? snapshot.updatedAt
          : envelope.updatedAt,
      items: snapshot.items,
    };
  }

  /** 信封结构白名单校验（与服务端 logic.js 的 validateEnvelope 对齐） */
  public static isValidEnvelope(value: unknown): value is SyncEnvelope {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    const envelope = value as Partial<SyncEnvelope>;
    if (envelope.v !== ENVELOPE_VERSION || envelope.alg !== ENVELOPE_ALG) {
      return false;
    }
    const kdf = envelope.kdf as SyncEnvelope["kdf"] | undefined;
    if (
      !kdf ||
      kdf.alg !== KDF_ALG ||
      !Number.isInteger(kdf.iter) ||
      (kdf.iter as number) < MIN_KDF_ITERATIONS ||
      typeof kdf.salt !== "string"
    ) {
      return false;
    }
    if (
      typeof envelope.iv !== "string" ||
      typeof envelope.ct !== "string" ||
      typeof envelope.writer !== "string" ||
      !Number.isInteger(envelope.updatedAt) ||
      (envelope.updatedAt as number) <= 0 ||
      !Number.isInteger(envelope.itemCount) ||
      (envelope.itemCount as number) < 0
    ) {
      return false;
    }
    try {
      if (base64ToBytes(kdf.salt).length !== SALT_BYTES) return false;
      if (base64ToBytes(envelope.iv).length !== IV_BYTES) return false;
      if (base64ToBytes(envelope.ct).length < GCM_TAG_BYTES) return false;
    } catch {
      return false;
    }
    return true;
  }
}
