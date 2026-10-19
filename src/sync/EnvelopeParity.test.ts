import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { SyncCrypto } from "./SyncCrypto";

// cloud/sync/logic.js 是部署到云函数的裸 CJS 模块、没有类型声明。
// 用 createRequire 加载并显式标注我们用到的表面，避免 tsc 对整个 CJS 文件做类型推断。
const nodeRequire = createRequire(import.meta.url);
const logic = nodeRequire("../../cloud/sync/logic.js") as {
  validateEnvelope(value: unknown): string | null;
  WRITER_PATTERN: RegExp;
  UID_PATTERN: RegExp;
  ENVELOPE_VERSION_CURRENT: number;
  ENVELOPE_VERSION_V1: number;
};

/**
 * 行为级跨端一致性：同一份信封，客户端 `isValidEnvelope` 与服务端 `validateEnvelope`
 * 必须给出**相同**的接受/拒绝结论。
 *
 * 之前只有「比对常量文本」的断言，于是客户端漏掉 writer 正则、updatedAt 上界、
 * kdf 闭集这三条规则时，测试照样全绿——而线上表现为「客户端写出、服务端 400」。
 * 这里直接跑两边的实现，不再依赖常量同名。
 */

const b64 = (bytes: number, fill: number) =>
  Buffer.from(new Uint8Array(bytes).fill(fill)).toString("base64");

const now = Date.now();

function v2(over: Record<string, unknown> = {}) {
  return {
    v: 2,
    alg: "AES-GCM-256",
    kdf: { alg: "PBKDF2-SHA256", iter: 100000, salt: b64(32, 1) },
    wrapped: { iv: b64(12, 2), ct: b64(48, 3) },
    iv: b64(12, 4),
    ct: b64(64, 5),
    updatedAt: now,
    itemCount: 1,
    writer: "0123456789abcdef",
    ...over,
  };
}

function v1(over: Record<string, unknown> = {}) {
  const { wrapped: _omit, ...rest } = v2();
  return { ...rest, v: 1, ...over };
}

const cases: Array<[string, unknown, boolean]> = [
  ["合法 v2", v2(), true],
  ["合法 v1（无 wrapped 键）", v1(), true],
  ["未知版本 v3", v2({ v: 3 }), false],
  ["信封多一个字段", v2({ extra: 1 }), false],
  [
    "v2 缺 wrapped",
    (() => {
      const { wrapped: _w, ...r } = v2();
      return r;
    })(),
    false,
  ],
  ["writer 不是 16 位 hex", v2({ writer: "device-1" }), false],
  ["writer 大写 hex", v2({ writer: "0123456789ABCDEF" }), false],
  ["updatedAt 在未来 11 分钟", v2({ updatedAt: now + 11 * 60_000 }), false],
  ["updatedAt 在未来 1 小时", v2({ updatedAt: now + 3_600_000 }), false],
  ["updatedAt 为 0", v2({ updatedAt: 0 }), false],
  [
    "kdf 多一个键",
    v2({
      kdf: { alg: "PBKDF2-SHA256", iter: 100000, salt: b64(32, 1), extra: 1 },
    }),
    false,
  ],
  [
    "kdf.iter 低于下限",
    v2({ kdf: { alg: "PBKDF2-SHA256", iter: 99999, salt: b64(32, 1) } }),
    false,
  ],
  [
    "kdf.alg 不是约定值",
    v2({ kdf: { alg: "scrypt", iter: 100000, salt: b64(32, 1) } }),
    false,
  ],
  [
    "salt 长度不对",
    v2({ kdf: { alg: "PBKDF2-SHA256", iter: 100000, salt: b64(16, 1) } }),
    false,
  ],
  ["iv 长度不对", v2({ iv: b64(8, 4) }), false],
  ["ct 短于 GCM tag", v2({ ct: b64(8, 5) }), false],
  [
    "wrapped.ct 过短",
    v2({ wrapped: { iv: b64(12, 2), ct: b64(16, 3) } }),
    false,
  ],
  [
    "wrapped 多一个字段",
    v2({ wrapped: { iv: b64(12, 2), ct: b64(48, 3), x: 1 } }),
    false,
  ],
  ["alg 不是 AES-GCM-256", v2({ alg: "AES-CBC" }), false],
  ["itemCount 为负", v2({ itemCount: -1 }), false],
  ["完全是字符串", "not-an-object", false],
  ["null", null, false],
];

describe("客户端与服务端的信封校验必须一致", () => {
  for (const [label, envelope, expected] of cases) {
    it(label, () => {
      const clientSays = SyncCrypto.isValidEnvelope(envelope);
      const serverSays = logic.validateEnvelope(envelope) === null;
      expect(clientSays).toBe(expected);
      expect(serverSays).toBe(expected);
      expect(clientSays).toBe(serverSays);
    });
  }

  it("两边的版本号语义不再相反", () => {
    expect(logic.ENVELOPE_VERSION_CURRENT).toBe(2);
    expect(logic.ENVELOPE_VERSION_V1).toBe(1);
  });

  it("两边的 writer 与 uid 形态取自同一正则源", () => {
    expect(logic.WRITER_PATTERN.source).toBe(/^[0-9a-f]{16}$/.source);
    expect(logic.UID_PATTERN.source).toBe(/^[0-9a-f]{8,32}$/.source);
  });
});
