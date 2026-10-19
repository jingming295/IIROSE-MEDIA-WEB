"use strict";

// 收藏云同步后端的纯逻辑：uid 白名单、信封字段白名单、对象键派生、写频率与日配额、
// If-None-Match 判定、CORS 头与零知识日志载荷。
//
// 这里不触碰网络与 COS，这样 `node --test "cloud/sync/*.test.js"` 可以离线覆盖
// sync-protocol.md 的 I/O 与边界矩阵。协议见 _bmad-output/specs/spec-favorites-cloud-sync/。

const UID_PATTERN = /^[0-9a-f]{8,32}$/;
const WRITER_PATTERN = /^[0-9a-f]{16}$/;

// sync-protocol.md 第 3 节：唯一端点。
const SNAPSHOT_PATH = "/v1/favorites";
// backend-architecture.md 第 2 节：键完全由服务端派生，客户端传不了路径。
const OBJECT_PREFIX = "sync/";

// sync-protocol.md 第 1 节：信封字段与版本白名单。
// v1 是历史格式（无 `wrapped`，快照由口令派生的密钥直接加密）；v2 是当前格式（两级密钥：
// 口令派生的 KEK 包裹随机 DEK）。**两个版本都必须接受**——线上仍有真实用户的 v1 快照，
// 客户端读到 v1 后会自行迁移为 v2 再上传。
const ENVELOPE_VERSION = 1;
const ENVELOPE_VERSION_V2 = 2;
const ENVELOPE_VERSIONS = [ENVELOPE_VERSION, ENVELOPE_VERSION_V2];
const ENVELOPE_ALG = "AES-GCM-256";
const KDF_ALG = "PBKDF2-SHA256";
const ENVELOPE_FIELDS_V1 = [
  "v",
  "alg",
  "kdf",
  "iv",
  "ct",
  "updatedAt",
  "itemCount",
  "writer",
];
const ENVELOPE_FIELDS_V2 = [
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
// 兼容旧名：默认（v1）白名单。
const ENVELOPE_FIELDS = ENVELOPE_FIELDS_V1;
const WRAPPED_FIELDS = ["iv", "ct"];
const KDF_FIELDS = ["alg", "iter", "salt"];
const SALT_BYTES = 32;
const IV_BYTES = 12;
// AES-GCM 128 位 tag 随密文一并 base64，所以 ct 至少 16 字节。
const GCM_TAG_BYTES = 16;
// 被包裹的 DEK 是 32 字节，加上 tag 后包裹块密文至少 48 字节。
const DEK_BYTES = 32;
const WRAPPED_IV_BYTES = IV_BYTES;
const WRAPPED_MIN_BYTES = DEK_BYTES + GCM_TAG_BYTES;
// crypto-spec.md 的 PBKDF2 迭代次数是 OWASP 量级（310000）；不接受明显偏弱的信封。
const MIN_KDF_ITER = 100000;
// 允许的客户端时钟偏移：updatedAt 不能跑到未来太远——uid 是半公开标识，一个超大值
// 会让该 uid 之后所有写入恒 409，同步永久不可用。
const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;

// backend-architecture.md 第 4 节：闸一（尺寸）、闸二（频率与日配额）。
const MAX_BODY_BYTES = 524288;
const MIN_WRITE_INTERVAL_MS = 10000;
const DAILY_WRITE_LIMIT = 200;

// 「当日」按中国标准时间（UTC+8）划分，与使用者的自然日一致。
const CHINA_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

// DELETE 写入的哨兵：对象仍在（保留版本历史），但语义上「云端无快照」。
const CLEARED_SNAPSHOT_BODY = "null";

const CORS_BASE_HEADERS = {
  // 无 Cookie、无凭据，因此可以放开为 *。
  "Access-Control-Allow-Origin": "*",
  // 客户端要读到 PUT 回带的 rev，必须显式暴露 ETag。
  "Access-Control-Expose-Headers": "ETag",
};

const PREFLIGHT_HEADERS = Object.freeze({
  ...CORS_BASE_HEADERS,
  "Access-Control-Allow-Methods": "GET,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,If-None-Match",
  "Access-Control-Max-Age": "86400",
});

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidUid(uid) {
  return typeof uid === "string" && UID_PATTERN.test(uid);
}

/** 对象键：两级前缀避免单前缀热点，且只接受合法 uid。 */
function objectKey(uid) {
  return `${OBJECT_PREFIX}${uid.slice(0, 2).toLowerCase()}/${uid}.json`;
}

/** 写频率与日配额记录，与应用数据同前缀，且不含任何用户内容。 */
function metaKey(uid) {
  return `${OBJECT_PREFIX}${uid.slice(0, 2).toLowerCase()}/${uid}.meta.json`;
}

function decodeBase64(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  if (value.length % 4 !== 0) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  return Buffer.from(value, "base64");
}

/**
 * 校验 `wrapped`（v2 才有的「被 KEK 包裹的 DEK」块）。返回 null 表示合法。
 * 只做结构与白名单校验：不解密、不解析。
 */
function validateWrapped(value) {
  if (!isPlainObject(value)) return "invalid_wrapped";
  const keys = Object.keys(value);
  if (keys.length !== WRAPPED_FIELDS.length) return "invalid_wrapped";
  for (const key of WRAPPED_FIELDS) {
    if (!keys.includes(key)) return "invalid_wrapped";
  }
  const iv = decodeBase64(value.iv);
  if (iv === null || iv.length !== WRAPPED_IV_BYTES) return "invalid_wrapped";
  const ct = decodeBase64(value.ct);
  if (ct === null || ct.length < WRAPPED_MIN_BYTES) return "invalid_wrapped";
  return null;
}

/**
 * 校验信封。返回 null 表示合法，否则返回面向调用方的原因码。
 * 只做结构与白名单校验：不解密、不解析 ct。v1 与 v2 都接受（字段白名单按版本取）。
 */
function validateEnvelope(value, nowMs = Date.now()) {
  if (!isPlainObject(value)) return "not_an_object";
  if (!Number.isInteger(value.v) || !ENVELOPE_VERSIONS.includes(value.v)) {
    return "unsupported_version";
  }
  const isV2 = value.v === ENVELOPE_VERSION_V2;
  const fields = isV2 ? ENVELOPE_FIELDS_V2 : ENVELOPE_FIELDS_V1;
  for (const key of Object.keys(value)) {
    if (!fields.includes(key)) return "unknown_field";
  }
  for (const key of fields) {
    if (!Object.prototype.hasOwnProperty.call(value, key))
      return "missing_field";
  }
  if (value.alg !== ENVELOPE_ALG) return "unsupported_alg";

  if (!isPlainObject(value.kdf)) return "invalid_kdf";
  for (const key of Object.keys(value.kdf)) {
    if (!KDF_FIELDS.includes(key)) return "invalid_kdf";
  }
  for (const key of KDF_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(value.kdf, key))
      return "invalid_kdf";
  }
  if (value.kdf.alg !== KDF_ALG) return "invalid_kdf";
  if (!Number.isInteger(value.kdf.iter) || value.kdf.iter < MIN_KDF_ITER)
    return "invalid_kdf";
  const salt = decodeBase64(value.kdf.salt);
  if (salt === null || salt.length !== SALT_BYTES) return "invalid_kdf";

  if (isV2) {
    const wrappedReason = validateWrapped(value.wrapped);
    if (wrappedReason !== null) return wrappedReason;
  }

  const iv = decodeBase64(value.iv);
  if (iv === null || iv.length !== IV_BYTES) return "invalid_iv";
  const ct = decodeBase64(value.ct);
  if (ct === null || ct.length < GCM_TAG_BYTES) return "invalid_ct";

  if (!Number.isInteger(value.updatedAt) || value.updatedAt <= 0) {
    return "invalid_updated_at";
  }
  if (value.updatedAt > nowMs + MAX_CLOCK_SKEW_MS) return "invalid_updated_at";
  if (!Number.isInteger(value.itemCount) || value.itemCount < 0) {
    return "invalid_item_count";
  }
  if (typeof value.writer !== "string" || !WRITER_PATTERN.test(value.writer)) {
    return "invalid_writer";
  }
  return null;
}

