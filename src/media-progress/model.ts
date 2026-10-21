export interface MediaSnapshot {
  instance: number;
  title: string;
  cover: string;
  current: number | null;
  duration: number | null;
  playing: boolean;
  connected: boolean;
  seekVersion: number;
  dark: boolean;
}

export function finiteTime(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const time = Number(value);
  return Number.isFinite(time) && time >= 0 ? time : null;
}

export function formatTime(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) return "--:--";
  const seconds = Math.floor(value);
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
    : `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function seekCommand(
  current: number,
  target: number,
  duration: number,
): string | null {
  if (
    ![current, target, duration].every(Number.isFinite) ||
    current < 0 ||
    duration <= 0
  )
    return null;
  const delta = Math.round(clamp(target, 0, duration) - current);
  if (!delta || !Number.isSafeInteger(delta)) return null;
  const amount = Math.abs(delta);
  return `!15${JSON.stringify([
    delta > 0 ? ">" : "<",
    amount % 60 === 0 ? `${amount / 60}m` : `${amount}s`,
  ])}`;
}

export function isSeekCommand(command: string): boolean {
  // 仅接受已确认的独立控制协议，不接受聊天文本或其他宿站指令。
  if (typeof command !== "string") return false;
  const match = /^!15\["[<>]","([1-9]\d*)[sm]"\]$/.exec(command);
  return (
    !!match && match[0] === command && Number.isSafeInteger(Number(match[1]))
  );
}

export function unavailableReason(media: MediaSnapshot): string {
  if (!media.connected) return "连接已断开，暂时无法调整";
  if (!media.playing) return "暂无播放内容";
  if (media.current === null || media.duration === null || media.duration <= 0)
    return "直播或时间未知，无法调整进度";
  return "";
}

export function coverUrl(value: string): string {
  try {
    const url = new URL(value.replace(/^http:\/\//i, "https://"));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

export function constrainPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  return {
    x: clamp(x, 12, Math.max(12, viewportWidth - width - 12)),
    y: clamp(y, 12, Math.max(12, viewportHeight - height - 12)),
  };
}
