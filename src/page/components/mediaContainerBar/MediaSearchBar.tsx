import { Component } from "preact";
import { IIROSEUtils } from "../../../iirose_func/IIROSEUtils";

interface MediaSearchBarProps {
  searchKeyword: string | null; // 用于显示在搜索栏的keyword
  currentPage: number; // 当前页面
  totalPage: number; // 总页面
  isCurrentInMultiPage: boolean;
  viewMode: "card" | "list"; // 当前搜索结果视图
  favoritesMode?: boolean; // 是否激活收藏模式
  mediaSearchBarActions: MediaSearchBarActions;
}

interface MediaSearchBarActions {
  changeSearchKeyword: (keyword: string | null) => void;
  changecurrentPage: (page: number) => void;
  switchToOutFromMultiPage: () => void;
  toggleSearchViewMode: () => void;
  toggleFavoritesMode?: () => void;
}

export class MediaSearchBar extends Component<MediaSearchBarProps> {
  public searchInput() {
    const changeSearchKeyWord =
      this.props.mediaSearchBarActions.changeSearchKeyword;
    const title = this.props.favoritesMode ? "过滤收藏" : "搜索";
    const currentVal = this.props.searchKeyword || "";
    IIROSEUtils.sync(2, [title, currentVal, 100], changeSearchKeyWord);
  }

  public async nextPage(currentPage: number, totalPage: number) {
    const { changecurrentPage } = this.props.mediaSearchBarActions;
    if (currentPage < totalPage) {
      await changecurrentPage(currentPage + 1);
    }
  }

  public async prevPage(currentPage: number) {
    const { changecurrentPage } = this.props.mediaSearchBarActions;
    if (currentPage > 1) {
      await changecurrentPage(currentPage - 1);
    }
  }

