import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParseMediaMetaData } from "./parseMediaMetaData";

class AudioFixture {
  static instances: AudioFixture[] = [];
  duration = 0;
  muted = false;
  preload = "";
  src = "";
  onloadedmetadata: (() => void) | null = null;
  onerror: (() => void) | null = null;
  load = vi.fn();
  removeAttribute = vi.fn(() => {
    this.src = "";
  });
  constructor() {
    AudioFixture.instances.push(this);
  }
}
beforeEach(() => {
  vi.useFakeTimers();
  AudioFixture.instances = [];
  vi.stubGlobal("Audio", AudioFixture);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function expectClean(audio: AudioFixture) {
  expect(audio.src).toBe("");
  expect(audio.onloadedmetadata).toBeNull();
  expect(audio.onerror).toBeNull();
  expect(audio.load).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
}

describe("音频探测与资源清理", () => {
  it.each([180, NaN, Infinity, 0, -1])(
    "时长 %s 只接受有限正值",
    async (duration) => {
      const result = ParseMediaMetaData.getAudioDuration(
        "https://media.example/test",
      );
      const audio = AudioFixture.instances[0];
      audio.duration = duration;
      audio.onloadedmetadata!();
      expect(await result).toBe(duration === 180 ? 180 : 0);
      expectClean(audio);
    },
  );

  it.each(["error", "timeout", "abort"])(
    "%s 清理所有资源且迟到回调无效",
    async (reason) => {
      const controller = new AbortController();
      const result = ParseMediaMetaData.getAudioDuration(
        "https://media.example/test",
        { signal: controller.signal, timeoutMs: 1234 },
      );
      const audio = AudioFixture.instances[0];
      const late = audio.onloadedmetadata!;
      if (reason === "error") audio.onerror!();
      if (reason === "abort") controller.abort();
      if (reason === "timeout") await vi.advanceTimersByTimeAsync(1234);
      expect(await result).toBe(0);
      audio.duration = 180;
      late();
      expectClean(audio);
    },
  );

  it("预取消不创建媒体元素", async () => {
    const controller = new AbortController();
    controller.abort();
    expect(
      await ParseMediaMetaData.getAudioDuration("https://media.example/test", {
        signal: controller.signal,
      }),
    ).toBe(0);
    expect(AudioFixture.instances).toHaveLength(0);
  });
});
