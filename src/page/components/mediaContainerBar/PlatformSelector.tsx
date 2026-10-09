import { Component } from "preact";

interface PlatformSelectorProps {
  platform: Platform[];
  switchPlatform: (index: number) => void;
  isCurrentInMultiPage: boolean;
}

interface PlatformSelectorState {
  activeIndex: number; // 记录当前激活的项的索引
}

export class PlatformSelector extends Component<
  PlatformSelectorProps,
  PlatformSelectorState
> {
  constructor(props: PlatformSelectorProps) {
    super(props);
    this.state = {
      activeIndex: 0, // 初始状态，激活第一个项
    };
  }

  componentDidUpdate(prevProps: Readonly<PlatformSelectorProps>): void {
    if (prevProps.platform !== this.props.platform) {
      this.setState({ activeIndex: 0 });
      this.handleSwitchPlatform(0);
    }
  }

  handleSwitchPlatform = (index: number) => {
    const { switchPlatform } = this.props;
    this.setState({ activeIndex: index });
    switchPlatform(index);
  };

  render() {
    const { platform, isCurrentInMultiPage } = this.props;
    const { activeIndex } = this.state;
    return (
      <div className="flex px-[20px] animate-[fadeIn_.25s_ease-out,expandHeight_.25s_ease-in-out]">
        {!isCurrentInMultiPage &&
          platform.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                className={`flex items-center h-10 backdrop-blur-[8px] transition-colors duration-300 animate-[fadeIn_.25s_ease-out] hover:bg-[rgba(255,255,255,0.3)] ${
                  isActive
                    ? "bg-[rgba(255,255,255,0.85)] shadow-[0_2px_10px_rgba(0,0,0,0.18)]"
                    : "bg-white/20"
                }`}
                key={index}
              >
                <div
                  className={`flex items-center cursor-pointer h-full px-[10px] hover:opacity-70 ${isActive ? "text-[#2f2f2f]" : "text-white"}`}
                  onClick={() => {
                    this.handleSwitchPlatform(index);
                  }}
                >
                  <img className="w-8 h-8" src={item.iconsrc}></img>
                  <div className="mx-[10px]">{item.title}</div>
                </div>
              </div>
            );
          })}
      </div>
    );
  }
}
