import { HostMediaBridge } from "./HostMediaBridge";
import { clamp, MediaSnapshot, seekCommand, unavailableReason } from "./model";

export interface ProgressState {
  media: MediaSnapshot;
  preview: number | null;
  waiting: boolean;
  message: string;
}

// 将手势与发送边界集中管理，避免 pointerup / blur / keyup 重复提交。
export class ProgressSession {
  state: ProgressState;
  private gesture: { instance: number; target: number } | null = null;
  private pending: {
    instance: number;
    seekVersion: number;
    target: number;
  } | null = null;
  private timeout?: ReturnType<typeof setTimeout>;
  private unsubscribe: () => void;
  private disposed = false;

  constructor(
    private bridge: HostMediaBridge,
    private changed: (state: ProgressState) => void,
  ) {
    this.state = {
      media: bridge.read(),
      preview: null,
      waiting: false,
      message: "",
    };
    this.unsubscribe = bridge.subscribe((media) => this.receive(media));
  }

  private publish() {
    if (!this.disposed) this.changed({ ...this.state });
  }

  private receive(media: MediaSnapshot) {
    const changedMedia = this.state.media.instance !== media.instance;
    const previousUnavailable = unavailableReason(this.state.media);
    const reason = unavailableReason(media);
    this.state.media = media;
    if (changedMedia || reason) {
      const hadOperation = !!(this.gesture || this.pending);
      this.clearOperation();
      if (hadOperation || reason)
        this.state.message = changedMedia
          ? "媒体已切换，已取消上次操作"
          : reason;
    } else if (previousUnavailable && !reason) {
      this.state.message = "";
    } else if (
      this.pending &&
      media.instance === this.pending.instance &&
      media.seekVersion > this.pending.seekVersion &&
      media.current !== null &&
      Math.abs(media.current - this.pending.target) <= 2
    ) {
      // 只认定位回调后的真实时间；普通时钟推进不构成确认。
      this.clearOperation();
      this.state.message = "宿站进度已更新";
    } else if (this.pending) {
      // 不相关的定位事件只消费一次，后续自然推进到目标仍不能确认。
      this.pending.seekVersion = media.seekVersion;
    }
    this.publish();
  }

  begin(): boolean {
    const media = this.bridge.read();
    this.receive(media);
    if (this.disposed || this.pending || unavailableReason(media)) return false;
    this.gesture = { instance: media.instance, target: media.current! };
    this.state.preview = media.current;
    this.state.message = "预览中，释放或按 Enter 提交";
    this.publish();
    return true;
  }

  preview(target: number) {
    if (!this.gesture || !Number.isFinite(target)) return;
    const media = this.bridge.read();
    this.receive(media);
    if (!this.gesture || unavailableReason(media)) return;
    this.gesture.target = clamp(target, 0, media.duration!);
    this.state.preview = this.gesture.target;
    this.publish();
  }

  commit() {
    const gesture = this.gesture;
    if (!gesture || this.disposed) return;
    const media = this.bridge.read();
    this.receive(media);
    if (
      !this.gesture ||
      gesture.instance !== media.instance ||
      unavailableReason(media)
    )
      return;
    this.gesture = null;
    this.state.preview = null;
    const target = clamp(gesture.target, 0, media.duration!);
    const command = seekCommand(media.current!, target, media.duration!);
    if (!command) {
      this.state.message = "已在目标位置";
      this.publish();
      return;
    }
    this.pending = {
      instance: media.instance,
      seekVersion: media.seekVersion,
      target,
    };
    this.state.waiting = true;
    this.state.message = "等待宿站更新…";
    // 先登记等待状态，允许宿站同步触发回调。
    this.timeout = setTimeout(() => {
      this.clearOperation();
      this.state.message = "未确认调整结果，房间可能限制进度控制";
      this.publish();
    }, 2000);
    if (!this.bridge.send(command, gesture.instance)) {
      this.clearOperation();
      this.state.message = this.bridge.controlUnavailable
        ? this.bridge.controlUnavailableMessage
        : "发送失败，请检查连接、房间权限与当前媒体";
    }
    this.publish();
  }

  step(seconds: number) {
    if (!this.begin()) return;
    this.preview(this.state.media.current! + seconds);
    this.commit();
  }

  cancel() {
    if (!this.gesture) return;
    this.gesture = null;
    this.state.preview = null;
    this.state.message = "已取消预览";
    this.publish();
  }

  private clearOperation() {
    this.gesture = null;
    this.pending = null;
    clearTimeout(this.timeout);
    this.timeout = undefined;
    this.state.preview = null;
    this.state.waiting = false;
  }

  dispose() {
    this.disposed = true;
    this.clearOperation();
    this.unsubscribe();
  }
}
