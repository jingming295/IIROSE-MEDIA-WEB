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
  // 字/图标 #fff；激活态 bg #00000080，未激活 #fff3；返回按钮恒为 #00000080
  private navButtonClass = (active: boolean) =>
    `px-[20px] max-[780px]:px-[10px] flex items-center cursor-pointer text-white text-2xl transition-all duration-500 hover:opacity-70 ${active ? "bg-[#00000080]" : "bg-[#ffffff3]"}`;

  render() {
    const { activeButtonIndex } = this.props;

    return (
      <div className="flex min-h-[40px] justify-between">
        <div className="flex">
          <div
            className={this.navButtonClass(true)}
            id="BackButton"
            onClick={this.quitFromMainApp}
          >
            <div
              className="text-2xl pl-[10px] mr-[20px] cursor-pointer max-[490px]:px-[5px_20px] max-[490px]:mr-0 max-[490px]:text-[27px]"
              id="BackIcon"
            ></div>
          </div>

          <div
            className="px-[20px] max-[780px]:px-[10px] max-[780px]:hidden flex items-center cursor-auto text-base bg-white/20 text-white transition-opacity duration-300"
            id="NavBarTitle"
          >
            <div
              className="text-2xl pl-[10px] mr-[20px] cursor-pointer"
              id="TitleIcon"
            ></div>
            <div className="text-sm transition-all duration-500 max-[490px]:hidden">
              {" "}
              IIROSE - MEDIA{" "}
            </div>
          </div>
        </div>

        <div className="flex">
          <div
            className={this.navButtonClass(activeButtonIndex === 0)}
            id=""
            onClick={() => this.handleSwitchPage(0)}
          >
            <div
              className="text-2xl pl-[10px] mr-[20px] cursor-pointer max-[490px]:px-[5px_20px] max-[490px]:mr-0 max-[490px]:text-[27px]"
              id="MusicIcon"
            ></div>
            <div className="text-sm transition-all duration-500 max-[490px]:hidden">
              {" "}
              音乐{" "}
            </div>
          </div>

          <div
            className={this.navButtonClass(activeButtonIndex === 1)}
            id=""
            onClick={() => this.handleSwitchPage(1)}
          >
            <div
              className="text-2xl pl-[10px] mr-[20px] cursor-pointer max-[490px]:px-[5px_20px] max-[490px]:mr-0 max-[490px]:text-[27px]"
              id="VideoIcon"
            ></div>
            <div className="text-sm transition-all duration-500 max-[490px]:hidden">
              {" "}
              视频{" "}
            </div>
          </div>

          <div
            className={this.navButtonClass(activeButtonIndex === 2)}
            id=""
            onClick={() => this.handleSwitchPage(2)}
          >
            <div
              className="text-2xl pl-[10px] mr-[20px] cursor-pointer max-[490px]:px-[5px_20px] max-[490px]:mr-0 max-[490px]:text-[27px]"
              id="SettingIcon"
            ></div>
            <div className="text-sm transition-all duration-500 max-[490px]:hidden">
              {" "}
              设置{" "}
            </div>
          </div>

          <div
            className={this.navButtonClass(activeButtonIndex === 3)}
            id=""
            onClick={() => this.handleSwitchPage(3)}
          >
            <div
              className="text-2xl pl-[10px] mr-[20px] cursor-pointer max-[490px]:px-[5px_20px] max-[490px]:mr-0 max-[490px]:text-[27px]"
              id="AboutIcon"
            ></div>
            <div className="text-sm transition-all duration-500 max-[490px]:hidden">
              {" "}
              关于{" "}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
