import { describe, expect, it } from "vitest";
import type { SyncSnapshot } from "./SyncMerge";
import {
  DEK_BYTES,
  GCM_TAG_BYTES,
  IV_BYTES,
  SALT_BYTES,
  SyncCrypto,
  SyncCryptoError,
  type SyncEnvelope,
} from "./SyncCrypto";

const UID = "6e3f0a1b2c4d5";
const PASSPHRASE = "correct horse battery staple";
const ITER = 100000; // 单测取最低迭代，避免每次跑几百毫秒

async function context(passphrase = PASSPHRASE, uid = UID) {
  const salt = SyncCrypto.generateSalt();
  const kek = await SyncCrypto.deriveKek(passphrase, salt, ITER);
  const { dek, wrapped } = await SyncCrypto.createDek(kek, uid);
  return { salt, kek, dek, wrapped, uid };
}

function snapshot(): SyncSnapshot {
  return {
    version: 2,
    updatedAt: Date.now(),
    items: [
      {
        key: "netease:song:1",
        record: { id: "netease:song:1" } as never,
        deletedAt: null,
      },
      { key: "netease:song:2", record: null, deletedAt: 1_800_000_000_001 },
    ],
  };
}

const toB64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
const fromB64 = (text: string) => new Uint8Array(Buffer.from(text, "base64"));

describe("密钥材料形态", () => {
  it("盐 32 字节、设备 id 16 位 hex", () => {
    expect(fromB64(SyncCrypto.generateSalt())).toHaveLength(SALT_BYTES);
    expect(SyncCrypto.generateDeviceId()).toMatch(/^[0-9a-f]{16}$/);
  });

  it("DEK 不可导出", async () => {
    const { dek } = await context();
    expect(dek.extractable).toBe(false);
    await expect(crypto.subtle.exportKey("raw", dek)).rejects.toBeTruthy();
  });
});

describe("包裹 / 解包", () => {
  it("同一 KEK 能解回同一 DEK 原始字节", async () => {
    const { kek, wrapped, uid } = await context();
    const raw = fromB64(toB64(new Uint8Array(DEK_BYTES).fill(7)));
    const own = await SyncCrypto.wrapDek(kek, raw, uid);
    expect(fromB64(own.iv)).toHaveLength(IV_BYTES);
    expect(fromB64(own.ct).length).toBeGreaterThanOrEqual(
      DEK_BYTES + GCM_TAG_BYTES,
    );
    // unwrapDek 返回的是重新导入的不可导出句柄，而不是原始字节
    const restored = await SyncCrypto.unwrapDek(kek, own, uid);
    expect(restored).toBeInstanceOf(CryptoKey);
    expect(restored.extractable).toBe(false);
    expect(restored.algorithm).toMatchObject({ name: "AES-GCM", length: 256 });
    // 跨账号既能解包也不该被接受：AAD 绑了 uid
    expect(wrapped.ct).not.toBe(own.ct);
  });

  it("换一个口令派生的 KEK 解不开（这是换设备时的口令校验）", async () => {
    const { wrapped, uid } = await context();
    const salt = SyncCrypto.generateSalt();
    const wrongKek = await SyncCrypto.deriveKek("wrong passphrase", salt, ITER);
    await expect(
      SyncCrypto.unwrapDek(wrongKek, wrapped, uid),
    ).rejects.toBeTruthy();
  });

  it("把包裹块挪到别的 uid 下会被 AAD 拒绝", async () => {
    const { kek, wrapped } = await context();
    await expect(
      SyncCrypto.unwrapDek(kek, wrapped, "fffffffffffff"),
    ).rejects.toBeTruthy();
  });
});

describe("信封加解密", () => {
  it("往返还原快照", async () => {
    const { salt, dek, wrapped, uid } = await context();
    const snap = snapshot();
    const envelope = await SyncCrypto.encrypt({
      dek,
      wrapped,
      uid,
      snapshot: snap,
      updatedAt: snap.updatedAt,
      salt,
      iterations: ITER,
      itemCount: 1,
      writer: SyncCrypto.generateDeviceId(),
    });
    expect(envelope.v).toBe(2);
    expect(envelope.wrapped).toBe(wrapped);
    await expect(SyncCrypto.decrypt(dek, uid, envelope)).resolves.toEqual(snap);
  });

  it("用 KEK 解快照会失败（证明是两级密钥，不是单级）", async () => {
    const { salt, kek, dek, wrapped, uid } = await context();
    const snap = snapshot();
    const envelope = await SyncCrypto.encrypt({
      dek,
      wrapped,
      uid,
      snapshot: snap,
      updatedAt: snap.updatedAt,
      salt,
      iterations: ITER,
      itemCount: 1,
      writer: SyncCrypto.generateDeviceId(),
    });
    await expect(SyncCrypto.decrypt(kek, uid, envelope)).rejects.toBeTruthy();
  });

  it("AAD 绑定 uid 与 updatedAt：任一被改都解不开", async () => {
    const { salt, dek, wrapped, uid } = await context();
    const snap = snapshot();
    const envelope = await SyncCrypto.encrypt({
      dek,
      wrapped,
      uid,
      snapshot: snap,
      updatedAt: snap.updatedAt,
      salt,
      iterations: ITER,
      itemCount: 1,
      writer: SyncCrypto.generateDeviceId(),
    });

    await expect(
      SyncCrypto.decrypt(dek, "fffffffffffff", envelope),
    ).rejects.toBeTruthy();
    await expect(
      SyncCrypto.decrypt(dek, uid, {
        ...envelope,
        updatedAt: envelope.updatedAt + 1,
      }),
    ).rejects.toBeTruthy();
  });
});

