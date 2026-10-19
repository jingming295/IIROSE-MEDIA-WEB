// src/sync/SyncCrypto.ts
// 收藏云同步的加密层：两级密钥（口令派生的 KEK 包裹随机 DEK）+ AES-GCM-256 加解密 + 信封编解码。
// 无内部状态，全部为纯函数/静态方法；口令只作为参数出现，绝不落任何持久化。
// 参数与 AAD 构造见 _bmad-output/specs/spec-favorites-cloud-sync/crypto-spec.md。
//
// 信封版本：v2 = 当前格式（带 `wrapped`）；v1 = 历史格式（无 `wrapped`，快照由口令派生的密钥
// 直接加密）。客户端**必须**能读 v1（线上有真实用户的 v1 快照），由 SyncManager 走一次性迁移。
import { SNAPSHOT_VERSION, type SyncSnapshot } from "./SyncMerge";

/** OWASP 量级迭代次数；仅在解锁时计算一次。信封自带 `kdf.iter`，下调不破坏既有数据 */
export const DEFAULT_KDF_ITERATIONS = 310000;
/** 服务端白名单要求的下限（cloud/sync/logic.js 的 MIN_KDF_ITER） */
export const MIN_KDF_ITERATIONS = 100000;

/** 当前信封版本（v2：两级密钥）；客户端写入的一律是新版本 */
export const ENVELOPE_VERSION = 2;
/** 历史信封版本（无 `wrapped`，快照由 KEK 同构的旧密钥直接加密） */
export const ENVELOPE_VERSION_V1 = 1;
/** 服务端接受的信封版本集合（与 cloud/sync/logic.js 的 ENVELOPE_VERSIONS 对齐） */
export const ENVELOPE_VERSIONS = [ENVELOPE_VERSION_V1, ENVELOPE_VERSION];

export const ENVELOPE_ALG = "AES-GCM-256";
export const KDF_ALG = "PBKDF2-SHA256";

export const SALT_BYTES = 32;
export const IV_BYTES = 12;
export const GCM_TAG_BYTES = 16;
/** DEK 长度：32 字节（AES-GCM-256） */
export const DEK_BYTES = 32;
/** v1 信封的字段白名单（无 `wrapped`） */
export const ENVELOPE_FIELDS_V1 = [
  "v",
  "alg",
  "kdf",
  "iv",
  "ct",
  "updatedAt",
  "itemCount",
  "writer",
];
/** v2 信封的字段白名单（逐字与 cloud/sync/logic.js 的 ENVELOPE_FIELDS_V2 对齐） */
export const ENVELOPE_FIELDS_V2 = [
  "v",
  "alg",
  "kdf",
  "iv",
  "ct",
  "updatedAt",
  "itemCount",
  "writer",
  "wrapped",
];
export const WRAPPED_FIELDS = ["iv", "ct"];
/** `kdf` 的字段闭集（与 cloud/sync/logic.js 的 KDF_FIELDS 对齐：多一个键即拒） */
export const KDF_FIELDS = ["alg", "iter", "salt"];
/** 服务端允许的时钟偏移上限（cloud/sync/logic.js 的 MAX_CLOCK_SKEW_MS） */
export const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;
/** 写入设备 id 的形态（cloud/sync/logic.js 的 WRITER_PATTERN） */
export const WRITER_PATTERN = /^[0-9a-f]{16}$/;
/** 包裹块的 iv 长度（= IV_BYTES，逐字写死以便跨端断言比对） */
export const WRAPPED_IV_BYTES = 12;
/** 包裹块的密文下限：DEK(32B) + GCM tag(16B)（逐字写死，跨端断言会校验与 DEK_BYTES/tag 的关系） */
export const WRAPPED_MIN_BYTES = 48;

const WRITER_BYTES = 8;
/** 包裹 DEK 的 AAD 尾段：`uid|v|dek` */
const DEK_AAD_TAG = "dek";

/** 被 KEK 包裹的 DEK（v2 信封的 `wrapped` 字段） */
export interface SyncWrappedKey {
  iv: string;
  ct: string;
}

