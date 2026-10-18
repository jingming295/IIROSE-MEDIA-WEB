"use strict";

// sync-protocol.md 的 I/O 与边界矩阵逐条覆盖。四道闸（uid 白名单、信封白名单、
// 尺寸、频率/日配额）在这里是唯一的自动防线，所以断言既要看状态码，也要看
// 「桶内对象字节未变」这类副作用。
//
// 运行：node --test cloud/sync/   （零依赖、零网络、零云凭据）

const assert = require("node:assert/strict");
const { test } = require("node:test");

const logic = require("./logic.js");
const { createHandler } = require("./index.js");

// 处理器会按零知识规则打一行日志；除断言日志的用例外，把它静音以保持输出干净。
console.log = () => {};

const UID = "6e3f0a1b2c4d5";
const PREFIX = UID.slice(0, 2);
const OBJECT_KEY = `sync/${PREFIX}/${UID}.json`;
const META_KEY = `sync/${PREFIX}/${UID}.meta.json`;

function envelope(overrides) {
  return {
    v: 1,
    alg: "AES-GCM-256",
    kdf: {
      alg: "PBKDF2-SHA256",
      iter: 310000,
      salt: Buffer.alloc(32, 7).toString("base64"),
    },
    iv: Buffer.alloc(12, 3).toString("base64"),
    ct: Buffer.alloc(64, 9).toString("base64"),
    updatedAt: 1792357121000,
    itemCount: 152,
    writer: "0123456789abcdef",
    ...(overrides || {}),
  };
}

/** 信封体积可用 ct 的长度精确调档（每多一个 base64 组即多 4 字节）。 */
function envelopeAtLeast(targetBytes) {
  const base = envelope({ ct: "A".repeat(4) });
  const baseSize = Buffer.byteLength(JSON.stringify(base), "utf8");
  const groups = Math.max(0, Math.ceil((targetBytes - baseSize) / 4));
  return envelope({ ct: "A".repeat(4 + groups * 4) });
}

function nowSeconds() {
  return logic.dayKey(Date.now());
}

function seedMeta(store) {
  store.objects.set(
    META_KEY,
    JSON.stringify({
      lastWriteAt: Date.now() - 60000,
      day: nowSeconds(),
      writes: 1,
    }),
  );
}

function createStore(seed) {
  const objects = new Map((seed || []).map(([key, body]) => [key, body]));
  const versions = new Map();
  const calls = [];
  let counter = 0;

  const versionOf = (key) => versions.get(key) || "";

  return {
    objects,
    calls,
    versions,
    /** 测试用：直接读回对象字节，验证「未写入」。 */
    bodyOf(key) {
      return objects.get(key);
    },
    async putObject(key, body) {
      calls.push({ method: "PUT", key });
      counter += 1;
      objects.set(key, body);
      versions.set(key, `v${counter}`);
      return {
        statusCode: 200,
        headers: { "x-cos-version-id": `v${counter}` },
        body: "",
      };
    },
    async getObject(key) {
      calls.push({ method: "GET", key });
      if (!objects.has(key)) {
        return {
          statusCode: 404,
          headers: {},
          body: "<Error>NoSuchKey</Error>",
        };
      }
      return {
        statusCode: 200,
        headers: { "x-cos-version-id": versionOf(key) },
        body: objects.get(key),
      };
    },
    async headObject(key) {
      calls.push({ method: "HEAD", key });
      if (!objects.has(key)) return { statusCode: 404, headers: {}, body: "" };
      return {
        statusCode: 200,
        headers: { "x-cos-version-id": versionOf(key) },
        body: "",
      };
    },
  };
}

function event(
  method,
  { uid = UID, path = "/v1/favorites", body = null, headers = {}, query } = {},
) {
  const queryString = query || {};
  if (uid !== null) queryString.uid = uid;
  return { httpMethod: method, path, queryString, headers, body };
}

function json(result) {
  return JSON.parse(result.body);
}

