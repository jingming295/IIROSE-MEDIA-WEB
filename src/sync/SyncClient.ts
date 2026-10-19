// src/sync/SyncClient.ts
// 收藏云同步的唯一出网点：GET / PUT / DELETE + If-None-Match 短路 + 状态码归类。
//
// 注意（client-integration.md 第 7 节）：请求**直连函数 URL**，
// 不得读取 window.iirosemedia.cors——那个代理是给第三方 API 跨域用的，
// 同步端点是自有的、自带 CORS 响应头。
import { SyncCrypto, type SyncEnvelope } from "./SyncCrypto";

export type SyncErrorKind =
  | "network"
  | "conflict"
  | "tooLarge"
  | "rateLimited"
  | "unavailable"
  | "invalid"
  | "unknown";

export class SyncClientError extends Error {
  public readonly kind: SyncErrorKind;
  public readonly status: number;
  public readonly updatedAt?: number;

  constructor(
    kind: SyncErrorKind,
    message: string,
    status: number = 0,
    updatedAt?: number,
  ) {
    super(message);
    this.name = "SyncClientError";
    this.kind = kind;
    this.status = status;
    this.updatedAt = updatedAt;
  }
}

const SYNC_ERROR_MESSAGES: Record<SyncErrorKind, string> = {
  network: "网络异常，无法连接同步服务；本地收藏不受影响，请稍后重试",
  conflict: "云端收藏已被其他设备更新，正在重新合并",
  tooLarge: "云端收藏包已满 512KB，请联系铭",
  rateLimited: "操作太快，请稍后再试",
  unavailable: "同步服务暂时不可用；本地收藏不受影响，请稍后重试",
  invalid: "同步请求异常，已停止本次同步",
  unknown: "同步失败，请稍后重试",
};

/** 把任意异常翻译成可直接展示给用户的中文提示 */
export function describeSyncError(error: unknown): string {
  if (error instanceof SyncClientError) {
    return error.message || SYNC_ERROR_MESSAGES[error.kind];
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return SYNC_ERROR_MESSAGES.unknown;
}

export interface SyncRemoteState {
  /** 云端无快照或已被清空时为 null */
  envelope: SyncEnvelope | null;
  /** 下次 GET 的 If-None-Match 值（COS VersionId），由服务端回带 */
  rev: string | null;
}

export type SyncGetResult =
  { notModified: true } | ({ notModified: false } & SyncRemoteState);

export interface SyncPutResult {
  updatedAt: number;
  rev: string | null;
}

const SNAPSHOT_PATH = "/v1/favorites";

function stripEtag(value: string | null): string | null {
  if (!value) return null;
  const stripped = value.replace(/^W\//i, "").replace(/^"(.*)"$/, "$1");
  return stripped || null;
}

export class SyncClient {
  private readonly baseUrl: string;
  private readonly uid: string;

  constructor(serverUrl: string, uid: string) {
    this.baseUrl = serverUrl.replace(/\/+$/, "");
    this.uid = uid.toLowerCase();
  }

  private buildUrl(): string {
    return `${this.baseUrl}${SNAPSHOT_PATH}?uid=${encodeURIComponent(this.uid)}`;
  }

  private async request(
    init: RequestInit,
    signal?: AbortSignal,
  ): Promise<Response> {
    try {
      return await fetch(this.buildUrl(), { ...init, signal });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new SyncClientError("network", "同步已取消", 0);
      }
      throw new SyncClientError("network", SYNC_ERROR_MESSAGES.network, 0);
    }
  }

  private async failFromResponse(response: Response): Promise<never> {
    let message = "";
    try {
      const body = (await response.json()) as { message?: unknown };
      if (body && typeof body.message === "string") message = body.message;
    } catch {
      message = "";
    }

    if (response.status === 409) {
      throw new SyncClientError(
        "conflict",
        message || SYNC_ERROR_MESSAGES.conflict,
        409,
      );
    }
    if (response.status === 413) {
      throw new SyncClientError(
        "tooLarge",
        message || SYNC_ERROR_MESSAGES.tooLarge,
        413,
      );
    }
    if (response.status === 429) {
      throw new SyncClientError(
        "rateLimited",
        message || SYNC_ERROR_MESSAGES.rateLimited,
        429,
      );
    }
    if (response.status === 503) {
      throw new SyncClientError(
        "unavailable",
        message || SYNC_ERROR_MESSAGES.unavailable,
        503,
      );
    }
    if (response.status === 400) {
      throw new SyncClientError(
        "invalid",
        message || SYNC_ERROR_MESSAGES.invalid,
        400,
      );
    }
    throw new SyncClientError(
      "unknown",
      message || SYNC_ERROR_MESSAGES.unknown,
      response.status,
    );
  }

  /** 拉取云端快照；带 rev 时云端未变化会短路成 304（出网流量优化的主手段） */
  public async get(
    rev?: string | null,
    signal?: AbortSignal,
  ): Promise<SyncGetResult> {
    const headers = new Headers();
    if (rev) headers.set("If-None-Match", rev);

    const response = await this.request({ method: "GET", headers }, signal);
    if (response.status === 304) {
      return { notModified: true };
    }
    if (response.status !== 200) {
      await this.failFromResponse(response);
    }

    let payload: { snapshot?: unknown };
    try {
      payload = (await response.json()) as { snapshot?: unknown };
    } catch {
      throw new SyncClientError("invalid", SYNC_ERROR_MESSAGES.invalid, 200);
    }

    const snapshot = payload?.snapshot ?? null;
    if (snapshot === null) {
      return { notModified: false, envelope: null, rev: null };
    }
    if (!SyncCrypto.isValidEnvelope(snapshot)) {
      throw new SyncClientError(
        "invalid",
        "云端数据格式不合法，已停止同步",
        200,
      );
    }
    return {
      notModified: false,
      envelope: snapshot,
      rev: stripEtag(response.headers.get("ETag")),
    };
  }

  /** 整包覆盖式写入；服务端拒绝时间戳倒退（409） */
  public async put(
    envelope: SyncEnvelope,
    signal?: AbortSignal,
  ): Promise<SyncPutResult> {
    const headers = new Headers();
    headers.set("Content-Type", "application/json");

    const response = await this.request(
      { method: "PUT", headers, body: JSON.stringify(envelope) },
      signal,
    );
    if (response.status !== 200) {
      await this.failFromResponse(response);
    }

    let payload: { updatedAt?: unknown; rev?: unknown };
    try {
      payload = (await response.json()) as {
        updatedAt?: unknown;
        rev?: unknown;
      };
    } catch {
      throw new SyncClientError("invalid", SYNC_ERROR_MESSAGES.invalid, 200);
    }

    return {
      updatedAt:
        typeof payload.updatedAt === "number"
          ? payload.updatedAt
          : envelope.updatedAt,
      rev:
        typeof payload.rev === "string" && payload.rev
          ? payload.rev
          : stripEtag(response.headers.get("ETag")),
    };
  }

  /** 清空云端：服务端写空快照，保留版本历史 */
  public async removeCloud(signal?: AbortSignal): Promise<void> {
    const response = await this.request({ method: "DELETE" }, signal);
    if (response.status !== 200) {
      await this.failFromResponse(response);
    }
  }
}
