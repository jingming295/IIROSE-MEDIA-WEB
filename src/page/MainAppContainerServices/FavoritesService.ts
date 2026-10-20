import { FavoritesStorageService } from "../../storage/FavoritesStorageService";
import { NetEasePlatform } from "../../platforms/NetEasePlatform";
import { BilibiliPlatform } from "../../platforms/BilibiliPlatform";

export class FavoritesService {
  /** 最近一次收藏查询条件：云端拉取落地后按同一条件刷新已渲染的列表 */
  private static lastQuery: {
    platform: "netease" | "bilibili";
    type: "all" | "song" | "album" | "playlist" | "video";
    itemsPerPage: number;
  } | null = null;

  /** 用最近一次的条件重新加载收藏列表（供「外部变更」通知使用） */
  public static async reloadLastQuery(
    ctx: MainAppContainerActionContext,
    attempt: number = 0,
  ): Promise<void> {
    const last = this.lastQuery;
    if (!last) return;
    if (ctx.getState().isCurrentInMultiPage) {
      // 正在看选集/多集：现在刷新会覆盖当前列表，顺延一次再来（有上限，不无限轮询）
      if (attempt < 10) {
        window.setTimeout(
          () => void this.reloadLastQuery(ctx, attempt + 1),
          1000,
        );
      }
      return;
    }
    await this.loadFavorites(ctx, last.platform, last.type, last.itemsPerPage);
  }

  /**
   * 通用收藏加载器：连接 IndexedDB、分页与同构点播分发
   */
  public static async loadFavorites(
    ctx: MainAppContainerActionContext,
    platform: "netease" | "bilibili",
    type: "all" | "song" | "album" | "playlist" | "video",
    itemsPerPage: number = 10,
  ) {
    const {
      searchKeyword,
      favoritesSearchKeyword,
      favoritesMode,
      currentPage,
      requestToken,
      isCurrentInMultiPage,
    } = ctx.getState();

    // 若当前处于选集/多集状态，阻断外层收藏查询，防止覆盖正在查看的选集列表
    if (isCurrentInMultiPage) {
      return;
    }

    this.lastQuery = { platform, type, itemsPerPage };

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
