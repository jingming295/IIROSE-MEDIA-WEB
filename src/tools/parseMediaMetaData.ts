export class ParseMediaMetaData {
  /**
   * 前端版：获取 m3u8 总时长
   */
  public static async getM3U8Duration(url: string): Promise<number> {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return 0;

      const text = await response.text();

      // 1. 判断是否是二级嵌套索引 (Master Playlist)
      if (text.includes("#EXT-X-STREAM-INF")) {
        const lines = text.split("\n");
        let subUrl = "";
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(".m3u8")) {
            subUrl = lines[i].trim();
            break;
          }
        }

        if (subUrl) {
          // 拼接绝对路径
          const fullSubUrl = subUrl.startsWith("http")
            ? subUrl
            : new URL(subUrl, url).href;
          return await this.getM3U8Duration(fullSubUrl);
        }
      }

      // 2. 累加时长
      return this.processM3U8Text(text);
    } catch (e) {
      console.error("解析m3u8时长失败", e);
      return 0;
    }
  }

  private static processM3U8Text(text: string): number {
    let total = 0;
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.startsWith("#EXTINF:")) {
        // 处理类似 #EXTINF:10.000, 或 #EXTINF:9.082
        const durationPart = line.substring(8).split(",")[0];
        const d = parseFloat(durationPart);
        if (!isNaN(d)) total += d;
      }
    }
    return total;
  }

  /**
   * 前端版：获取普通音频文件 (MP3/OGG/WAV) 的时长
   */
  public static getAudioDuration = (
    url: string,
    options: { signal?: AbortSignal; timeoutMs?: number } = {},
  ): Promise<number> => {
    if (options.signal?.aborted) return Promise.resolve(0);
    return new Promise((resolve) => {
      const audio = new Audio();
      let settled = false;
      const finish = (duration: number) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", abort);
        audio.onloadedmetadata = null;
        audio.onerror = null;
        audio.removeAttribute("src");
        audio.load();
        resolve(Number.isFinite(duration) && duration > 0 ? duration : 0);
      };
      const abort = () => finish(0);
      const timer = setTimeout(abort, Math.max(0, options.timeoutMs ?? 10000));
      options.signal?.addEventListener("abort", abort, { once: true });
      audio.onloadedmetadata = () => finish(audio.duration);
      audio.onerror = abort;
      audio.muted = true;
      audio.preload = "metadata";
      audio.src = url;
    });
  };

  /**
   * 前端版：获取普通视频文件 (MP4/WebM) 的时长
   */
  public static getVideoDuration = (url: string): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.muted = true;
      video.preload = "metadata";
      video.src = url;

      video.onloadedmetadata = () => {
        const duration = video.duration;
        video.src = "";
        video.load();
        resolve(isNaN(duration) ? 0 : duration);
      };

      video.onerror = () => {
        console.error("解析视频时长失败", url);
        resolve(0);
      };

      setTimeout(() => resolve(0), 10000);
    });
  };
}
