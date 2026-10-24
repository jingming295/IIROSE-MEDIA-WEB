import { MediaSnapshot } from "../media-progress/model";

export type PlaybackModeKind = "loop" | "shuffle";
export type PlaybackModeName = "none" | PlaybackModeKind;

export interface PlaybackModeAvailability {
  enabled: boolean;
  reason: string;
}

export interface PlaybackModeState {
  mode: PlaybackModeName;
  loop: PlaybackModeAvailability;
  shuffle: PlaybackModeAvailability;
}

// 文案取自 sidebar-controls.md 的禁用原因表。
const MEDIA_UNAVAILABLE = "直播或时间未知，无法使用";
const DISCONNECTED = "连接已断开，暂时无法调整";

function available(): PlaybackModeAvailability {
  return { enabled: true, reason: "" };
}

// 开关状态只存内存：互斥单选、不可用即熄灭、刷新即失。
export class PlaybackMode {
  private current: PlaybackModeName = "none";
  private base = available();
  private extras: Record<PlaybackModeKind, PlaybackModeAvailability> = {
    loop: available(),
    shuffle: available(),
  };
  private listeners = new Set<(state: PlaybackModeState) => void>();
  private signature: string;

  constructor() {
    this.signature = this.signatureOf(this.state);
  }

  get mode(): PlaybackModeName {
    return this.current;
  }

  get state(): PlaybackModeState {
    return {
      mode: this.current,
      loop: { ...this.availability("loop") },
      shuffle: { ...this.availability("shuffle") },
    };
  }

  // 连接与媒体是更根本的原因，优先于单个模式自身的可用性。
  private availability(kind: PlaybackModeKind): PlaybackModeAvailability {
    return this.base.enabled ? this.extras[kind] : this.base;
  }

  toggle(kind: PlaybackModeKind): boolean {
    if (!this.availability(kind).enabled) return false;
    return this.setMode(this.current === kind ? "none" : kind);
  }

  applySnapshot(snapshot: MediaSnapshot): void {
    const timed = snapshot.duration !== null && snapshot.duration > 0;
    this.base = !snapshot.connected
      ? { enabled: false, reason: DISCONNECTED }
      : timed
        ? available()
        : { enabled: false, reason: MEDIA_UNAVAILABLE };
    this.settle();
    this.publish();
  }

  setAvailability(
    kind: PlaybackModeKind,
    value: PlaybackModeAvailability,
  ): void {
    this.extras[kind] = { enabled: value.enabled, reason: value.reason || "" };
    this.settle();
    this.publish();
  }

  subscribe(listener: (state: PlaybackModeState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    this.listeners.clear();
  }

  private setMode(next: PlaybackModeName): boolean {
    if (this.current === next) return false;
    this.current = next;
    this.publish();
    return next !== "none";
  }

  // 不可用即清零点亮态；恢复可用不自动重新点亮。
  private settle(): void {
    if (this.current !== "none" && !this.availability(this.current).enabled)
      this.current = "none";
  }

  private publish(): void {
    const state = this.state;
    const signature = this.signatureOf(state);
    if (signature === this.signature) return;
    this.signature = signature;
    for (const listener of [...this.listeners]) listener(state);
  }

  private signatureOf(state: PlaybackModeState): string {
    return [
      state.mode,
      state.loop.enabled,
      state.loop.reason,
      state.shuffle.enabled,
      state.shuffle.reason,
    ].join("\u0000");
  }
}
