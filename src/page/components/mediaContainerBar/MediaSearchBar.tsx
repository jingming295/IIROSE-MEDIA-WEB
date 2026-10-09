import { Component } from "preact";
import { IIROSEUtils } from "../../../iirose_func/IIROSEUtils";

interface MediaSearchBarProps {
  searchKeyword: string | null; // 用于显示在搜索栏的keyword
  currentPage: number; // 当前页面
  totalPage: number; // 总页面
  isCurrentInMultiPage: boolean;
  mediaSearchBarActions: MediaSearchBarActions;
}

interface MediaSearchBarActions {
  changeSearchKeyword: (keyword: string | null) => void;
  changecurrentPage: (page: number) => void;
  switchToOutFromMultiPage: () => void;
}

export class MediaSearchBar extends Component<MediaSearchBarProps> {
  public searchInput() {
    const changeSearchKeyWord =
      this.props.mediaSearchBarActions.changeSearchKeyword;
    IIROSEUtils.sync(2, ["搜索", "", 100], changeSearchKeyWord);
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
      mediaSearchBarActions,
    } = this.props;
    let pages = "-/-";
    if (totalPage) {
      pages = `${currentPage}/${totalPage}`;
    }

    return (
      <div className="flex items-center justify-end max-[490px]:justify-between min-h-[36px] max-[780px]:min-h-0 animate-[fadeIn_.25s_ease-out]">
        {!isCurrentInMultiPage && (
          <div
            className="flex items-center text-white cursor-pointer h-full transition-all duration-250 max-w-[460px] max-[780px]:max-w-[200px] hover:opacity-70"
            onClick={() => this.searchInput()}
          >
            <div className="inputIcon text-2xl mr-[22px] max-[490px]:ml-[20px]"></div>
            <div className="font-bold text-sm overflow-hidden text-ellipsis whitespace-pre max-[780px]:max-w-[50px]">
              {searchKeyword}
            </div>
          </div>
        )}

        <div
          className="flex items-center h-full"
          style={{
            width: isCurrentInMultiPage ? "100%" : "", // 根据 isCurrentInMultiPage 的值设置宽度
            justifyContent: isCurrentInMultiPage ? "flex-end" : "", // 根据 isCurrentInMultiPage 的值设置对齐方式
          }}
        >
          <div className="flex items-center text-white cursor-pointer h-full transition-all duration-250 mx-[24px] hover:opacity-70">
            <div className="paginationIcon text-2xl"></div>
            <div className="ml-[22px] text-sm">{pages}</div>
          </div>

          <div className="flex items-center h-full">
            {isCurrentInMultiPage && (
              <div
                className="flex items-center text-white cursor-pointer px-[20px] max-[780px]:p-[10px] max-[780px]:h-auto max-[490px]:px-[25px] transition-all duration-500 h-full hover:opacity-70 bg-[#00000080] rounded-full"
                onClick={mediaSearchBarActions.switchToOutFromMultiPage}
              >
                <div className="returnIcon text-2xl"></div>
                <div className="font-bold ml-[22px] max-[490px]:hidden">
                  返回
                </div>
              </div>
            )}

            <div
              className="flex items-center text-white cursor-pointer px-[20px] max-[780px]:p-[10px] max-[780px]:h-auto max-[490px]:px-[25px] transition-all duration-500 h-full hover:opacity-70 bg-[#ffffff3] rounded-full"
              onClick={() => {
                this.prevPage(currentPage);
              }}
            >
              <div className="prevIcon text-2xl"></div>
              <div className="font-bold ml-[22px] max-[490px]:hidden">
                上一页
              </div>
            </div>

            <div
              className="flex items-center text-white cursor-pointer px-[20px] max-[780px]:p-[10px] max-[780px]:h-auto max-[490px]:px-[25px] transition-all duration-500 h-full hover:opacity-70 bg-[#00000080] rounded-full"
              onClick={() => {
                this.nextPage(currentPage, totalPage);
              }}
            >
              <div className="nextIcon text-2xl"></div>
              <div className="font-bold ml-[22px] max-[490px]:hidden">
                下一页
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