test("GET 云端无记录返回 200 snapshot:null（不是 404）", async () => {
  const store = createStore();

  const result = await createHandler(store)(event("GET"));

  assert.equal(result.statusCode, 200);
  assert.deepEqual(json(result), { snapshot: null });
  assert.equal(result.headers["Access-Control-Allow-Origin"], "*");
  assert.equal(
    store.calls.filter((call) => call.method === "PUT").length,
    0,
    "读路径不得写入",
  );
});

test("GET 有记录返回信封 JSON，ETag 等于 PUT 回带的 rev", async () => {
  const store = createStore();
  const handler = createHandler(store);
  const payload = envelope();

  const written = await handler(
    event("PUT", { body: JSON.stringify(payload) }),
  );
  assert.equal(written.statusCode, 200);

  const stored = await handler(event("GET"));
  assert.equal(stored.statusCode, 200);
  assert.deepEqual(json(stored), { snapshot: payload });
  assert.equal(stored.headers.ETag, json(written).rev);
  assert.equal(stored.headers["Cache-Control"], "no-store");
});

test("GET 命中 If-None-Match 短路为 304 且不下载对象体", async () => {
  const store = createStore();
  const handler = createHandler(store);
  const rev = json(
    await handler(event("PUT", { body: JSON.stringify(envelope()) })),
  ).rev;

  store.calls.length = 0;
  const result = await handler(
    event("GET", { headers: { "If-None-Match": rev } }),
  );

  assert.equal(result.statusCode, 304);
  assert.equal(result.body, "");
  assert.equal(result.headers["Access-Control-Allow-Origin"], "*");
  assert.deepEqual(
    store.calls.map((call) => call.method),
    ["HEAD"],
    "304 短路只允许一次 HEAD",
  );
});

test("GET 未命中 If-None-Match 时返回 200 信封", async () => {
  const store = createStore();
  const handler = createHandler(store);
  await handler(event("PUT", { body: JSON.stringify(envelope()) }));

  const result = await handler(
    event("GET", { headers: { "If-None-Match": "陈旧版本" } }),
  );

  assert.equal(result.statusCode, 200);
  assert.ok(json(result).snapshot);
});

test("PUT 正常返回 ok/updatedAt/rev，并写入信封字节与门禁账本", async () => {
  const store = createStore();
  const raw = JSON.stringify(envelope());

  const result = await createHandler(store)(event("PUT", { body: raw }));

  assert.equal(result.statusCode, 200);
  const body = json(result);
  assert.equal(body.ok, true);
  assert.equal(body.updatedAt, envelope().updatedAt);
  assert.equal(typeof body.rev, "string");
  assert.ok(body.rev.length > 0);
  assert.equal(store.bodyOf(OBJECT_KEY), raw);

  const meta = JSON.parse(store.bodyOf(META_KEY));
  assert.deepEqual(Object.keys(meta).sort(), ["day", "lastWriteAt", "writes"]);
  assert.equal(meta.day, nowSeconds());
  assert.equal(meta.writes, 1);
  assert.ok(Number.isInteger(meta.lastWriteAt));
  assert.ok(!store.bodyOf(META_KEY).includes("ct"), "账本不含任何用户内容");
});

test("PUT 接受 JSON Content-Type 与 base64 传递的请求体", async () => {
  const raw = JSON.stringify(envelope());

  const declared = createStore();
  const declaredResult = await createHandler(declared)(
    event("PUT", {
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: raw,
    }),
  );
  assert.equal(declaredResult.statusCode, 200);
  assert.equal(declared.bodyOf(OBJECT_KEY), raw);

  const encoded = createStore();
  const encodedEvent = event("PUT", { body: "" });
  encodedEvent.isBase64Encoded = "true";
  encodedEvent.body = Buffer.from(raw, "utf8").toString("base64");
  const encodedResult = await createHandler(encoded)(encodedEvent);
  assert.equal(encodedResult.statusCode, 200);
  assert.equal(encoded.bodyOf(OBJECT_KEY), raw);
});

