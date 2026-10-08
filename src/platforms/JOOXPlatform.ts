import { GDStudioOnlineMusicPlatformAPI } from "../Api/GD-Studio's-Online-Music-Platform-API";
import { ShowMessage } from "../iirose_func/ShowMessage";
import { Socket } from "../iirose_func/Socket";
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

  public static MOD = async (platformData: PlatformData) => {
    const jooxdata: JOOXSearchResult =
      platformData as unknown as JOOXSearchResult;

    try {
      if (!platformData.joox) throw new Error("没有JOOX音乐数据");
      this.finalODSONG([jooxdata]);
    } catch (error) {
      ShowMessage.show((error as Error).message);
    }
  };

  private static finalODSONG = async (JOOXSearch: JOOXSearchResult[]) => {
    const media = new Media();
    const socket = new Socket();

    for (const item of JOOXSearch) {
      let playUrlData = await GDStudioOnlineMusicPlatformAPI.getMusicUrl(
        "joox",
        item.joox.id,
      );

      // GD Studio API 限流时返回 HTTP 200 + 空 url（{"url":"","br":-1}），隔 1.5s 重试一次
      if (!playUrlData?.url) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        playUrlData = await GDStudioOnlineMusicPlatformAPI.getMusicUrl(
          "joox",
          item.joox.id,
        );
      }

      if (!playUrlData?.url) {
        ShowMessage.show(
          `《${item.title}》获取播放链接失败：GD Studio API 可能已限流（按 IP 计），请稍后再试`,
        );
        continue;
      }

      const lyricData = await GDStudioOnlineMusicPlatformAPI.getLyric(
        "joox",
        item.joox.id,
      );
      const lyric = this.mergeLyrics(
        lyricData?.lyric || "",
        lyricData?.tlyric || "",
      );
      let duration = await ParseMediaMetaData.getAudioDuration(playUrlData.url);

      // 时长解析失败可能是 vkey 瞬时失效：重新取一次新链接再试
      if (!duration) {
        const fresh = await GDStudioOnlineMusicPlatformAPI.getMusicUrl(
          "joox",
          item.joox.id,
        );
        if (fresh?.url) {
          playUrlData = fresh;
          duration = await ParseMediaMetaData.getAudioDuration(fresh.url);
        }
      }

      const mediaData: MediaData = {
        type: "music",
        name: item.title,
        singer: item.author,
        cover: item.coverImg,
        link: item.websiteUrl,
        url: playUrlData.url,
        duration: duration,
        bitRate: 320,
        color: this.baseHex,
        lyrics: lyric,
        origin: "qqmusic",
      };
      const mediacard = media.mediaCard(mediaData);
      const mediaEvent = media.mediaEvent(mediaData);

      socket.send(mediacard);
      socket.send(mediaEvent);
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
