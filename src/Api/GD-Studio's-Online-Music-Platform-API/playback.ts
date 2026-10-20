export type FailureKind =
  | "empty_url"
  | "rate_limited"
  | "auth_required"
  | "region_restricted"
  | "preview_only"
  | "rights_restricted"
  | "transport_error"
  | "timeout"
  | "invalid_response"
  | "media_unavailable"
  | "channel_unavailable";

export type PlaybackFailure = {
  ok: false;
  channel: "aggregate";
  kind: FailureKind;
  httpStatus?: number;
  upstreamCode?: number;
  retryAfterMs?: number;
};

export type Resolution =
  | {
      ok: true;
      trackId: string;
      channel: "aggregate";
      urls: string[];
      preview: false | "unknown";
      expectedDurationSeconds?: number;
      bitrateKbps?: number;
    }
  | PlaybackFailure;

export const playbackFailure = (kind: FailureKind): PlaybackFailure => ({
  ok: false,
  channel: "aggregate",
  kind,
});

export function normalizePlayback(data: unknown, trackId: string): Resolution {
  if (!data || typeof data !== "object" || Array.isArray(data))
    return playbackFailure("invalid_response");
  const value = data as Record<string, unknown>;
  const code = value.code;
  if (code !== undefined && code !== 0 && code !== 200) {
    return {
      ...playbackFailure(code === 429 ? "rate_limited" : "invalid_response"),
      ...(typeof code === "number" ? { upstreamCode: code } : {}),
    };
  }
  const preview = value.node_is_preview;
  if (
    preview === true ||
    preview === 1 ||
    preview === "1" ||
    preview === "true"
  )
    return playbackFailure("preview_only");
  if (
    preview !== undefined &&
    preview !== false &&
    preview !== 0 &&
    preview !== "0" &&
    preview !== "false"
  )
    return playbackFailure("invalid_response");
  if (
    (value.url === undefined ||
      value.url === null ||
      value.url === "" ||
      (typeof value.url === "string" && !value.url.trim())) &&
    typeof value.refrain_url === "string" &&
    value.refrain_url.trim()
  )
    return playbackFailure("preview_only");
  if (typeof value.url !== "string") return playbackFailure("invalid_response");
  const url = value.url.trim();
  if (!url) return playbackFailure("empty_url");
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password)
      return playbackFailure("invalid_response");
  } catch {
    return playbackFailure("invalid_response");
  }
  return {
    ok: true,
    trackId,
    channel: "aggregate",
    urls: [url],
    preview: preview === undefined ? "unknown" : false,
    ...(typeof value.br === "number" &&
    Number.isFinite(value.br) &&
    value.br > 0
      ? { bitrateKbps: value.br }
      : {}),
    // 聚合响应的 duration 不是独立完整时长证据，不能作为完整版基准。
  };
}

function retryAfterMs(header: string | null): number {
  if (header?.trim()) {
    if (/^\d+(\.\d+)?$/.test(header.trim())) {
      const ms = Number(header) * 1000;
      if (Number.isFinite(ms)) return ms;
    } else if (
      // HTTP-date 的三种格式；限制形状，避免 Date.parse 把负数当日期。
      /^(?:[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT|[A-Za-z]+, \d{2}-[A-Za-z]{3}-\d{2} \d{2}:\d{2}:\d{2} GMT|[A-Za-z]{3} [A-Za-z]{3} (?: \d|\d{2}) \d{2}:\d{2}:\d{2} \d{4})$/.test(
        header.trim(),
      )
    ) {
      // asctime 没有显式时区，但 HTTP-date 始终使用 GMT。
      const date = Date.parse(
        header.trim().endsWith("GMT") ? header : `${header.trim()} GMT`,
      );
      if (Number.isFinite(date)) return Math.max(0, date - Date.now());
    }
  }
  return 60000;
}

// 第一阶段只有固定匿名聚合上下文，跨曲共享同一出口的通道冷却。
let cooldownUntil = 0;

export async function resolveAggregatePlayback(
  trackId: string,
  request: (signal: AbortSignal) => Promise<Response | null>,
  signal?: AbortSignal,
): Promise<Resolution> {
  if (signal?.aborted) return playbackFailure("timeout");
  const remaining = cooldownUntil - Date.now();
  if (remaining > 0)
    return { ...playbackFailure("rate_limited"), retryAfterMs: remaining };

  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 6000);
  let onAbort: () => void = () => {};
  const cancelled = new Promise<Resolution>((resolve) => {
    onAbort = () => resolve(playbackFailure("timeout"));
    controller.signal.addEventListener("abort", onAbort, { once: true });
  });
  const resolveResponse = async (): Promise<Resolution> => {
    try {
      const response = await request(controller.signal);
      if (controller.signal.aborted) return playbackFailure("timeout");
      if (!response) return playbackFailure("transport_error");
      let result: Resolution;
      if (response.status === 429) result = playbackFailure("rate_limited");
      else if (!response.ok) result = playbackFailure("transport_error");
      else {
        try {
          result = normalizePlayback(await response.json(), trackId);
        } catch {
          result = playbackFailure("invalid_response");
        }
      }
      if (controller.signal.aborted) return playbackFailure("timeout");
      if (!result.ok) {
        result.httpStatus = response.status;
        if (result.kind === "rate_limited") {
          const now = Date.now();
          cooldownUntil = Math.max(
            cooldownUntil,
            now + retryAfterMs(response.headers.get("Retry-After")),
          );
          result.retryAfterMs = cooldownUntil - now;
        }
      }
      return result;
    } catch {
      return playbackFailure(
        controller.signal.aborted ? "timeout" : "transport_error",
      );
    }
  };
  try {
    return await Promise.race([resolveResponse(), cancelled]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    controller.signal.removeEventListener("abort", onAbort);
  }
}
