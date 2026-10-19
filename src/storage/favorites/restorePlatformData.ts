// src/storage/favorites/restorePlatformData.ts
// 收藏记录 → 可直接驱动播放/选集的 PlatformData。
// 单独成文件是因为它要探测 B 站分 P（会出网），与纯记录工具保持距离。
import { BiliBiliVideoApi } from "../../Api/BilibiliAPI/BiliBiliVideoAPI";
import type { FavoriteRecord } from "../FavoritesStorageService";

/**
 * 将 FavoriteRecord 还原为可直接驱动播放/选集的同构 PlatformData
 */
export function restorePlatformData(record: FavoriteRecord): PlatformData {
  const base = { ...record.platformData };

  // 确保封面是 HTTPS
  const cover = (record.coverImg || "").replace(/^http:\/\//, "https://");
  base.coverImg = cover;

  // 为不同形态动态重组 multiPage Promise
  if (record.platform === "netease") {
    if (record.type === "album" || record.type === "playlist") {
      base.multiPage = Promise.resolve({ platform: "neteasemusic" });
    }
  } else if (record.platform === "bilibili") {
    base.multiPage = (async () => {
      try {
        const res = await BiliBiliVideoApi.getBilibiliPagesAndCids(
          base.bilibili?.aid || null,
          base.bilibili?.bvid || null,
        );
        if (res?.data?.length && res.data.length > 1) {
          return { platform: "bilibili" };
        }
      } catch (e) {
        console.error("[FavoritesStorage] 探测分 P 失败:", e);
      }
      return undefined;
    })();
  }

  return base;
}
