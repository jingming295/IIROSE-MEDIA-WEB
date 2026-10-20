import { Component } from "preact";

interface MainNavigationBarProps {
  switchCategories: (index: number) => void;
  ShowHideMainApp: () => void;
  activeButtonIndex: number;
}

interface MainNavigationBarState {}

export class MainNavigationBar extends Component<
  MainNavigationBarProps,
  MainNavigationBarState
> {
  constructor(props: MainNavigationBarProps) {
    super(props);
  }

  quitFromMainApp = () => {
    const { ShowHideMainApp } = this.props;
    ShowHideMainApp();
  };

  handleSwitchPage = (index: number) => {
    this.props.switchCategories(index);
    this.setState({ activeButtonIndex: index }); // 更新活动按钮索引
  };

  // NavBarButton：px-[20px] flex items-center cursor-pointer text-2xl 文字白 半透明底 悬停变淡
  // 移动端（≤768px）：隐藏文字，44px 触控区紧密相连无间距，纯图标高密度
  private navButtonClass = (active: boolean) =>
    `min-w-[40px] min-h-[40px] max-[768px]:min-w-[44px] max-[768px]:min-h-[44px] max-[768px]:w-[44px] max-[768px]:h-[44px] px-[20px] max-[768px]:px-0 flex items-center justify-center cursor-pointer text-white text-2xl transition-all duration-100! hov:hover:opacity-70 [&>div]:transition-transform [&>div]:duration-100 active:[&>div]:scale-95 ${active ? "bg-[#00000080]" : "bg-[#fff3]"}`;

  render() {
    const { activeButtonIndex } = this.props;

    return (
      <div className="flex min-h-[40px] max-[768px]:min-h-[44px] justify-between">
        <div className="flex">
          <div
            className={this.navButtonClass(true)}
            id="BackButton"
            title="返回"
            onClick={this.quitFromMainApp}
          >
            <div
              className="text-2xl pl-[10px] mr-[20px] cursor-pointer max-[768px]:p-0 max-[768px]:mr-0 max-[768px]:text-[24px]"
              id="BackIcon"
            ></div>
          </div>

          <div
            className="px-[20px] max-[768px]:hidden flex items-center cursor-auto text-base bg-white/20 text-white transition-opacity duration-300"
            id="NavBarTitle"
          >
            <div
              className="text-2xl pl-[10px] mr-[20px] cursor-pointer"
              id="TitleIcon"
            ></div>
            <div className="text-sm transition-all duration-500 max-[768px]:hidden whitespace-nowrap">
              {" "}
              IIROSE - MEDIA{" "}
            </div>
          </div>
        </div>

        <div className="flex">
          <div
            className={this.navButtonClass(activeButtonIndex === 0)}
            id=""
            title="音乐"
            onClick={() => this.handleSwitchPage(0)}
          >
            <div
              className="text-2xl pl-[10px] mr-[20px] cursor-pointer max-[768px]:p-0 max-[768px]:mr-0 max-[768px]:text-[24px]"
              id="MusicIcon"
            ></div>
            <div className="text-sm transition-all duration-500 max-[768px]:hidden whitespace-nowrap">
              {" "}
              音乐{" "}
            </div>
          </div>

          <div
            className={this.navButtonClass(activeButtonIndex === 1)}
            id=""
            title="视频"
            onClick={() => this.handleSwitchPage(1)}
          >
            <div
              className="text-2xl pl-[10px] mr-[20px] cursor-pointer max-[768px]:p-0 max-[768px]:mr-0 max-[768px]:text-[24px]"
              id="VideoIcon"
            ></div>
            <div className="text-sm transition-all duration-500 max-[768px]:hidden whitespace-nowrap">
              {" "}
              视频{" "}
            </div>
          </div>

          <div
            className={this.navButtonClass(activeButtonIndex === 2)}
            id=""
            title="设置"
            onClick={() => this.handleSwitchPage(2)}
          >
            <div
              className="text-2xl pl-[10px] mr-[20px] cursor-pointer max-[768px]:p-0 max-[768px]:mr-0 max-[768px]:text-[24px]"
              id="SettingIcon"
            ></div>
            <div className="text-sm transition-all duration-500 max-[768px]:hidden whitespace-nowrap">
              {" "}
              设置{" "}
            </div>
          </div>

          <div
            className={this.navButtonClass(activeButtonIndex === 3)}
            id=""
            title="关于"
            onClick={() => this.handleSwitchPage(3)}
          >
            <div
              className="text-2xl pl-[10px] mr-[20px] cursor-pointer max-[768px]:p-0 max-[768px]:mr-0 max-[768px]:text-[24px]"
              id="AboutIcon"
            ></div>
            <div className="text-sm transition-all duration-500 max-[768px]:hidden whitespace-nowrap">
              {" "}
              关于{" "}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