function parseEnvelopeBody(raw, nowMs = Date.now()) {
  if (typeof raw !== "string" || raw.length === 0) {
    return { ok: false, reason: "empty_body" };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
  const reason = validateEnvelope(parsed, nowMs);
  if (reason !== null) return { ok: false, reason };
  return { ok: true, envelope: parsed };
}

/** 一次成功写入后的 meta 记录：跨日重置当日写次数。 */
function nextMeta(meta, nowMs) {
  const day = dayKey(nowMs);
  const state = normalizeMeta(meta);
  return {
    lastWriteAt: nowMs,
    day,
    writes: state.day === day ? state.writes + 1 : 1,
  };
}

function normalizeMeta(meta) {
  if (!isPlainObject(meta)) return { lastWriteAt: 0, day: "", writes: 0 };
  const lastWriteAt = Number.isInteger(meta.lastWriteAt) ? meta.lastWriteAt : 0;
  const day = typeof meta.day === "string" ? meta.day : "";
  const writes =
    Number.isInteger(meta.writes) && meta.writes >= 0 ? meta.writes : 0;
  return { lastWriteAt, day, writes };
}

/** 日期键（UTC+8），跨日重置日配额的依据。 */
function dayKey(nowMs) {
  return new Date(nowMs + CHINA_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

/** 闸二：同 uid 最小写间隔与当日写次数。 */
function writeGate(meta, nowMs) {
  const state = normalizeMeta(meta);
  if (
    state.lastWriteAt > 0 &&
    nowMs - state.lastWriteAt < MIN_WRITE_INTERVAL_MS
  ) {
    return { allowed: false, reason: "too_frequent" };
  }
  if (state.day === dayKey(nowMs) && state.writes >= DAILY_WRITE_LIMIT) {
    return { allowed: false, reason: "daily_quota" };
  }
  return { allowed: true, reason: "" };
}

function bodyTooLarge(byteLength) {
  return typeof byteLength === "number" && byteLength > MAX_BODY_BYTES;
}

/**
 * 闸一：拒绝 multipart/form-data 与二进制，只接受 JSON。
 * 未声明 Content-Type 时不拦——请求体仍要过信封白名单，二进制进不来。
 */
function isJsonContentType(value) {
  if (typeof value !== "string" || value.trim() === "") return true;
  const [type] = value.split(";");
  return type.trim().toLowerCase() === "application/json";
}

function stripWeakPrefix(token) {
  return token.replace(/^W\//i, "").replace(/^"(.*)"$/, "$1");
}

/**
 * GET 短路判定：客户端回带的 rev 等于当前 rev 时回 304（出网流量优化的主手段）。
 * 只有在对象确实存在时才调用。
 */
function ifNoneMatchMatches(headerValue, rev) {
  if (typeof headerValue !== "string" || headerValue.length === 0) return false;
  const tokens = headerValue
    .split(",")
    .map((token) => stripWeakPrefix(token.trim()));
  if (tokens.includes("*")) return true;
  if (typeof rev !== "string" || rev.length === 0) return false;
  return tokens.includes(rev);
}

/** 云端对象的三种形态：清空哨兵、可回带的快照、无法判断的损坏内容。 */
function classifySnapshot(raw) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (text === "" || text === CLEARED_SNAPSHOT_BODY) return "cleared";
  try {
    return isPlainObject(JSON.parse(text)) ? "snapshot" : "invalid";
  } catch {
    return "invalid";
  }
}

/**
 * 409 判定所需的服务端 updatedAt，取自现存信封的顶层明文元数据。
 * 读不到（哨兵、损坏、字段缺失）时返回 null，表示不参与冲突判定。
 */
function parseStoredUpdatedAt(raw) {
  if (typeof raw !== "string") return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;
  return Number.isInteger(parsed.updatedAt) && parsed.updatedAt > 0
    ? parsed.updatedAt
    : null;
}

function corsHeaders() {
  return { ...CORS_BASE_HEADERS };
}

function preflightHeaders() {
  return { ...PREFLIGHT_HEADERS };
}

/**
 * 零知识日志：只允许状态码、uid 前 2 位、字节数与耗时。
 * uid 未通过白名单时不记录任何片段。
 */
function logPayload(status, uid, bytes, ms) {
  const payload = { status, bytes, ms };
  if (isValidUid(uid)) payload.uid2 = uid.slice(0, 2);
  return payload;
}

module.exports = {
  UID_PATTERN,
  WRITER_PATTERN,
  SNAPSHOT_PATH,
  OBJECT_PREFIX,
  ENVELOPE_VERSION,
  ENVELOPE_VERSION_V2,
  ENVELOPE_VERSIONS,
  ENVELOPE_FIELDS,
  ENVELOPE_FIELDS_V1,
  ENVELOPE_FIELDS_V2,
  ENVELOPE_ALG,
  KDF_ALG,
  KDF_FIELDS,
  WRAPPED_FIELDS,
  DEK_BYTES,
  WRAPPED_IV_BYTES,
  WRAPPED_MIN_BYTES,
  SALT_BYTES,
  IV_BYTES,
  GCM_TAG_BYTES,
  MAX_BODY_BYTES,
  MIN_KDF_ITER,
  MAX_CLOCK_SKEW_MS,
  MIN_WRITE_INTERVAL_MS,
  DAILY_WRITE_LIMIT,
  CLEARED_SNAPSHOT_BODY,
  isValidUid,
  objectKey,
  metaKey,
  validateEnvelope,
  validateWrapped,
  parseEnvelopeBody,
  normalizeMeta,
  nextMeta,
  dayKey,
  writeGate,
  bodyTooLarge,
  isJsonContentType,
  ifNoneMatchMatches,
  classifySnapshot,
  parseStoredUpdatedAt,
  corsHeaders,
  preflightHeaders,
  logPayload,
};
