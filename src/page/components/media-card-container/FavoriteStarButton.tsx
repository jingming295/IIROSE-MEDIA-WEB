import { Component } from "preact";
import { FavoritesStorageService } from "../../../storage/FavoritesStorageService";
import { ShowMessage } from "../../../iirose_func/ShowMessage";

interface FavoriteStarButtonProps {
  platformData: PlatformData;
  variant?: "floating" | "inline";
  onToggle?: (isFavorited: boolean) => void;
}

interface FavoriteStarButtonState {
  isFavorited: boolean;
}

export class FavoriteStarButton extends Component<
  FavoriteStarButtonProps,
  FavoriteStarButtonState
> {
  constructor(props: FavoriteStarButtonProps) {
    super(props);
    this.state = {
      isFavorited: FavoritesStorageService.isFavorited(props.platformData),
    };
  }

  async componentDidMount() {
    await FavoritesStorageService.init();
    this.checkFavoriteStatus();
  }

  componentDidUpdate(prevProps: Readonly<FavoriteStarButtonProps>) {
    if (prevProps.platformData !== this.props.platformData) {
      this.checkFavoriteStatus();
    }
  }

  private checkFavoriteStatus = () => {
    const isFavorited = FavoritesStorageService.isFavorited(
      this.props.platformData,
    );
    if (isFavorited !== this.state.isFavorited) {
      this.setState({ isFavorited });
    }
  };

  private handleClick = async (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const { platformData, onToggle } = this.props;
    const nextState = !this.state.isFavorited;

    // 乐观 UI 更新
    this.setState({ isFavorited: nextState });

    try {
      const res = await FavoritesStorageService.toggle(platformData);
      if (res.isFavorited !== nextState) {
        this.setState({ isFavorited: res.isFavorited });
      }

      // 宿站友好轻提示
      ShowMessage.show(res.isFavorited ? "★ 已添加到收藏" : "☆ 已取消收藏");

      if (onToggle) {
        onToggle(res.isFavorited);
      }
    } catch (err) {
      console.error("[FavoriteStarButton] 切换收藏失败:", err);
      // 出错回滚
      this.setState({ isFavorited: !nextState });
    }
  };

  render() {
    const { variant = "floating", platformData } = this.props;
    if (!FavoritesStorageService.deriveFavoriteId(platformData)) {
      return null;
    }

    const { isFavorited } = this.state;

    const iconClass = isFavorited ? "starSolidIcon" : "starOutlineIcon";
    const starColor = isFavorited ? "#fbc02d" : undefined;

    if (variant === "inline") {
      return (
        <div
          className="flex items-center justify-center w-[56px] max-[768px]:w-[40px] h-[72px] max-[768px]:h-[56px] rounded-xl overflow-hidden bg-[rgba(0,0,0,0.08)] shrink-0 cursor-pointer transition-all duration-100! hov:hover:bg-[rgba(0,0,0,0.14)] active:scale-95"
          onClick={this.handleClick}
          title={isFavorited ? "已收藏，点击取消" : "点击添加到收藏"}
        >
          <div
            className={`${iconClass} font-['md'] text-[24px] max-[768px]:text-[20px] transition-all duration-100!`}
            style={{ color: starColor || "rgba(0,0,0,0.5)" }}
          ></div>
        </div>
      );
    }

    // Floating 悬浮按钮（卡片右上角）
    return (
      <div
        className="absolute top-2 right-2 z-10 w-[36px] h-[36px] max-[768px]:w-[32px] max-[768px]:h-[32px] rounded-full bg-black/45 backdrop-blur-[6px] flex items-center justify-center cursor-pointer active:scale-90 transition-all duration-150 shadow-md hover:bg-black/60"
        onClick={this.handleClick}
        title={isFavorited ? "已收藏，点击取消" : "点击添加到收藏"}
      >
        <div
          className={`${iconClass} font-['md'] text-[22px] max-[768px]:text-[18px] transition-all duration-150`}
          style={{ color: starColor || "rgba(255,255,255,0.85)" }}
        ></div>
      </div>
    );
  }
}