test("PUT uid 非法返回 400 且不触达 COS", async () => {
  const store = createStore();
  const handler = createHandler(store);

  for (const uid of [
    "",
    "ZZZZ",
    "6E3F0A1B2C4D5",
    "6e3f0a1",
    "a".repeat(33),
    "../x",
  ]) {
    store.calls.length = 0;
    const result = await handler(
      event("PUT", { uid, body: JSON.stringify(envelope()) }),
    );
    assert.equal(result.statusCode, 400, `uid=${uid}`);
    assert.deepEqual(json(result), { error: "invalid_uid" });
    assert.equal(store.calls.length, 0, `uid=${uid} 不应触达 COS`);
  }
});

test("PUT 信封非法（白名单外字段、未知版本、缺字段、坏 base64）返回 400 且不写入", async () => {
  const missingCt = envelope();
  delete missingCt.ct;
  const nestedExtra = envelope();
  nestedExtra.kdf = { ...nestedExtra.kdf, extra: true };

  const cases = [
    { ...envelope(), extra: 1 },
    envelope({ v: 2 }),
    envelope({ alg: "AES-CBC" }),
    envelope({ writer: "xyz" }),
    envelope({ updatedAt: "1792357121000" }),
    envelope({ itemCount: 1.5 }),
    envelope({ ct: "not-base64" }),
    envelope({ iv: Buffer.alloc(8, 1).toString("base64") }),
    missingCt,
    nestedExtra,
  ];

  for (const payload of cases) {
    const store = createStore();
    const result = await createHandler(store)(
      event("PUT", { body: JSON.stringify(payload) }),
    );
    assert.equal(result.statusCode, 400, JSON.stringify(payload));
    assert.equal(json(result).error, "invalid_envelope");
    assert.equal(store.bodyOf(OBJECT_KEY), undefined, "非法信封不得写入");
  }

  const broken = createStore();
  const brokenResult = await createHandler(broken)(
    event("PUT", { body: "{不是 JSON" }),
  );
  assert.equal(brokenResult.statusCode, 400);
  assert.equal(json(brokenResult).reason, "invalid_json");
});

test("PUT 拒绝非 JSON 的 Content-Type，未声明时不拦", async () => {
  const store = createStore();
  const handler = createHandler(store);

  for (const contentType of ["text/plain", "multipart/form-data; boundary=x"]) {
    const result = await handler(
      event("PUT", {
        headers: { "Content-Type": contentType },
        body: JSON.stringify(envelope()),
      }),
    );
    assert.equal(result.statusCode, 400);
    assert.equal(json(result).reason, "unsupported_content_type");
  }
  assert.equal(store.bodyOf(OBJECT_KEY), undefined);

  const undeclared = createStore();
  const accepted = await createHandler(undeclared)(
    event("PUT", { body: JSON.stringify(envelope()) }),
  );
  assert.equal(
    accepted.statusCode,
    200,
    "未声明 Content-Type 仍须过信封白名单",
  );
});

test("PUT 体积闸：≤512KB 通过，>512KB 返回 413 且不触达 COS", async () => {
  const under = JSON.stringify(envelopeAtLeast(logic.MAX_BODY_BYTES - 8));
  assert.ok(Buffer.byteLength(under, "utf8") <= logic.MAX_BODY_BYTES);
  const underStore = createStore();
  const accepted = await createHandler(underStore)(
    event("PUT", { body: under }),
  );
  assert.equal(accepted.statusCode, 200);

  const over = JSON.stringify(envelopeAtLeast(logic.MAX_BODY_BYTES + 4));
  assert.ok(Buffer.byteLength(over, "utf8") > logic.MAX_BODY_BYTES);
  const overStore = createStore();
  const rejected = await createHandler(overStore)(event("PUT", { body: over }));
  assert.equal(rejected.statusCode, 413);
  assert.match(json(rejected).message, /512KB/);
  assert.equal(overStore.calls.length, 0, "超限请求不得触达 COS");
});

test("PUT 过频：10 秒内第二次返回 429 且对象字节未变", async () => {
  const store = createStore();
  const handler = createHandler(store);
  const first = JSON.stringify(envelope({ updatedAt: 1792357121000 }));
  const second = JSON.stringify(envelope({ updatedAt: 1792357129999 }));

  assert.equal((await handler(event("PUT", { body: first }))).statusCode, 200);
  const before = store.bodyOf(OBJECT_KEY);

  const result = await handler(event("PUT", { body: second }));

  assert.equal(result.statusCode, 429);
  assert.equal(json(result).error, "too_frequent");
  assert.match(json(result).message, /操作太快/);
  assert.equal(store.bodyOf(OBJECT_KEY), before, "过频请求不得覆盖对象");
});

