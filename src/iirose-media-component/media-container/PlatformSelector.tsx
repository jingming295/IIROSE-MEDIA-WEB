import { Component } from 'preact';

import { Platform } from "../../page/MediaContainer";
interface PlatformSelectorProps
{
    platform: Platform[];
    switchPlatform: (index: number) => void;
    isCurrentInMultiPage: boolean;
}

interface PlatformSelectorState
{
    activeIndex: number; // 记录当前激活的项的索引
}

export class PlatformSelector extends Component<PlatformSelectorProps, PlatformSelectorState>
{

    constructor(props: PlatformSelectorProps)
    {
        super(props);
        this.state = {
            activeIndex: 0, // 初始状态，激活第一个项
        }
    }

    componentDidUpdate(prevProps: Readonly<PlatformSelectorProps>): void
    {

        if (prevProps.platform !== this.props.platform)
        {
            this.setState({ activeIndex: 0 });
            this.handleSwitchPlatform(0);
        }

    }

    handleSwitchPlatform = (index: number) =>
    {
        const { switchPlatform } = this.props;
        this.setState({ activeIndex: index });
        switchPlatform(index);
    }

    render()
    {
        const { platform, isCurrentInMultiPage } = this.props;
        const { activeIndex } = this.state;
        return (
            <div className="PlatformSelector" >
                {
                    !isCurrentInMultiPage &&
                    platform.map((item, index) =>
                    {
                        const isActive = index === activeIndex;
                        return (
                            <div className={`PlatformButtonWrapper ${isActive ? 'PlatformButtonWrapperActive' : ''} `} key={index}>
                                <div className="PlatformButton" onClick={() => { this.handleSwitchPlatform(index) }} >
                                    <img className="PlatformIcon" src={item.iconsrc}>
                                    </img>
                                    <div className="PlatformTitle">{item.title}</div>
                                </div>
                                {
                                    item.collectable ? <div className="goFavoriteIcon"></div> : null
                                }
                            </div>
                        );
                    })
                }
            </div>
        );
    }

}