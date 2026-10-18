"use strict";

// cos.js 里手写的签名与 URL 编码没有别的自动防线：一旦回归，线上全部请求 403 而 CI 仍全绿。
//
// 下面 PUT / GET 两条期望串是**完整 Authorization**（含签名），由固定的
// keyTime/SecretId/SecretKey 与固定 host 推出；期望值已用另一份独立实现的
// COS《请求签名》步骤（SignKey → FormatString → SHA1 → StringToSign → Signature）
// 交叉核对过中间量与最终签名，不是代码输出的快照。
//
// 运行：node --test "cloud/sync/*.test.js"

const assert = require("node:assert/strict");
const { test } = require("node:test");

const cos = require("./cos.js");

const HOST = "iirose-media-sync-1309510434.cos.ap-guangzhou.myqcloud.com";
const PATHNAME = "/sync/6e/6e3f0a1b2c4d5.json";
const KEY_TIME = "1557989753;1557996653";
const CONFIG = { secretId: "AKIDEXAMPLE", secretKey: "SECRETKEYEXAMPLE" };

const PUT_AUTHORIZATION =
  "q-sign-algorithm=sha1&q-ak=AKIDEXAMPLE&q-sign-time=1557989753;1557996653" +
  "&q-key-time=1557989753;1557996653" +
  "&q-header-list=cache-control;content-type;host&q-url-param-list=" +
  "&q-signature=01e9b797db85fbdfcdb7176e72ad2d7bd974dc57";

const GET_AUTHORIZATION =
  "q-sign-algorithm=sha1&q-ak=AKIDEXAMPLE&q-sign-time=1557989753;1557996653" +
  "&q-key-time=1557989753;1557996653" +
  "&q-header-list=host&q-url-param-list=" +
  "&q-signature=5cff7966441358f588c2b152f8aafa8e48f9f55e";

// HEAD 与 GET 的头列表相同，但方法进了 FormatString，签名因此不同。
const HEAD_AUTHORIZATION =
  "q-sign-algorithm=sha1&q-ak=AKIDEXAMPLE&q-sign-time=1557989753;1557996653" +
  "&q-key-time=1557989753;1557996653" +
  "&q-header-list=host&q-url-param-list=" +
  "&q-signature=688e6eb7705d3db30401031274c28141a3030d0a";

test("buildAuthorization 对 PUT 的完整期望串（固定 keyTime）", () => {
  const authorization = cos.buildAuthorization({
    method: "PUT",
    pathname: PATHNAME,
    headers: {
      host: HOST,
      "content-type": "application/json",
      "cache-control": "no-store",
    },
    keyTime: KEY_TIME,
    config: CONFIG,
  });

  assert.equal(authorization, PUT_AUTHORIZATION);
});

test("buildAuthorization 对只有 host 的 HEAD/GET 的完整期望串", () => {
  const authorization = cos.buildAuthorization({
    method: "GET",
    pathname: PATHNAME,
    headers: { host: HOST },
    keyTime: KEY_TIME,
    config: CONFIG,
  });

  assert.equal(authorization, GET_AUTHORIZATION);
  assert.equal(
    cos.buildAuthorization({
      method: "HEAD",
      pathname: PATHNAME,
      headers: { host: HOST },
      keyTime: KEY_TIME,
      config: CONFIG,
    }),
    HEAD_AUTHORIZATION,
  );
});

test("签名头列表只含可签头且按键名排序，content-length 被排除", () => {
  const withLength = cos.buildAuthorization({
    method: "PUT",
    pathname: PATHNAME,
    headers: {
      host: HOST,
      "cache-control": "no-store",
      "content-type": "application/json",
      "content-length": "12345",
    },
    keyTime: KEY_TIME,
    config: CONFIG,
  });

  assert.equal(
    withLength,
    PUT_AUTHORIZATION,
    "content-length 与头顺序都不影响结果",
  );
  assert.match(withLength, /&q-header-list=cache-control;content-type;host&/);
  assert.match(withLength, /&q-url-param-list=&q-signature=/);
  assert.match(withLength, /&q-sign-time=1557989753;1557996653&/);
  assert.match(withLength, /&q-key-time=1557989753;1557996653&/);
});

test("buildAuthorization 签入 x-cos-security-token 等 x-cos-* 头", () => {
  const withToken = cos.buildAuthorization({
    method: "GET",
    pathname: PATHNAME,
    headers: { host: HOST, "x-cos-security-token": "abc+/=token" },
    keyTime: KEY_TIME,
    config: CONFIG,
  });

  assert.match(
    withToken,
    /&q-header-list=host;x-cos-security-token&/,
    "临时凭据的 token 必须进签名",
  );
  assert.notEqual(withToken, GET_AUTHORIZATION);
});

test("camSafeUrlEncode 覆盖 !'()* 、斜杠与保留字符", () => {
  assert.equal(cos.camSafeUrlEncode("-.~_"), "-.~_");
  assert.equal(cos.camSafeUrlEncode("/"), "%2F");
  assert.equal(cos.camSafeUrlEncode(" "), "%20");
  assert.equal(cos.camSafeUrlEncode("!"), "%21");
  assert.equal(cos.camSafeUrlEncode("'"), "%27");
  assert.equal(cos.camSafeUrlEncode("("), "%28");
  assert.equal(cos.camSafeUrlEncode(")"), "%29");
  assert.equal(cos.camSafeUrlEncode("*"), "%2A");
  assert.equal(cos.camSafeUrlEncode("a/b c.json"), "a%2Fb%20c.json");
  assert.equal(cos.camSafeUrlEncode("%"), "%25");
  assert.equal(cos.camSafeUrlEncode("密"), "%E5%AF%86");
});

test("encodePath 保留多级 key 的斜杠并逐段编码", () => {
  assert.equal(cos.encodePath("sync/6e/6e3f0a1b2c4d5.json"), PATHNAME);
  assert.equal(
    cos.encodePath("sync/6e/6e3f0a1b2c4d5.meta.json"),
    "/sync/6e/6e3f0a1b2c4d5.meta.json",
  );
  assert.equal(cos.encodePath("sync/6e/x y.json"), "/sync/6e/x%20y.json");
  assert.ok(cos.encodePath("sync/6e/a.json").startsWith("/"));
});

test("revision 覆盖 VersionId、带引号 etag、弱校验与缺失", () => {
  assert.equal(
    cos.revision({ "x-cos-version-id": "MTg0NDY3NDI_Cg" }),
    "MTg0NDY3NDI_Cg",
  );
  assert.equal(
    cos.revision({ "x-cos-version-id": "v1", etag: '"aaaa"' }),
    "v1",
    "VersionId 优先",
  );
  assert.equal(
    cos.revision({ etag: '"d41d8cd98f00b204e9800998ecf8427e"' }),
    "d41d8cd98f00b204e9800998ecf8427e",
  );
  assert.equal(cos.revision({ etag: 'W/"d41d8cd9"' }), "d41d8cd9");
  assert.equal(cos.revision({}), "");
  assert.equal(cos.revision(undefined), "");
  assert.equal(cos.revision({ "x-cos-version-id": "" }), "");
  assert.equal(cos.revision({ "x-cos-version-id": 12345 }), "");
});

test("stripQuotes 去掉引号与弱校验前缀", () => {
  assert.equal(cos.stripQuotes('"abc"'), "abc");
  assert.equal(cos.stripQuotes('W/"abc"'), "abc");
  assert.equal(cos.stripQuotes("abc"), "abc");
  assert.equal(cos.stripQuotes('"a"b"'), 'a"b');
});
