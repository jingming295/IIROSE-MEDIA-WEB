import { GDStudioOnlineMusicPlatformAPI } from "../Api/GD-Studio's-Online-Music-Platform-API";
import {
  playbackFailure,
  type PlaybackFailure,
} from "../Api/GD-Studio's-Online-Music-Platform-API/playback";
import { ShowMessage } from "../iirose_func/ShowMessage";
import { Socket } from "../iirose_func/Socket";
import { Announce } from "../iirose_func/Socket/Announce";
import { Media } from "../iirose_func/Socket/Media";
import { NetEaseSettings } from "../settings/neteaseSettings/NetEaseSettings";
import { ParseMediaMetaData } from "../tools/parseMediaMetaData";
import { Platform } from "./Platform";

interface JOOXSearchResult {
  title: string;
  subtitle: string;
  coverImg: string;
  author: string;
  websiteUrl: string;
  joox: {
    id: string;
    isSong: boolean;
  };
}

export class JOOXPlatform extends Platform {
  public static searchSongs = async (keyword: string, page: number) => {
    const platformData: JOOXSearchResult[] = [];
    const allPlatformData: JOOXSearchResult[] = [];
    const searchData = await GDStudioOnlineMusicPlatformAPI.search(
      "joox",
      keyword,
      page,
    );

    if (!searchData)
      return { platformData: [], totalPage: 0, allPlatformData: [] };

    let count = 0;

    for (const item of searchData) {
      const data = {
        title: item.name,
        subtitle: item.album,
        coverImg: `https://image.joox.com/JOOXcover/0/${item.pic_id}/1000`,
        author: item.artist.map((artist) => artist).join(", "),
        websiteUrl: `https://www.joox.com/my-zh_cn/single/${item.id}`,
        joox: {
          id: item.id,
          isSong: true,
        },
      };
      if (count >= this.itemPerPage) {
        allPlatformData.push(data);
      } else {
        allPlatformData.push(data);
        platformData.push(data);
      }
      count++;
    }
    const totalPage = Math.ceil(allPlatformData.length / 10);
    return { platformData, totalPage, allPlatformData };
  };

  private static inFlight = new Map<string, Promise<void>>();