test("PUT 当日超配额返回 429 且对象字节未变", async () => {
  const store = createStore([
    [
      META_KEY,
      JSON.stringify({
        lastWriteAt: Date.now() - 60000,
        day: nowSeconds(),
        writes: logic.DAILY_WRITE_LIMIT,
      }),
    ],
  ]);

  const result = await createHandler(store)(
    event("PUT", { body: JSON.stringify(envelope()) }),
  );

  assert.equal(result.statusCode, 429);
  assert.equal(json(result).error, "daily_quota");
  assert.match(json(result).message, /今日同步次数已达上限/);
  assert.equal(store.bodyOf(OBJECT_KEY), undefined);
});

test("PUT 时间戳倒退返回 409 并回带服务端 updatedAt，不覆盖", async () => {
  const server = envelope({ updatedAt: 1792357999000 });
  const store = createStore([[OBJECT_KEY, JSON.stringify(server)]]);

  const result = await createHandler(store)(
    event("PUT", {
      body: JSON.stringify(envelope({ updatedAt: 1792357000000 })),
    }),
  );

  assert.equal(result.statusCode, 409);
  assert.deepEqual(json(result), {
    error: "conflict",
    updatedAt: 1792357999000,
  });
  assert.equal(
    store.bodyOf(OBJECT_KEY),
    JSON.stringify(server),
    "冲突不得覆盖",
  );
});

test("PUT 时间戳相等或更新时允许覆盖", async () => {
  const server = envelope({ updatedAt: 1792357999000 });
  for (const updatedAt of [1792357999000, 1792358000000]) {
    const store = createStore([[OBJECT_KEY, JSON.stringify(server)]]);
    seedMeta(store);

    const result = await createHandler(store)(
      event("PUT", { body: JSON.stringify(envelope({ updatedAt })) }),
    );

    assert.equal(result.statusCode, 200, `updatedAt=${updatedAt}`);
  }
});

test("DELETE 写空快照哨兵（不删对象），随后 GET 返回 snapshot:null", async () => {
  const store = createStore();
  const handler = createHandler(store);
  await handler(event("PUT", { body: JSON.stringify(envelope()) }));

  const deleted = await handler(event("DELETE"));

  assert.equal(deleted.statusCode, 200);
  assert.deepEqual(json(deleted), { ok: true });
  assert.equal(store.bodyOf(OBJECT_KEY), logic.CLEARED_SNAPSHOT_BODY);
  assert.equal(
    store.calls.filter(
      (call) => call.method === "PUT" && call.key === OBJECT_KEY,
    ).length,
    2,
    "DELETE 是覆盖写入而非删除对象，版本历史由此保留",
  );

  const after = await handler(event("GET"));
  assert.equal(after.statusCode, 200);
  assert.deepEqual(json(after), { snapshot: null });

  // 清空是版本化的覆盖：旧 rev 不再短路，新 rev 才能短路。
  const stale = await handler(
    event("GET", { headers: { "If-None-Match": "v1" } }),
  );
  assert.equal(stale.statusCode, 200);
  const current = await handler(
    event("GET", {
      headers: { "If-None-Match": store.versions.get(OBJECT_KEY) },
    }),
  );
  assert.equal(current.statusCode, 304);
});

test("OPTIONS 对任意路径返回 204 与预检头，且不触达 COS", async () => {
  const store = createStore();

  const result = await createHandler(store)(
    event("OPTIONS", { path: "/anywhere", uid: null }),
  );

  assert.equal(result.statusCode, 204);
  assert.equal(result.body, "");
  assert.equal(result.headers["Access-Control-Allow-Origin"], "*");
  assert.equal(
    result.headers["Access-Control-Allow-Methods"],
    "GET,PUT,DELETE,OPTIONS",
  );
  assert.equal(
    result.headers["Access-Control-Allow-Headers"],
    "Content-Type,If-None-Match",
  );
  assert.equal(store.calls.length, 0);
});