/** 传输信封：服务端能看到的全部内容，除白名单字段外不得出现任何其他字段 */
export interface SyncEnvelope {
  v: number;
  alg: string;
  kdf: {
    alg: string;
    iter: number;
    salt: string;
  };
  /** 仅 v2：被 KEK 包裹的 DEK */
  wrapped?: SyncWrappedKey;
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * 快照的 AAD = `uid|v|updatedAt`：把密文绑定到用户与快照时间戳，
 * 防止密文被挪到别的 uid 下复用、或旧快照被改 updatedAt 后当作新快照重放。
 */
function buildSnapshotAad(
  uid: string,
  v: number,
  updatedAt: number,
): Uint8Array {
  return new TextEncoder().encode(`${uid}|${v}|${updatedAt}`);
}

/** 包裹 DEK 的 AAD = `uid|v|dek`：防止包裹块被换到别的信封/用户下 */
function buildDekAad(uid: string, v: number): Uint8Array {
  return new TextEncoder().encode(`${uid}|${v}|${DEK_AAD_TAG}`);
}

export interface EncryptOptions {
  /** 参与快照加解密的不可导出 DEK 句柄 */
  dek: CryptoKey;
  /** 与 `dek` 对应的包裹块，随信封一起上传 */
  wrapped: SyncWrappedKey;
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

  /**
   * PBKDF2-SHA256(passphrase, salt, iterations, 32B) → KEK（AES-GCM，不可导出）。
   * v1 信封里的「口令直接派生的密钥」与本函数同构，因此迁移时复用同一推导。
   */
  public static async deriveKek(
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

  /**
   * 生成随机 DEK 并用 KEK 包裹：
   * - 返回的 `dek` 是 `extractable: false` 的句柄，仅用于快照加解密；
   * - 返回的 `wrapped` 随信封上传，是所有设备复用的同一个 DEK 的分发载体。
   */
  public static async createDek(
    kek: CryptoKey,
    uid: string,
  ): Promise<{ dek: CryptoKey; wrapped: SyncWrappedKey }> {
    if (!this.isAvailable()) {
      throw new SyncCryptoError("当前环境不支持 WebCrypto，无法启用云端同步");
    }
    const raw = randomBytes(DEK_BYTES);
    const wrapped = await this.wrapDek(kek, raw, uid);
    const dek = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]);
    return { dek, wrapped };
  }

