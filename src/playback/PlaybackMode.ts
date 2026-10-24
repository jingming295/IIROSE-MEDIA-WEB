import type { MediaSnapshot } from "../media-progress/model";

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

// 文案取自 sidebar-controls.md 的不可用原因表。
const MEDIA_UNAVAILABLE = "直播或时间未知，无法使用";
const DISCONNECTED = "连接未就绪或已断开，暂时无法调整";

const available = (): PlaybackModeAvailability => ({
  enabled: true,
  reason: "",
});

// 开关状态只存内存：互斥单选、不可用即熄灭、刷新即失。
export class PlaybackMode {
  private current: PlaybackModeName = "none";
  private present = true;
  private connected = true;
  // 未收到任何快照前按「时长未知」处理：不承诺可用。
  private duration: number | null = null;
  private extras: Record<PlaybackModeKind, PlaybackModeAvailability> = {
    loop: available(),
    shuffle: available(),
  };
  private listeners = new Set<(state: PlaybackModeState) => void>();
  private disposed = false;
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

  // 派生顺序：媒体不存在 → 连接未就绪/断开 → 时长未知 → 单个模式自身原因。
  // 前三种是更根本的原因，优先于模式自身（如收藏为空）。
  private availability(kind: PlaybackModeKind): PlaybackModeAvailability {
    if (!this.present) return { enabled: false, reason: MEDIA_UNAVAILABLE };
    if (!this.connected) return { enabled: false, reason: DISCONNECTED };
    if (this.duration === null || this.duration <= 0)
      return { enabled: false, reason: MEDIA_UNAVAILABLE };
    return this.extras[kind];
  }

  // 不可用或无变化时静默拒绝；调用方不需要返回值（关闭与拒绝语义不同，不可混用布尔）。
  toggle(kind: PlaybackModeKind): void {
    if (this.disposed || !this.availability(kind).enabled) return;
    this.current = this.current === kind ? "none" : kind;
    this.publish();
  }

  // 媒体存在性来自侧栏 DOM（#shareMediaBox），快照里的时长无法代替它。
  setMediaPresent(present: boolean): void {
    if (this.disposed) return;
    this.present = present;
    this.settle();
    this.publish();
  }

  applySnapshot(snapshot: MediaSnapshot): void {
    if (this.disposed) return;
    this.connected = snapshot.connected;
    this.duration = snapshot.duration;
    this.settle();
    this.publish();
  }

  setAvailability(
    kind: PlaybackModeKind,
    value: PlaybackModeAvailability,
  ): void {
    if (this.disposed) return;
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
    this.disposed = true;
    this.listeners.clear();
  }

  // 不可用即清零点亮态；恢复可用也不自动重新点亮。
  private settle(): void {
    if (this.current !== "none" && !this.availability(this.current).enabled)
      this.current = "none";
  }

  // 按状态签名去重：250ms 轮询同一快照不重复渲染。
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