test("未知路径 404、未知方法 405", async () => {
  const store = createStore();
  const handler = createHandler(store);

  const missing = await handler(event("GET", { path: "/foo" }));
  assert.equal(missing.statusCode, 404);
  assert.deepEqual(json(missing), { error: "not_found" });

  const patch = await handler(event("PATCH"));
  assert.equal(patch.statusCode, 405);
  assert.equal(patch.headers.Allow, "GET,PUT,DELETE,OPTIONS");
  assert.equal(store.calls.length, 0);
});

test("COS 异常返回 503 且带 CORS 头，异常内容不外泄", async () => {
  const store = createStore();
  store.getObject = async () => {
    throw new Error("COS 返回的敏感文本");
  };

  const result = await createHandler(store)(
    event("PUT", { body: JSON.stringify(envelope()) }),
  );

  assert.equal(result.statusCode, 503);
  assert.deepEqual(json(result), { error: "unavailable" });
  assert.equal(result.headers["Access-Control-Allow-Origin"], "*");
  assert.ok(!result.body.includes("敏感"));
});

test("云端对象不是 JSON 时返回 503，避免客户端误判为首次启用", async () => {
  const store = createStore([[OBJECT_KEY, "<Error>损坏内容</Error>"]]);

  const result = await createHandler(store)(event("GET"));

  assert.equal(result.statusCode, 503);
});

test("日志只含状态码、uid 前 2 位、字节数与耗时", async (t) => {
  const lines = [];
  t.mock.method(console, "log", (line) => lines.push(line));

  const store = createStore();
  const handler = createHandler(store);
  const payload = envelope();
  await handler(event("PUT", { body: JSON.stringify(payload) }));
  await handler(event("GET"));
  await handler(event("PUT", { uid: "不合法", body: JSON.stringify(payload) }));

  assert.equal(lines.length, 3);
  for (const line of lines) {
    const entry = JSON.parse(line);
    assert.ok(entry.status > 0);
    assert.ok(Number.isInteger(entry.bytes));
    assert.ok(Number.isInteger(entry.ms));
    assert.ok(
      Object.keys(entry).every((key) =>
        ["status", "bytes", "ms", "uid2"].includes(key),
      ),
      `日志字段越界: ${line}`,
    );
  }

  assert.equal(JSON.parse(lines[0]).uid2, UID.slice(0, 2));
  assert.equal(JSON.parse(lines[2]).uid2, undefined, "非法 uid 不记录片段");
  assert.ok(!lines[0].includes(payload.ct), "日志不得含 ct");
  assert.ok(!lines[1].includes(payload.ct), "日志不得含信封内容");
});

test("logPayload 只暴露允许的字段", () => {
  const payload = logic.logPayload(200, UID, 12, 3);
  assert.deepEqual(Object.keys(payload).sort(), [
    "bytes",
    "ms",
    "status",
    "uid2",
  ]);
  assert.equal(payload.uid2, UID.slice(0, 2));
  assert.equal(logic.logPayload(400, "不是 uid", 0, 1).uid2, undefined);
  assert.equal(logic.logPayload(503, UID, 0, 1).status, 503);
});

test("uid 白名单与键派生", () => {
  assert.ok(logic.isValidUid("6e3f0a1b2c4d5"));
  assert.ok(logic.isValidUid("a".repeat(32)));
  assert.ok(!logic.isValidUid("6E3F0A1B2C4D"));
  assert.ok(!logic.isValidUid("6e3f0a1"));
  assert.ok(!logic.isValidUid("a".repeat(33)));
  assert.ok(!logic.isValidUid("../etc/passwd"));

  assert.equal(logic.objectKey(UID), OBJECT_KEY);
  assert.equal(logic.metaKey(UID), META_KEY);
  assert.equal(logic.SNAPSHOT_PATH, "/v1/favorites");
  assert.equal(logic.OBJECT_PREFIX, "sync/");
});

