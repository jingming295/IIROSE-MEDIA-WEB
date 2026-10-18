"use strict";

// IIROSE-MEDIA-SYNC 唯一入口：路由、四道闸、304 短路、错误码与 CORS。
//
// 运行在 SCF 函数 URL（开放鉴权）之后，鉴权只能靠 uid 分区 + 端到端加密 + 本节的门禁，
// 所以所有抗滥用逻辑都必须在函数内部完成。协议见 sync-protocol.md。
//
// 日志零知识：绝不打印请求体、响应体、ct 或凭据，只打印状态码、uid 前 2 位、字节数、耗时。

const logic = require("./logic.js");
const cos = require("./cos.js");

const JSON_CONTENT_TYPE = "application/json; charset=utf-8";
const ALLOWED_METHODS = "GET,PUT,DELETE,OPTIONS";
const ALLOWED_METHOD_SET = new Set(["GET", "PUT", "DELETE"]);

/** 大小写不敏感地取值（header、queryString 的键名大小写由平台决定）。 */
function lookup(source, name) {
  if (!source || typeof source !== "object") return "";
  for (const key of Object.keys(source)) {
    if (key.toLowerCase() !== name) continue;
    const value = source[key];
    if (Array.isArray(value)) return value.length > 0 ? String(value[0]) : "";
    return value === undefined || value === null ? "" : String(value);
  }
  return "";
}

function respond(statusCode, payload, extraHeaders) {
  const headers = {
    ...logic.corsHeaders(),
    "Cache-Control": "no-store",
    ...(extraHeaders || {}),
  };
  const body = payload === undefined ? "" : JSON.stringify(payload);
  if (body !== "") headers["Content-Type"] = JSON_CONTENT_TYPE;
  return { statusCode, headers, body };
}

function unavailable() {
  return respond(503, { error: "unavailable" });
}

/** 304 与 204 不带响应体，但必须带 CORS 头，否则浏览器读不到状态。 */
function empty(statusCode, headers) {
  return {
    statusCode,
    headers: { ...logic.corsHeaders(), ...headers },
    body: "",
  };
}

function decodeBody(event) {
  const body = event && event.body;
  if (body === undefined || body === null) return Buffer.alloc(0);
  if (typeof body !== "string") return Buffer.from(String(body), "utf8");
  if (event.isBase64Encoded === true || event.isBase64Encoded === "true") {
    return Buffer.from(body, "base64");
  }
  return Buffer.from(body, "utf8");
}

async function handleGet(client, uid, ifNoneMatch) {
  const key = logic.objectKey(uid);
  const head = await client.headObject(key);
  if (head.statusCode === 404) return respond(200, { snapshot: null });
  if (head.statusCode !== 200) return unavailable();

  const rev = cos.revision(head.headers);
  if (logic.ifNoneMatchMatches(ifNoneMatch, rev)) {
    // 云端未变化：只回状态码，出网流量趋近于 0。
    return empty(304, {});
  }

  const stored = await client.getObject(key);
  if (stored.statusCode === 404) return respond(200, { snapshot: null });
  if (stored.statusCode !== 200) return unavailable();

  const shape = logic.classifySnapshot(stored.body);
  if (shape === "cleared") return respond(200, { snapshot: null });
  if (shape !== "snapshot") {
    // 云端对象不是 JSON（只可能来自协议之外的写入）：不回 null，避免客户端把它当
    // 「首次启用」直接覆盖，让客户端按 503 保持 dirty 并重试。
    return unavailable();
  }

  const headers = {
    "Content-Type": JSON_CONTENT_TYPE,
    "Cache-Control": "no-store",
  };
  if (rev) headers.ETag = rev;
  return {
    statusCode: 200,
    headers: { ...logic.corsHeaders(), ...headers },
    // 原样回带密文信封，服务端不改写、不解析 ct。
    body: `{"snapshot":${stored.body}}`,
  };
}

async function readMeta(client, key) {
  const stored = await client.getObject(key);
  if (stored.statusCode === 404) return null;
  if (stored.statusCode !== 200) throw new Error("meta 读取失败");
  try {
    return JSON.parse(stored.body);
  } catch {
    return null;
  }
}