  public static MOD = (platformData: PlatformData): Promise<void> => {
    const item = platformData as unknown as JOOXSearchResult;
    if (!item.joox?.id) {
      ShowMessage.show("缺少目标音源曲目数据");
      return Promise.resolve();
    }
    // 当前唯一作用域：固定匿名聚合通道。未来会话/地区支持需扩展此键。
    const key = `aggregate:${item.joox.id}`;
    const pending = this.inFlight.get(key);
    if (pending) return pending;
    const operation = this.finalODSONG(item).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, operation);
    return operation;
  };

  private static showFailure(failure: PlaybackFailure) {
    const messages = {
      empty_url: "未取得播放链接，请稍后重试",
      rate_limited: `解析通道请求过于频繁，请在 ${Math.ceil((failure.retryAfterMs ?? 60000) / 1000)} 秒后重试`,
      auth_required: "目标音源需要有效授权",
      region_restricted: "目标音源暂不支持当前地区",
      preview_only: "目标音源仅提供试听，未提交点播",
      rights_restricted: "目标音源暂不允许播放此曲目",
      transport_error: "解析通道连接失败，请稍后重试",
      timeout: "点播准备超时，请稍后重试",
      invalid_response: "解析通道返回异常，请稍后重试",
      media_unavailable: "音频暂时无法加载，未提交点播",
      channel_unavailable: "暂无可用解析通道，请稍后重试",
    };
    ShowMessage.show(messages[failure.kind]);
  }

  private static finalODSONG = async (item: JOOXSearchResult) => {
    const controller = new AbortController();
    const deadline = Date.now() + 20000;
    const timer = setTimeout(() => controller.abort(), 20000);
    const expired = () => controller.signal.aborted || Date.now() >= deadline;
    let lyric = "";
    try {
      const checked = new Set<string>();
      let failure = playbackFailure("media_unavailable");
      // 主解析失败即结束；只有媒体检查失败才允许刷新一次。
      for (let attempt = 0; attempt < 2 && !expired(); attempt++) {
        const result = await GDStudioOnlineMusicPlatformAPI.resolvePlayback(
          item.joox.id,
          controller.signal,
        );
        if (expired()) break;
        if (!result.ok) {
          failure = result;
          break;
        }
        // 只有取得候选才并行取歌词，冷却和主失败不会继续请求通道。
        // 仅消费提交前已完成的结果；失败或挂起使用空歌词。
        if (attempt === 0) {
          void GDStudioOnlineMusicPlatformAPI.getLyric("joox", item.joox.id, {
            signal: controller.signal,
            warn: false,
          })
            .then((data) => {
              if (!expired())
                lyric = this.mergeLyrics(data?.lyric || "", data?.tlyric || "");
            })
            .catch(() => {});
        }
        for (const url of result.urls) {
          if (checked.has(url) || checked.size >= 2 || expired()) continue;
          checked.add(url);
          const duration = await ParseMediaMetaData.getAudioDuration(url, {
            signal: controller.signal,
            timeoutMs: Math.min(10000, deadline - Date.now()),
          });
          if (expired()) break;
          if (!Number.isFinite(duration) || duration <= 0) continue;
          if (
            result.expectedDurationSeconds !== undefined &&
            Math.abs(duration - result.expectedDurationSeconds) >
              Math.max(5, result.expectedDurationSeconds * 0.03)
          )
            continue;
          const mediaData: MediaData = {
            type: "music",
            name: item.title,
            singer: item.author,
            cover: item.coverImg,
            link: item.websiteUrl,
            url,
            duration,
            bitRate: result.bitrateKbps ?? "",
            color: this.baseHex,
            lyrics: lyric,
            origin: "qqmusic",
          };
          const media = new Media();
          const socket = new Socket();
          const card = media.mediaCard(mediaData);
          const event = media.mediaEvent(mediaData);
          if (!event) break;
          await Announce.runSingleAnnounce(() => {
            if (expired()) return;
            Announce.sendMediaCard(socket, card);
            socket.send(event);
          });
          return;
        }
        if (checked.size >= 2) break;
      }
      this.showFailure(expired() ? playbackFailure("timeout") : failure);
    } catch {
      this.showFailure(
        playbackFailure(expired() ? "timeout" : "media_unavailable"),
      );
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  };

  /**
   * @description 合并歌词
   * @param jpLyrics
   * @param cnLyrics
   * @returns
   */
  private static mergeLyrics = (jpLyrics: string, cnLyrics: string): string => {
    const lyricOption = NetEaseSettings.getNeteaseMusicSetting().lyricOption;

    if (lyricOption === "off") return "";

    if (lyricOption === "original") return jpLyrics;

    if (lyricOption === "translated") return cnLyrics;

    const jpLines = jpLyrics.split("\n");
    const cnLines = cnLyrics.split("\n");

    const jpEntries: { [key: string]: string } = {};
    const cnEntries: { [key: string]: string } = {};

    // Parse Japanese lyrics
    for (const line of jpLines) {
      const timeRegex = /\[(\d+:\d+\.\d+)\]/;
      const timeMatch = line.match(timeRegex);
      if (timeMatch) {
        const time = timeMatch[1];
        const content = line.replace(timeRegex, "").trim();
        jpEntries[time] = content;
      }
    }

    // Parse Chinese lyrics
    for (const line of cnLines) {
      const timeRegex = /\[(\d+:\d+\.\d+)\]/;
      const timeMatch = line.match(timeRegex);
      if (timeMatch) {
        const time = timeMatch[1];
        const content = line.replace(timeRegex, "").trim();
        cnEntries[time] = content;
      }
    }

    // Merge and format
    const mergedLines: {
      time: string;
      content: string;
      translation: string;
    }[] = [];
    for (const time in jpEntries) {
      const jpContent = jpEntries[time];
      const cnContent = cnEntries[time] || ""; // Use empty string if no translation

      mergedLines.push({ time, content: jpContent, translation: cnContent });
    }

    // Format the merged lines
    const mergedOutput = mergedLines
      .map((line) => {
        const { time, content, translation } = line;
        let outputLine = `[${time}] ${content}`;
        if (translation) {
          outputLine += ` | ${translation}`;
        }
        return outputLine;
      })
      .join("\n");

    return mergedOutput;
  };
}