test("体积闸边界：等于上限放行，超一字节拒绝", () => {
  assert.equal(logic.MAX_BODY_BYTES, 524288);
  assert.equal(logic.bodyTooLarge(logic.MAX_BODY_BYTES), false);
  assert.equal(logic.bodyTooLarge(logic.MAX_BODY_BYTES + 1), true);
  assert.equal(logic.DAILY_WRITE_LIMIT, 200);
  assert.equal(logic.MIN_WRITE_INTERVAL_MS, 10000);
});

test("If-None-Match 判定覆盖引号、弱校验与通配", () => {
  const rev = "0123456789abcdef0123456789abcdef";
  assert.equal(logic.ifNoneMatchMatches(rev, rev), true);
  assert.equal(logic.ifNoneMatchMatches(`"${rev}"`, rev), true);
  assert.equal(logic.ifNoneMatchMatches(`W/"${rev}"`, rev), true);
  assert.equal(logic.ifNoneMatchMatches(`"old", "${rev}"`, rev), true);
  assert.equal(logic.ifNoneMatchMatches("*", rev), true);
  assert.equal(logic.ifNoneMatchMatches("old", rev), false);
  assert.equal(logic.ifNoneMatchMatches("", rev), false);
  assert.equal(logic.ifNoneMatchMatches(undefined, rev), false);
  assert.equal(logic.ifNoneMatchMatches(rev, ""), false);
});

test("写频率与日配额判定覆盖跨日重置", () => {
  const now = Date.now();
  const day = nowSeconds();
  const fresh = {
    lastWriteAt: now - logic.MIN_WRITE_INTERVAL_MS,
    day,
    writes: 5,
  };

  assert.equal(logic.writeGate(fresh, now).allowed, true);
  assert.equal(
    logic.writeGate({ ...fresh, lastWriteAt: now - 1 }, now).reason,
    "too_frequent",
  );
  assert.equal(
    logic.writeGate(
      { lastWriteAt: now - 60000, day, writes: logic.DAILY_WRITE_LIMIT },
      now,
    ).reason,
    "daily_quota",
  );
  assert.equal(
    logic.writeGate(
      { lastWriteAt: now - 60000, day: "2000-01-01", writes: 999 },
      now,
    ).allowed,
    true,
    "跨日重置",
  );
  assert.equal(logic.writeGate(null, now).allowed, true);
  assert.equal(logic.writeGate("脏数据", now).allowed, true);

  assert.deepEqual(logic.nextMeta({ lastWriteAt: 1, day, writes: 5 }, now), {
    lastWriteAt: now,
    day,
    writes: 6,
  });
  assert.deepEqual(
    logic.nextMeta({ lastWriteAt: 1, day: "2000-01-01", writes: 5 }, now),
    { lastWriteAt: now, day, writes: 1 },
  );
  assert.equal(logic.dayKey(Date.UTC(2026, 9, 18, 15, 30)), "2026-10-18");
  assert.equal(logic.dayKey(Date.UTC(2026, 9, 18, 16, 30)), "2026-10-19");
});

test("信封白名单对每个字段独立生效", () => {
  assert.equal(logic.validateEnvelope(envelope()), null);
  assert.equal(
    logic.validateEnvelope(envelope({ v: 1.0 })),
    null,
    "1.0 仍是整数 1",
  );
  for (const key of logic.ENVELOPE_FIELDS) {
    const value = envelope();
    delete value[key];
    assert.equal(logic.validateEnvelope(value), "missing_field", `缺少 ${key}`);
  }
  assert.equal(logic.validateEnvelope([]), "not_an_object");
  assert.equal(logic.validateEnvelope(null), "not_an_object");
  assert.equal(logic.parseEnvelopeBody("").reason, "empty_body");
  assert.equal(logic.parseEnvelopeBody("[]").reason, "not_an_object");
});