async function writeMeta(client, key, meta) {
  try {
    await client.putObject(key, JSON.stringify(meta), {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
  } catch {
    // meta 只是门禁账本；写失败不该让已经落地的快照在客户端看来是一次失败。
  }
}

async function handlePut(client, uid, event) {
  const payload = decodeBody(event);
  // 闸一：尺寸。超限不触达 COS。
  if (logic.bodyTooLarge(payload.length)) {
    return respond(413, {
      error: "payload_too_large",
      message: "云端收藏包已满 512KB，请联系铭",
    });
  }
  if (!logic.isJsonContentType(lookup(event.headers, "content-type"))) {
    return respond(400, {
      error: "invalid_request",
      reason: "unsupported_content_type",
    });
  }

  // 闸一：信封字段与版本白名单（含 updatedAt 的时钟上界）。拒绝即不写入。
  const raw = payload.toString("utf8");
  const now = Date.now();
  const parsed = logic.parseEnvelopeBody(raw, now);
  if (!parsed.ok) {
    return respond(400, { error: "invalid_envelope", reason: parsed.reason });
  }

  // 闸二：同 uid 写最小间隔 + 当日写次数（账本不含任何用户内容）。
  const metaKey = logic.metaKey(uid);
  const meta = await readMeta(client, metaKey);
  const gate = logic.writeGate(meta, now);
  if (!gate.allowed) {
    return respond(429, {
      error: gate.reason,
      message:
        gate.reason === "daily_quota"
          ? "今日同步次数已达上限，请联系铭"
          : "操作太快，请稍后再试",
    });
  }

  // 冲突：服务端不做合并，只拒绝时间戳倒退，并把服务端 updatedAt 回带。
  const key = logic.objectKey(uid);
  const existing = await client.getObject(key);
  if (existing.statusCode !== 200 && existing.statusCode !== 404) {
    return unavailable();
  }
  if (existing.statusCode === 200) {
    const storedUpdatedAt = logic.parseStoredUpdatedAt(existing.body);
    if (
      storedUpdatedAt !== null &&
      parsed.envelope.updatedAt < storedUpdatedAt
    ) {
      return respond(409, { error: "conflict", updatedAt: storedUpdatedAt });
    }
  }

  const written = await client.putObject(key, raw, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  if (written.statusCode !== 200) return unavailable();

  await writeMeta(client, metaKey, logic.nextMeta(meta, now));
  return respond(200, {
    ok: true,
    updatedAt: parsed.envelope.updatedAt,
    rev: cos.revision(written.headers),
  });
}

async function handleDelete(client, uid) {
  // 写空快照而非删对象：保留版本历史，供协议之外（他人用已知 uid 清空）时回滚。
  // 只写 4 字节哨兵，成本可忽略，因此不占闸二的配额。
  const written = await client.putObject(
    logic.objectKey(uid),
    logic.CLEARED_SNAPSHOT_BODY,
    { "Content-Type": "application/json", "Cache-Control": "no-store" },
  );
  if (written.statusCode !== 200) return unavailable();
  return respond(200, { ok: true });
}

async function route(client, event) {
  const method = String(
    (event && (event.httpMethod || event.method)) || "",
  ).toUpperCase();
  const path = String((event && event.path) || "").replace(/\/+$/, "") || "/";
  const uid = lookup(
    event && (event.queryString || event.queryStringParameters),
    "uid",
  );

  // 预检对任意路径、任意 uid 都直接放行，且不触达 COS。
  if (method === "OPTIONS") return empty(204, logic.preflightHeaders());
  if (path !== logic.SNAPSHOT_PATH) return respond(404, { error: "not_found" });
  if (!ALLOWED_METHOD_SET.has(method)) {
    return respond(
      405,
      { error: "method_not_allowed" },
      { Allow: ALLOWED_METHODS },
    );
  }
  if (!logic.isValidUid(uid)) return respond(400, { error: "invalid_uid" });

  if (method === "GET") {
    return handleGet(client, uid, lookup(event.headers, "if-none-match"));
  }
  if (method === "PUT") return handlePut(client, uid, event);
  return handleDelete(client, uid);
}

function createHandler(client) {
  return async function main_handler(event) {
    const startedAt = Date.now();
    const uid = lookup(
      event && (event.queryString || event.queryStringParameters),
      "uid",
    );

    let response;
    try {
      response = await route(client, event);
    } catch {
      // 异常文本可能含 COS 返回内容或签名串，一律不外泄。
      response = unavailable();
    }

    console.log(
      JSON.stringify(
        logic.logPayload(
          response.statusCode,
          uid,
          Buffer.byteLength(response.body || "", "utf8"),
          Date.now() - startedAt,
        ),
      ),
    );
    return response;
  };
}

exports.createHandler = createHandler;
exports.main_handler = createHandler(cos);
