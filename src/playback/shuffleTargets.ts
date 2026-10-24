// 收藏随机的候选读取与「收藏记录 → 可播目标」解析。
// 从组合根挪出来：装配层只接线，平台/接口细节留在播放域内。
import type { FavoriteRecord } from "../storage/FavoritesStorageService";
import { FavoritesStorageService } from "../storage/FavoritesStorageService";
import { NetEasePlatform } from "../platforms/NetEasePlatform";
import { BilibiliPlatform } from "../platforms/BilibiliPlatform";
import { NeteaseMusicAPI } from "../Api/NeteaseAPI/NeteaseMusic";
import type { ShuffleTarget } from "./ShuffleController";

/** 按平台读收藏；关闭「专辑/歌单参与随机」时只留单曲与视频。 */
export function queryShuffleCandidates(
  platform: "netease" | "bilibili",
  includeCollections: boolean,
): Promise<FavoriteRecord[]> {
  return FavoritesStorageService.query({ platform }).then((records) =>
    includeCollections
      ? records
      : records.filter(
          (record) => record.type === "song" || record.type === "video",
        ),
  );
}

function httpsCover(value: string): string {
  return (value || "").replace(/^http:\/\//, "https://");
}

/**
 * 收藏记录 → 可播目标；专辑/歌单只取其中随机一首（与手动点播的整张播放区分）。
 * 解析失败返回 null，由控制器换下一个候选。
 */
export async function prepareShuffleTarget(
  record: FavoriteRecord,
): Promise<ShuffleTarget | null> {
  if (record.type === "song" || record.type === "video") {
    const data = FavoritesStorageService.restorePlatformData(record);
    return {
      title: record.title,
      play: () =>
        record.platform === "bilibili"
          ? // 自动随机不能停下来等选集：多分 P 直接播第一集。
            BilibiliPlatform.VOD(data, 1)
          : NetEasePlatform.MOD(data),
    };
  }
  const id = record.platformData.neteaseMusic?.id;
  if (record.platform !== "netease" || !id) return null;
  let trackId: number | null = null;
  let title = "";
  let cover = record.coverImg;
  let author = record.author;
  if (record.type === "album") {
    const detail = await NeteaseMusicAPI.getAlbumDetail(id);
    const songs = detail?.songs ?? [];
    if (!songs.length) return null;
    const pick = songs[Math.floor(Math.random() * songs.length)];
    trackId = pick.id;
    title = pick.name;
    cover = pick.al?.picUrl || cover;
    author = pick.ar?.[0]?.name || author;
  } else {
    const list = await NeteaseMusicAPI.getSongListDetail(id);
    const ids = list?.playlist.trackIds ?? [];
    if (!ids.length) return null;
    trackId = ids[Math.floor(Math.random() * ids.length)].id;
    const detail = await NeteaseMusicAPI.getNeteaseSongDetail([trackId]);
    const song = detail?.[0];
    if (!song) return null;
    title = song.name;
    cover = song.album?.picUrl || cover;
    author = song.artists?.[0]?.name || author;
  }
  const data = {
    title,
    coverImg: httpsCover(cover),
    author,
    websiteUrl: `https://music.163.com/#/song?id=${trackId}`,
    neteaseMusic: { id: trackId, fee: 0 },
  };
  return { title, play: () => NetEasePlatform.MOD(data) };
}