test("classifySnapshot 与 parseStoredUpdatedAt 的边界", () => {
  assert.equal(logic.classifySnapshot(""), "cleared");
  assert.equal(logic.classifySnapshot("  null "), "cleared");
  assert.equal(logic.classifySnapshot(JSON.stringify(envelope())), "snapshot");
  assert.equal(logic.classifySnapshot("[1,2]"), "invalid");
  assert.equal(logic.classifySnapshot("坏内容"), "invalid");
  assert.equal(logic.classifySnapshot(undefined), "cleared");

  assert.equal(
    logic.parseStoredUpdatedAt(JSON.stringify(envelope())),
    1792357121000,
  );
  assert.equal(logic.parseStoredUpdatedAt("null"), null);
  assert.equal(logic.parseStoredUpdatedAt("坏内容"), null);
  assert.equal(
    logic.parseStoredUpdatedAt(JSON.stringify({ updatedAt: 0 })),
    null,
  );
});

test("CORS 头构造：预检含方法与请求头白名单，普通响应含暴露头", () => {
  const preflight = logic.preflightHeaders();
  assert.equal(preflight["Access-Control-Allow-Origin"], "*");
  assert.equal(
    preflight["Access-Control-Allow-Methods"],
    "GET,PUT,DELETE,OPTIONS",
  );
  assert.equal(
    preflight["Access-Control-Allow-Headers"],
    "Content-Type,If-None-Match",
  );
  assert.equal(preflight["Access-Control-Max-Age"], "86400");

  const plain = logic.corsHeaders();
  assert.equal(plain["Access-Control-Allow-Origin"], "*");
  assert.equal(plain["Access-Control-Expose-Headers"], "ETag");
  assert.equal(plain["Access-Control-Allow-Methods"], undefined);

  plain["Access-Control-Allow-Origin"] = "被改坏";
  assert.equal(
    logic.corsHeaders()["Access-Control-Allow-Origin"],
    "*",
    "每次返回新对象",
  );
});

test("cos.js 只在调用时才读取运行时凭据，模块加载不缓存", () => {
  const cos = require("./cos.js");
  const saved = { ...process.env };
  for (const key of [
    "COS_BUCKET",
    "COS_REGION",
    "TENCENTCLOUD_SECRETID",
    "TENCENTCLOUD_SECRETKEY",
    "TENCENTCLOUD_SESSIONTOKEN",
  ]) {
    delete process.env[key];
  }
  try {
    // 缺失凭据时同步失败，且不发起任何请求。
    assert.throws(() => cos.getObject("sync/6e/6e3f0a1b2c4d5.json"), /凭据/);
  } finally {
    Object.assign(process.env, saved);
  }
  assert.equal(typeof cos.revision({ "x-cos-version-id": "v9" }), "string");
});

test("main_handler 与 createHandler 的导出形态", () => {
  const index = require("./index.js");
  assert.equal(typeof index.main_handler, "function");
  assert.equal(typeof index.createHandler, "function");
});

test("HEAD 200 但 GET 404：返回 200 snapshot:null，不当作错误", async () => {
  const store = createStore();
  store.headObject = async () => ({
    statusCode: 200,
    headers: { "x-cos-version-id": "v1" },
    body: "",
  });
  store.getObject = async () => ({ statusCode: 404, headers: {}, body: "" });

  const result = await createHandler(store)(event("GET"));

  assert.equal(result.statusCode, 200);
  assert.deepEqual(json(result), { snapshot: null });
});

test("门禁账本写入失败时，已落地的快照仍返回 200", async () => {
  const store = createStore();
  const putObject = store.putObject.bind(store);
  store.putObject = async (key, body, headers) => {
    if (key === META_KEY) throw new Error("账本写入失败");
    return putObject(key, body, headers);
  };

  const result = await createHandler(store)(
    event("PUT", { body: JSON.stringify(envelope()) }),
  );

  assert.equal(result.statusCode, 200);
  assert.equal(json(result).ok, true);
  assert.equal(store.bodyOf(OBJECT_KEY), JSON.stringify(envelope()));
  assert.equal(store.bodyOf(META_KEY), undefined, "账本没写成");
});

test("DELETE 对从未写入过的 uid 也返回 200 并写下哨兵", async () => {
  const store = createStore();

  const deleted = await createHandler(store)(event("DELETE"));

  assert.equal(deleted.statusCode, 200);
  assert.deepEqual(json(deleted), { ok: true });
  assert.equal(store.bodyOf(OBJECT_KEY), logic.CLEARED_SNAPSHOT_BODY);

  const after = await createHandler(store)(event("GET"));
  assert.equal(after.statusCode, 200);
  assert.deepEqual(json(after), { snapshot: null });
});

