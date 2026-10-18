"use strict";

// 最小 COS 封装：只用 Node 内置模块，不引入 SDK，也没有任何长期密钥。
//
// 签名算法即 COS 文档《请求签名》(cloud.tencent.com/document/product/436/7778) 的
// q-sign-algorithm=sha1 方案。注意：TC3-HMAC-SHA256 是腾讯云 API 3.0 的鉴权方式，
// COS XML API 不接受它（官方 Node/Python SDK 的 getAuth 同样只用 sha1 方案），
// 因此这里按 COS 实际支持的算法手写，而不是照搬云 API 的 TC3。
//
// 凭据来自函数运行角色的临时密钥环境变量，由 SCF 在每次调用前刷新，
// 所以每次请求都重新读取，不做模块级缓存。

const crypto = require("crypto");
const https = require("https");

// 单次 COS 请求超时；一次 PUT 最多 4 次调用，必须留在函数超时之内。
const DEFAULT_TIMEOUT_MS = 5000;
// 信封上限 512KB；响应体上限留一倍余量，防御异常响应把内存打满。
const MAX_RESPONSE_BYTES = 1024 * 1024;
const SIGN_VALID_SECONDS = 900;

// COS 允许签入签名的头，见官方 SDK 的 signHeaders。
const SIGNED_HEADERS = new Set([
  "cache-control",
  "content-disposition",
  "content-encoding",
  "content-md5",
  "content-type",
  "expect",
  "expires",
  "host",
  "if-match",
  "if-modified-since",
  "if-none-match",
  "if-unmodified-since",
  "origin",
  "range",
  "transfer-encoding",
  "pic-operations",
]);

function readConfig() {
  const bucket = process.env.COS_BUCKET || "";
  const region = process.env.COS_REGION || "";
  const secretId = process.env.TENCENTCLOUD_SECRETID || "";
  const secretKey = process.env.TENCENTCLOUD_SECRETKEY || "";
  const token = process.env.TENCENTCLOUD_SESSIONTOKEN || "";
  if (!bucket || !region || !secretId || !secretKey) {
    // 不输出任何取值，只报缺失事实。
    throw new Error("COS 配置或临时凭据缺失");
  }
  return { bucket, region, secretId, secretKey, token };
}

/** COS 规定的 URL 编码：保留 -_.~，其余（含 / 与 ! ' ( ) *）转义为大写十六进制。 */
function camSafeUrlEncode(value) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function hmacSha1Hex(key, message) {
  return crypto.createHmac("sha1", key).update(message, "utf8").digest("hex");
}

function sha1Hex(message) {
  return crypto.createHash("sha1").update(message, "utf8").digest("hex");
}

function encodePath(key) {
  return `/${key
    .split("/")
    .map((segment) => camSafeUrlEncode(segment))
    .join("/")}`;
}

function canonicalHeaders(headers) {
  const signed = {};
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    if (lower === "content-length") continue; // 由运行时生成，签它只会徒增脆性
    if (
      SIGNED_HEADERS.has(lower) ||
      lower.startsWith("x-cos-") ||
      lower.startsWith("x-ci-")
    ) {
      signed[lower] = value;
    }
  }
  const names = Object.keys(signed).sort();
  const string = names
    .map(
      (name) =>
        `${camSafeUrlEncode(name)}=${camSafeUrlEncode(String(signed[name]))}`,
    )
    .join("&");
  return { names, string };
}

function buildAuthorization({ method, pathname, headers, keyTime, config }) {
  const signedHeaders = canonicalHeaders(headers);
  const formatString = [
    method.toLowerCase(),
    pathname,
    "",
    signedHeaders.string,
    "",
  ].join("\n");
  // 1. SignKey = HMAC-SHA1(SecretKey, KeyTime)
  const signKey = hmacSha1Hex(config.secretKey, keyTime);
  // 2. StringToSign = sha1\nKeyTime\nSHA1(FormatString)\n
  const stringToSign = ["sha1", keyTime, sha1Hex(formatString), ""].join("\n");
  // 3. Signature = HMAC-SHA1(SignKey, StringToSign)，注意密钥用的是 hex 字符串
  const signature = hmacSha1Hex(signKey, stringToSign);
  const signedHeaderNames = signedHeaders.names.join(";");
  return [
    "q-sign-algorithm=sha1",
    `q-ak=${config.secretId}`,
    `q-sign-time=${keyTime}`,
    `q-key-time=${keyTime}`,
    `q-header-list=${signedHeaderNames}`,
    "q-url-param-list=",
    `q-signature=${signature}`,
  ].join("&");
}

function request({
  method,
  key,
  body,
  headers = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const config = readConfig();
  const host = `${config.bucket}.cos.${config.region}.myqcloud.com`;
  const pathname = encodePath(key);
  const payload = body === undefined ? undefined : Buffer.from(body, "utf8");
  const nowSeconds = Math.floor(Date.now() / 1000);
  const keyTime = `${nowSeconds};${nowSeconds + SIGN_VALID_SECONDS}`;

  const requestHeaders = { host, ...headers };
  if (config.token) requestHeaders["x-cos-security-token"] = config.token;
  if (payload !== undefined)
    requestHeaders["content-length"] = String(payload.length);
  requestHeaders.Authorization = buildAuthorization({
    method,
    pathname,
    headers: requestHeaders,
    keyTime,
    config,
  });

  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (error, value) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve(value);
    };

    const req = https.request(
      {
        host,
        port: 443,
        method,
        path: pathname,
        headers: requestHeaders,
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        let received = 0;
        res.on("data", (chunk) => {
          received += chunk.length;
          if (received > MAX_RESPONSE_BYTES) {
            req.destroy(new Error("COS 响应体超限"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("error", (error) => done(error));
        res.on("end", () =>
          done(null, {
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );

    req.on("timeout", () => req.destroy(new Error("COS 请求超时")));
    req.on("error", (error) => done(error));
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

function getObject(key) {
  return request({ method: "GET", key });
}

function headObject(key) {
  return request({ method: "HEAD", key });
}

function putObject(key, body, headers) {
  return request({ method: "PUT", key, body, headers });
}

/**
 * rev：优先取 COS VersionId（协议里的 rev 即它），版本控制关闭时退回 ETag，
 * 保证「PUT 回带的 rev 与后续 GET 的 ETag 一致」这条客户端契约始终成立。
 */
function revision(headers) {
  if (!headers || typeof headers !== "object") return "";
  const raw = headers["x-cos-version-id"] || headers.etag;
  if (typeof raw !== "string" || raw.length === 0) return "";
  return stripQuotes(raw.trim());
}

function stripQuotes(value) {
  const weak = value.replace(/^W\//i, "");
  return weak.replace(/^"(.*)"$/, "$1");
}

module.exports = {
  camSafeUrlEncode,
  encodePath,
  buildAuthorization,
  getObject,
  headObject,
  putObject,
  revision,
  stripQuotes,
};
