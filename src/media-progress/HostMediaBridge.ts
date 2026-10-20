import { Socket } from "../iirose_func/Socket";
import {
  coverUrl,
  finiteTime,
  MediaSnapshot,
  unavailableReason,
} from "./model";

type HostFunction = (...args: unknown[]) => unknown;
export interface MediaHost {
  shareMediaCurrentTime?: unknown;
  shareMediaDuration?: unknown;
  shareMedia?: HostFunction;
  socket?: { readyState: number };
  theme?: unknown;
  Utils?: {
    service?: {
      isShareMediaPlaying?: () => boolean;
      seekDemandMedia?: HostFunction;
    };
  };
}

// 包装仅观察宿站已发生的行为；不主动调用播放器或定位函数。
export class HostMediaBridge {
  private instance = 0;
  private seekVersion = 0;
  private listeners = new Set<(snapshot: MediaSnapshot) => void>();
  private restorers: (() => void)[] = [];
  private timer?: ReturnType<typeof setInterval>;
  private hooked = new Map<
    string,
    { owner: object; wrapper: HostFunction; invalidate: () => void }
  >();

  constructor(
    private host: MediaHost = window as unknown as MediaHost,
    private doc: Document = document,
    private sendMessage: (command: string) => void = (command) =>
      new Socket().sendMessage(command),
  ) {}

  read(): MediaSnapshot {
    let playing = false;
    try {
      playing = this.host.Utils?.service?.isShareMediaPlaying?.() === true;
    } catch {
      /* 宿站初始化过程中暂缺节点 */
    }
    const rawDuration = finiteTime(this.host.shareMediaDuration);
    const current = finiteTime(this.host.shareMediaCurrentTime);
    return {
      instance: this.instance,
      title:
        this.doc.getElementById("shareMediaSongName")?.textContent?.trim() ||
        "未命名媒体",
      cover: coverUrl(
        this.doc
          .querySelector<HTMLImageElement>("#shareMediaAvatar img")
          ?.getAttribute("src") || "",
      ),
      current,
      duration: rawDuration && rawDuration > 0 ? rawDuration : null,
      playing,
      connected: this.host.socket?.readyState === 1,
      seekVersion: this.seekVersion,
      dark: !this.host.theme,
    };
  }

  subscribe(listener: (snapshot: MediaSnapshot) => void): () => void {
    this.listeners.add(listener);
    if (!this.timer) {
      this.installHooks();
      this.timer = setInterval(() => {
        this.installHooks();
        this.emit();
      }, 250);
    }
    listener(this.read());
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) this.stop();
    };
  }

  send(command: string, instance: number): boolean {
    const media = this.read();
    if (media.instance !== instance || unavailableReason(media)) return false;
    try {
      this.sendMessage(command);
      return true;
    } catch {
      return false;
    }
  }

  private emit() {
    const media = this.read();
    this.listeners.forEach((listener) => listener(media));
  }

  private observe(owner: object, key: string, after: () => void) {
    const target = owner as Record<string, unknown>;
    const original = target[key];
    if (typeof original !== "function") return;
    const previous = this.hooked.get(key);
    if (previous?.owner === owner && previous.wrapper === original) return;
    previous?.invalidate();
    let active = true;
    const invalidate = () => {
      active = false;
    };
    const wrapper = function (this: unknown, ...args: unknown[]) {
      const result = original.apply(this, args);
      if (active) after();
      return result;
    };
    target[key] = wrapper;
    this.hooked.set(key, { owner, wrapper, invalidate });
    this.restorers.push(() => {
      invalidate();
      // 不覆盖其他插件后来安装的钩子；嵌套旧包装仍转发，但不再通知。
      if (target[key] === wrapper) target[key] = original;
    });
  }

  private installHooks() {
    this.observe(this.host, "shareMedia", () => {
      this.instance++;
      this.emit();
    });
    const service = this.host.Utils?.service;
    if (service)
      this.observe(service, "seekDemandMedia", () => {
        this.seekVersion++;
        this.emit();
      });
  }

  private stop() {
    clearInterval(this.timer);
    this.timer = undefined;
    this.restorers.reverse().forEach((restore) => restore());
    this.restorers = [];
    this.hooked.clear();
  }

  dispose() {
    this.listeners.clear();
    this.stop();
  }
}