  render() {
    const {
      searchKeyword,
      currentPage,
      totalPage,
      isCurrentInMultiPage,
      viewMode,
      mediaSearchBarActions,
    } = this.props;
    let pages = "-/-";
    if (totalPage) {
      pages = `${currentPage}/${totalPage}`;
    }

    return (
      <div className="flex items-center min-h-[36px] max-[768px]:min-h-[48px] max-[768px]:px-2 animate-[fadeIn_.25s_ease-out]">
        {/* 1. 卡片/列表 视图切换 */}
        <div
          className="flex items-center justify-center text-white cursor-pointer px-[20px] max-[768px]:w-[44px] max-[768px]:h-[44px] max-[768px]:min-w-[44px] max-[768px]:p-0 h-full transition-all duration-100! hov:hover:opacity-70 active:scale-95 bg-[#fff3] rounded-full ml-3 max-[768px]:ml-0 mr-1.5 shrink-0"
          title={`当前:${viewMode === "card" ? "卡片" : "列表"},点击切换`}
          onClick={mediaSearchBarActions.toggleSearchViewMode}
        >
          <div
            className={`${viewMode === "card" ? "cardViewIcon" : "listViewIcon"} text-2xl max-[768px]:text-[22px]`}
          ></div>
          <div className="font-bold ml-[22px] max-[768px]:hidden whitespace-nowrap">
            {viewMode === "card" ? "卡片" : "列表"}
          </div>
        </div>

        {/* 2. ⭐ 收藏模式 点亮/点暗 双态切换 */}
        <div
          className={`flex items-center justify-center cursor-pointer px-[20px] max-[768px]:w-[44px] max-[768px]:h-[44px] max-[768px]:min-w-[44px] max-[768px]:p-0 h-full transition-all duration-100! hov:hover:opacity-70 active:scale-95 rounded-full mr-auto shrink-0 ${
            this.props.favoritesMode
              ? "bg-[#00000080] text-[#fbc02d] shadow-[0_0_8px_rgba(251,192,45,0.3)]"
              : "bg-[#fff3] text-white"
          }`}
          title={
            this.props.favoritesMode
              ? "当前:已点亮收藏模式，点击切回全网发现"
              : "当前:全网发现模式，点击点亮收藏模式"
          }
          onClick={mediaSearchBarActions.toggleFavoritesMode}
        >
          <div
            className={`${
              this.props.favoritesMode ? "starSolidIcon text-[#fbc02d]" : "starOutlineIcon text-white"
            } text-2xl max-[768px]:text-[22px]`}
          ></div>
          <div className="font-bold ml-[22px] max-[768px]:hidden whitespace-nowrap">
            {this.props.favoritesMode ? "已藏" : "全网"}
          </div>
        </div>

        {/* 3. 🔍 搜索框 */}
        {!isCurrentInMultiPage && (
          <div
            className="flex items-center text-white cursor-pointer h-full max-[768px]:h-[44px] max-[768px]:px-2.5 max-[768px]:bg-[#fff2] max-[768px]:rounded-full transition-all duration-100! max-w-[460px] max-[768px]:max-w-[120px] max-[400px]:max-w-[70px] max-[768px]:mr-1 hov:hover:opacity-70 active:scale-95 shrink min-w-0"
            onClick={() => this.searchInput()}
            title={
              searchKeyword ||
              (this.props.favoritesMode ? "点击过滤收藏" : "点击搜索")
            }
          >
            <div className="inputIcon text-2xl max-[768px]:text-[22px] mr-[22px] max-[768px]:mr-1 shrink-0"></div>
            <div className="font-bold text-sm overflow-hidden text-ellipsis whitespace-nowrap max-[768px]:max-w-[70px]">
              {searchKeyword || (this.props.favoritesMode ? "过滤收藏" : "")}
            </div>
          </div>
        )}

        <div className="flex items-center h-full shrink-0">
          <div className="flex items-center text-white cursor-pointer h-full transition-all duration-100! mx-[24px] max-[768px]:mx-1.5 hov:hover:opacity-70 shrink-0">
            <div className="paginationIcon text-2xl max-[768px]:text-[18px]"></div>
            <div className="ml-[22px] max-[768px]:ml-1 text-sm max-[768px]:text-xs whitespace-nowrap">{pages}</div>
          </div>

          <div className="flex items-center h-full max-[768px]:gap-1.5 shrink-0">
            {isCurrentInMultiPage && (
              <div
                className="flex items-center justify-center text-white cursor-pointer px-[20px] max-[768px]:w-[48px] max-[768px]:h-[44px] max-[768px]:min-w-[48px] max-[768px]:p-0 transition-all duration-100! h-full hov:hover:opacity-70 active:scale-95 bg-[#00000080] rounded-full max-[768px]:rounded-lg"
                title="返回"
                onClick={mediaSearchBarActions.switchToOutFromMultiPage}
              >
                <div className="returnIcon text-2xl max-[768px]:text-[22px]"></div>
                <div className="font-bold ml-[22px] max-[768px]:hidden whitespace-nowrap">
                  返回
                </div>
              </div>
            )}

            <div
              className="flex items-center justify-center text-white cursor-pointer px-[20px] max-[768px]:w-[48px] max-[768px]:h-[44px] max-[768px]:min-w-[48px] max-[768px]:p-0 transition-all duration-100! h-full hov:hover:opacity-70 active:scale-95 bg-[#fff3] rounded-full max-[768px]:rounded-lg"
              title="上一页"
              onClick={() => {
                this.prevPage(currentPage);
              }}
            >
              <div className="prevIcon text-2xl max-[768px]:text-[22px]"></div>
              <div className="font-bold ml-[22px] max-[768px]:hidden whitespace-nowrap">
                上一页
              </div>
            </div>

            <div
              className="flex items-center justify-center text-white cursor-pointer px-[20px] max-[768px]:w-[48px] max-[768px]:h-[44px] max-[768px]:min-w-[48px] max-[768px]:p-0 transition-all duration-100! h-full hov:hover:opacity-70 active:scale-95 bg-[#00000080] rounded-full max-[768px]:rounded-lg"
              title="下一页"
              onClick={() => {
                this.nextPage(currentPage, totalPage);
              }}
            >
              <div className="nextIcon text-2xl max-[768px]:text-[22px]"></div>
              <div className="font-bold ml-[22px] max-[768px]:hidden whitespace-nowrap">
                下一页
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