  /**
   * 用 KEK 包裹 DEK 原始字节（AAD = `uid|v|dek`，每次调用换新 IV）。
   * 只有 DEK 创建与迁移那一刻能拿到原始字节；参与加解密的一律是不可导出句柄。
   */
  public static async wrapDek(
    kek: CryptoKey,
    dekBytes: Uint8Array,
    uid: string,
  ): Promise<SyncWrappedKey> {
    if (!this.isAvailable()) {
      throw new SyncCryptoError("当前环境不支持 WebCrypto，无法启用云端同步");
    }
    if (dekBytes.length !== DEK_BYTES) {
      throw new SyncCryptoError("DEK 长度不合法");
    }
    const iv = randomBytes(WRAPPED_IV_BYTES);
    const cipher = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: buildDekAad(uid, ENVELOPE_VERSION),
        tagLength: 128,
      },
      kek,
      dekBytes,
    );
    return {
      iv: bytesToBase64(iv),
      ct: bytesToBase64(new Uint8Array(cipher)),
    };
  }

  /** 用 KEK 解包 DEK：解出的字节立即以 extractable:false 导入，不做任何持久化 */
  public static async unwrapDek(
    kek: CryptoKey,
    wrapped: SyncWrappedKey,
    uid: string,
  ): Promise<CryptoKey> {
    if (!this.isAvailable()) {
      throw new SyncCryptoError("当前环境不支持 WebCrypto，无法启用云端同步");
    }
    if (!this.isValidWrapped(wrapped)) {
      throw new SyncCryptoError("云端密钥包裹块不合法，已停止同步");
    }
    const plain = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64ToBytes(wrapped.iv),
        additionalData: buildDekAad(uid, ENVELOPE_VERSION),
        tagLength: 128,
      },
      kek,
      base64ToBytes(wrapped.ct),
    );
    if (plain.byteLength !== DEK_BYTES) {
      throw new SyncCryptoError("云端密钥长度不合法，已停止同步");
    }
    return crypto.subtle.importKey("raw", plain, "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]);
  }

  /** 写出 v2 信封；快照 IV 每次写入都重新生成，绝不复用 */
  public static async encrypt(options: EncryptOptions): Promise<SyncEnvelope> {
    if (!this.isAvailable()) {
      throw new SyncCryptoError("当前环境不支持 WebCrypto，无法启用云端同步");
    }
    if (!this.isValidWrapped(options.wrapped)) {
      throw new SyncCryptoError("本机密钥包裹块缺失或不合法，无法写入云端");
    }
    const iv = randomBytes(IV_BYTES);
    const plaintext = new TextEncoder().encode(
      JSON.stringify(options.snapshot),
    );
    const cipher = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: buildSnapshotAad(
          options.uid,
          ENVELOPE_VERSION,
          options.updatedAt,
        ),
        tagLength: 128,
      },
      options.dek,
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
      wrapped: options.wrapped,
      iv: bytesToBase64(iv),
      ct: bytesToBase64(new Uint8Array(cipher)),
      updatedAt: options.updatedAt,
      itemCount: options.itemCount,
      writer: options.writer,
    };
  }

  /**
   * 解密：AAD 必须用本地重算的 `uid|v|updatedAt`，不得信任其他来源。
   * v1 信封的 `ct` 由 KEK 同构的旧密钥加密，因此 v1 传入的 key 应是 KEK 本身。
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
        additionalData: buildSnapshotAad(uid, envelope.v, envelope.updatedAt),
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

  /** 是否为待迁移的历史格式（v1：无 wrapped，口令派生的密钥直接加密快照） */
  public static isLegacyEnvelope(envelope: SyncEnvelope): boolean {
    return envelope.v === ENVELOPE_VERSION_V1;
  }

  /** 包裹块白名单校验（与服务端 logic.js 的 validateWrapped 对齐） */
  public static isValidWrapped(value: unknown): value is SyncWrappedKey {
    if (!isPlainObject(value)) return false;
    const keys = Object.keys(value);
    if (keys.length !== WRAPPED_FIELDS.length) return false;
    if (!WRAPPED_FIELDS.every((field) => keys.includes(field))) return false;
    const wrapped = value as Partial<SyncWrappedKey>;
    if (typeof wrapped.iv !== "string" || typeof wrapped.ct !== "string") {
      return false;
    }
    try {
      if (base64ToBytes(wrapped.iv).length !== WRAPPED_IV_BYTES) return false;
      if (base64ToBytes(wrapped.ct).length < WRAPPED_MIN_BYTES) return false;
    } catch {
      return false;
    }
    return true;
  }

  /** 信封结构白名单校验（与服务端 logic.js 的 validateEnvelope 对齐） */
  public static isValidEnvelope(value: unknown): value is SyncEnvelope {
    if (!isPlainObject(value)) {
      return false;
    }
    const envelope = value as Partial<SyncEnvelope>;
    if (!ENVELOPE_VERSIONS.includes(envelope.v as number)) return false;
    const isV2 = envelope.v === ENVELOPE_VERSION;
    const fields = isV2 ? ENVELOPE_FIELDS_V2 : ENVELOPE_FIELDS_V1;
    const keys = Object.keys(value);
    if (keys.length !== fields.length) return false;
    if (!fields.every((field) => keys.includes(field))) return false;
    if (envelope.alg !== ENVELOPE_ALG) {
      return false;
    }
    const kdf = envelope.kdf as SyncEnvelope["kdf"] | undefined;
    if (
      !isPlainObject(kdf) ||
      // 闭集：多一个键服务端就拒，客户端也必须拒，否则会写出必然 400 的信封
      Object.keys(kdf).length !== KDF_FIELDS.length ||
      !KDF_FIELDS.every((field) => field in kdf) ||
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
      !WRITER_PATTERN.test(envelope.writer) ||
      !Number.isInteger(envelope.updatedAt) ||
      (envelope.updatedAt as number) <= 0 ||
      // 上界：未来时间戳能把别人的同步永久锁死，服务端已经不收，客户端也要提前拦住
      (envelope.updatedAt as number) > Date.now() + MAX_CLOCK_SKEW_MS ||
      !Number.isInteger(envelope.itemCount) ||
      (envelope.itemCount as number) < 0
    ) {
      return false;
    }
    if (isV2 && !this.isValidWrapped(envelope.wrapped)) return false;
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