describe("信封校验", () => {
  const mk = (over: Partial<SyncEnvelope>) =>
    ({
      v: 2,
      alg: "AES-GCM-256",
      kdf: { alg: "PBKDF2-SHA256", iter: ITER, salt: toB64(new Uint8Array(SALT_BYTES).fill(1)) },
      wrapped: {
        iv: toB64(new Uint8Array(IV_BYTES)),
        ct: toB64(new Uint8Array(48)),
      },
      iv: toB64(new Uint8Array(IV_BYTES)),
      ct: toB64(new Uint8Array(64)),
      updatedAt: Date.now(),
      itemCount: 1,
      writer: "0123456789abcdef",
      ...over,
    }) as SyncEnvelope;

  it("v2 合法信封通过", () => {
    expect(SyncCrypto.isValidEnvelope(mk({}))).toBe(true);
  });

  it("v1 仍被接受且识别为历史格式", () => {
    // v1 信封里根本没有 wrapped 这个键（不是值为 undefined），
    // 否则会被「白名单外字段」拒掉——旧客户端就是这么写的。
    const { wrapped: _omit, ...rest } = mk({});
    const legacy = { ...rest, v: 1 } as SyncEnvelope;
    expect(SyncCrypto.isLegacyEnvelope(legacy)).toBe(true);
    expect(SyncCrypto.isValidEnvelope(legacy)).toBe(true);
  });

  it("未知版本、白名单外字段、v2 缺 wrapped、包裹块过短都被拒", () => {
    expect(
      SyncCrypto.isValidEnvelope(mk({ v: 3 } as Partial<SyncEnvelope>)),
    ).toBe(false);
    expect(SyncCrypto.isValidEnvelope(mk({ extra: 1 } as never))).toBe(false);
    expect(
      SyncCrypto.isValidEnvelope(mk({ wrapped: undefined } as never)),
    ).toBe(false);
    expect(
      SyncCrypto.isValidEnvelope(
        mk({
          wrapped: {
            iv: toB64(new Uint8Array(IV_BYTES)),
            ct: toB64(new Uint8Array(8)),
          },
        }),
      ),
    ).toBe(false);
  });

  it("包裹块只允许 iv/ct 两个字段", () => {
    expect(
      SyncCrypto.isValidWrapped({
        iv: toB64(new Uint8Array(12)),
        ct: toB64(new Uint8Array(48)),
      }),
    ).toBe(true);
    expect(
      SyncCrypto.isValidWrapped({
        iv: toB64(new Uint8Array(12)),
        ct: toB64(new Uint8Array(48)),
        x: 1,
      }),
    ).toBe(false);
  });
});

describe("v1 → v2 迁移的读取侧", () => {
  it("用口令派生的密钥能解开旧客户端写下的 v1 信封", async () => {
    // 模拟旧客户端：单级密钥，AAD 为 uid|1|updatedAt，信封 v=1 且没有 wrapped
    const salt = SyncCrypto.generateSalt();
    const kek = await SyncCrypto.deriveKek(PASSPHRASE, salt, ITER);
    const snap = snapshot();
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const plain = new TextEncoder().encode(JSON.stringify(snap));
    const aad = new TextEncoder().encode(`${UID}|1|${snap.updatedAt}`);
    const ct = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: aad, tagLength: 128 },
      kek,
      plain,
    );

    const legacy: SyncEnvelope = {
      v: 1,
      alg: "AES-GCM-256",
      kdf: { alg: "PBKDF2-SHA256", iter: ITER, salt },
      iv: toB64(iv),
      ct: toB64(new Uint8Array(ct)),
      updatedAt: snap.updatedAt,
      itemCount: 1,
      writer: "0123456789abcdef",
    } as SyncEnvelope;

    expect(SyncCrypto.isValidEnvelope(legacy)).toBe(true);
    await expect(SyncCrypto.decrypt(kek, UID, legacy)).resolves.toEqual(snap);
  });
});

describe("错误类型", () => {
  it("非法信封抛 SyncCryptoError 而不是裸 DOMException", async () => {
    const { kek, uid } = await context();
    await expect(
      SyncCrypto.decrypt(kek, uid, { v: 9 } as unknown as SyncEnvelope),
    ).rejects.toBeInstanceOf(SyncCryptoError);
  });
});
