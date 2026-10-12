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
      <div className="flex px-[20px] max-[768px]:px-2 items-center overflow-x-auto no-scrollbar animate-[fadeIn_.25s_ease-out,expandHeight_.25s_ease-in-out]">
        {!isCurrentInMultiPage &&
          platform.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                className={`flex items-center shrink-0 h-10 max-[768px]:h-10 backdrop-blur-[8px] transition-all duration-100! animate-[fadeIn_.25s_ease-out] hov:hover:bg-[rgba(255,255,255,0.3)] ${
                  isActive
                    ? "bg-[rgba(255,255,255,0.85)] shadow-[0_2px_10px_rgba(0,0,0,0.18)]"
                    : "bg-white/20"
                }`}
                key={index}
              >
                <div
                  className={`flex items-center justify-center cursor-pointer h-full px-[10px] max-[768px]:px-3 max-[768px]:h-[40px] transition-all duration-100! hov:hover:opacity-70 active:scale-95 ${isActive ? "text-[#2f2f2f]" : "text-white"}`}
                  title={item.title}
                  onClick={() => {
                    this.handleSwitchPlatform(index);
                  }}
                >
                  <img className="w-8 h-8 max-[768px]:w-[26px] max-[768px]:h-[26px] rounded-sm object-cover shrink-0" src={item.iconsrc} alt={item.title}></img>
                  <div className="mx-[10px] max-[768px]:mx-1.5 max-[768px]:text-[13px] whitespace-nowrap">{item.title}</div>
                </div>
              </div>
            );
          })}
      </div>
    );
  }
}
