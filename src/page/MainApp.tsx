import { Component } from "preact";
import { MainNavigationBar } from "./components/navigationBar/main/MainNavigationBar";
import { MainAppContainer } from "./MainAppContainer";
import { LocalStorageUtils } from "../settings/localStorageUtils/LocalStorageUtils";
import { PluginSettings } from "../settings/pluginSettings/PluginSettings";

interface MainAppState {
  CategoriesIndex: number;
  needOutFromMultiPage: boolean;
  needOutFromSettings: boolean;
  /** 每次点状态灯自增：让 MainAppContainer 打开同步卡片 */
  syncOpenToken: number;
}

interface MainAppProps {
  ShowHideMainApp: () => Promise<void>;
  searchKeyword: string;
  changeSearchKeyword: (keyword: string | null) => void;
  mainAppDisplay: boolean;
}

export class MainApp extends Component<MainAppProps, MainAppState> {
  constructor(props: MainAppProps) {
    super(props);
    LocalStorageUtils.Init();
    this.state = {
      CategoriesIndex: PluginSettings.getPluginSetting().defaultPage,
      needOutFromMultiPage: false,
      needOutFromSettings: false,
      syncOpenToken: 0,
    };
  }

  itemsPerPage = 10;

  componentDidUpdate(
    _prevProps: Readonly<MainAppProps>,
    prevState: Readonly<MainAppState>,
  ): void {
    const { needOutFromMultiPage, CategoriesIndex } = this.state;
    if (CategoriesIndex !== prevState.CategoriesIndex) {
      this.setState({ needOutFromMultiPage: true });
    } else if (needOutFromMultiPage) {
      this.setState({ needOutFromMultiPage: false });
    }
  }

  /** 状态灯点击：切到设置并请求打开同步卡片（token 自增，避免重复点击失效） */
  private openSyncSettings = () => {
    this.setState({
      CategoriesIndex: 2,
      syncOpenToken: this.state.syncOpenToken + 1,
    });
  };

  render() {
    const { CategoriesIndex, needOutFromMultiPage, needOutFromSettings } =
      this.state;
    const { searchKeyword, mainAppDisplay, changeSearchKeyword } = this.props;
    return (
      <div className="flex flex-col w-full h-full" id="IIROSE_MEDIA">
        <MainNavigationBar
          switchCategories={this.switchCategories}
          ShowHideMainApp={this.props.ShowHideMainApp}
          activeButtonIndex={CategoriesIndex}
          openSyncSettings={this.openSyncSettings}
        />
        <MainAppContainer
          CategoriesIndex={CategoriesIndex}
          needOutFromMultiPage={needOutFromMultiPage}
          needOutFromSettings={needOutFromSettings}
          ShowOrHideIMC={this.props.ShowHideMainApp}
          searchKeyword={searchKeyword}
          changeSearchKeyword={changeSearchKeyword}
          active={mainAppDisplay}
          syncOpenToken={this.state.syncOpenToken}
        />
      </div>
    );
  }

  /**
   *
   * @param index 0: 视频 1: 音乐 2: 设置 3: 关于
   */
  protected switchCategories = async (index: number) => {
    await this.setState({ CategoriesIndex: index });
    if (index !== 2 && index !== 3) {
      this.setState({ needOutFromSettings: true });
    } else if (this.state.needOutFromSettings) {
      this.setState({ needOutFromSettings: false });
    }
  };
}