test("decodeBody：非字符串 body 与非法 base64 都只得到 400，不会 500", async () => {
  const objectBody = createStore();
  const nonString = event("PUT");
  nonString.body = { not: "a", string: "body" };
  const objectResult = await createHandler(objectBody)(nonString);
  assert.equal(objectResult.statusCode, 400);
  assert.equal(json(objectResult).reason, "invalid_json");
  assert.equal(objectBody.calls.length, 0);

  const numberBody = createStore();
  const numeric = event("PUT");
  numeric.body = 12345;
  const numericResult = await createHandler(numberBody)(numeric);
  assert.equal(numericResult.statusCode, 400);
  assert.equal(json(numericResult).reason, "not_an_object");

  const encodedBody = createStore();
  const invalidBase64 = event("PUT");
  invalidBase64.isBase64Encoded = "true";
  invalidBase64.body = "不是合法的 base64 !!!";
  const encodedResult = await createHandler(encodedBody)(invalidBase64);
  assert.equal(encodedResult.statusCode, 400);
  assert.equal(json(encodedResult).reason, "invalid_json");
  assert.equal(encodedBody.bodyOf(OBJECT_KEY), undefined);
});

test("updatedAt 有上界：超出允许时钟偏移即 400，不能钉死该 uid 的后续写入", async () => {
  const now = Date.now();
  assert.equal(
    logic.validateEnvelope(
      envelope({ updatedAt: now + logic.MAX_CLOCK_SKEW_MS }),
      now,
    ),
    null,
    "允许 10 分钟内的客户端时钟偏移",
  );
  assert.equal(
    logic.validateEnvelope(
      envelope({ updatedAt: now + logic.MAX_CLOCK_SKEW_MS + 1 }),
      now,
    ),
    "invalid_updated_at",
  );
  assert.equal(
    logic.validateEnvelope(
      envelope({ updatedAt: Number.MAX_SAFE_INTEGER }),
      now,
    ),
    "invalid_updated_at",
    "2^53 量级的值一旦落地，该 uid 之后所有写入会恒 409",
  );
  assert.equal(logic.validateEnvelope(envelope({ updatedAt: now }), now), null);

  const store = createStore();
  const result = await createHandler(store)(
    event("PUT", {
      body: JSON.stringify(envelope({ updatedAt: Number.MAX_SAFE_INTEGER })),
    }),
  );
  assert.equal(result.statusCode, 400);
  assert.equal(json(result).reason, "invalid_updated_at");
  assert.equal(store.calls.length, 0, "非法信封不触达 COS");

  const boundary = createStore();
  const accepted = await createHandler(boundary)(
    event("PUT", { body: JSON.stringify(envelope({ updatedAt: now + 1000 })) }),
  );
  assert.equal(accepted.statusCode, 200, "轻微时钟超前仍可写入");
});

test("kdf.iter 有下限：弱信封返回 400 且不写入", async () => {
  const salt = Buffer.alloc(32, 7).toString("base64");
  for (const iter of [1, 99999]) {
    const payload = envelope();
    payload.kdf = { alg: "PBKDF2-SHA256", iter, salt };
    assert.equal(
      logic.validateEnvelope(payload),
      "invalid_kdf",
      `iter=${iter}`,
    );

    const store = createStore();
    const result = await createHandler(store)(
      event("PUT", { body: JSON.stringify(payload) }),
    );
    assert.equal(result.statusCode, 400, `iter=${iter}`);
    assert.equal(json(result).reason, "invalid_kdf");
    assert.equal(store.bodyOf(OBJECT_KEY), undefined);
  }

  assert.equal(
    logic.validateEnvelope(
      envelope({
        kdf: { alg: "PBKDF2-SHA256", iter: logic.MIN_KDF_ITER, salt },
      }),
    ),
    null,
    "刚好到下限时接受",
  );
});
