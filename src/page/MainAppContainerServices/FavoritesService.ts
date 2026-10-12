import { FavoritesStorageService } from "../../storage/FavoritesStorageService";
import { NetEasePlatform } from "../../platforms/NetEasePlatform";
import { JOOXPlatform } from "../../platforms/JOOXPlatform";
import { BilibiliPlatform } from "../../platforms/BilibiliPlatform";

export class FavoritesService {
  /**
   * 通用收藏加载器：连接 IndexedDB、分页与同构点播分发
   */
  public static async loadFavorites(
    ctx: MainAppContainerActionContext,
    platform: "netease" | "joox" | "bilibili",
    type: "all" | "song" | "album" | "playlist" | "video",
    itemsPerPage: number = 10,
  ) {
    const {
      searchKeyword,
      favoritesSearchKeyword,
      favoritesMode,
      currentPage,
      requestToken,
    } = ctx.getState();
    const effectiveKeyword = (
      favoritesMode ? favoritesSearchKeyword : searchKeyword
    )?.trim();

    const currentRequestToken = requestToken + 1;
    ctx.setState({ updating: true, requestToken: currentRequestToken });

    // 从 IndexedDB 中提取匹配条件的收藏记录
    const records = await FavoritesStorageService.query({
      platform,
      type: type === "all" ? undefined : type,
      keyword: effectiveKeyword || undefined,
    });

    if (ctx.getState().requestToken !== currentRequestToken) {
      return;
    }

    const allData = records.map((r) =>
      FavoritesStorageService.restorePlatformData(r),
    );
    const totalPage = Math.ceil(allData.length / itemsPerPage);
    const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPage || 1);
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    const currentPageData = allData.slice(
      startIndex,
      startIndex + itemsPerPage,
    );

    const onDemandPlay = (data: PlatformData) => {
      if (data.bilibili) {
        BilibiliPlatform.VOD(data);
      } else if (data.joox) {
        JOOXPlatform.MOD(data);
      } else if (data.neteaseMusic) {
        if (data.neteaseMusic.isAlbum) {
          NetEasePlatform.AOD(data);
        } else if (data.neteaseMusic.isSongList) {
          NetEasePlatform.MLOD(data);
        } else if (data.neteaseMusic.isMV) {
          NetEasePlatform.MVOD(data);
        } else {
          NetEasePlatform.MOD(data);
        }
      }
    };

    ctx.setState({
      updating: false,
      currentPage: safeCurrentPage,
      totalPage,
      allMediaData: allData,
      mediaData: Promise.resolve({
        platformData: currentPageData,
        totalPage,
      }),
      currentOnDemandPlay: onDemandPlay,
    });
  }
}
