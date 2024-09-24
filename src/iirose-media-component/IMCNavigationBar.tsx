import { Component } from 'preact';

interface IMCNavigationBarProps
{
    switchPlatforms: (index: number) => void;
    ShowOrHideIMC: () => void;
}

interface IMCNavigationBarState
{
    activeButtonIndex: number;
}

export class IMCNavigationBar extends Component<IMCNavigationBarProps, IMCNavigationBarState>
{
    constructor(props: IMCNavigationBarProps)
    {
        super(props);
        this.state = {
            activeButtonIndex: 0, // 默认活动按钮索引
        }
    }

    back = () =>
    {
        const { ShowOrHideIMC } = this.props
        ShowOrHideIMC()
    }

    handlePlatformChange = (index: number) =>
    {
        this.props.switchPlatforms(index);
        this.setState({ activeButtonIndex: index }); // 更新活动按钮索引
    }

    render()
    {
        const { activeButtonIndex } = this.state;

        return (
            <div className='IIroseMainNavigationBar'>

                <div className='LeftComponent'>
                    <div className='NavBarButton NavBarButtonActive' id='BackButton' onClick={this.back}>
                        <div className='NavBarButtonIcon' id='BackIcon'>
                        </div>
                    </div>

                    <div className='NavBarTitle' id='NavBarTitle'>
                        <div className='NavBarButtonIcon' id='TitleIcon'>
                        </div>
                        <div className='NavBarButtonText'> IIROSE - MEDIA </div>
                    </div>
                </div>

                <div className='RightComponent'>
                    <div
                        className={`NavBarButton ${activeButtonIndex === 1 ? 'NavBarButtonActive' : ''}`}
                        id=''
                        onClick={() => this.handlePlatformChange(1)}
                    >
                        <div className='NavBarButtonIcon' id='MusicIcon'>
                        </div>
                        <div className='NavBarButtonText'> 音乐 </div>
                    </div>

                    <div
                        className={`NavBarButton ${activeButtonIndex === 0 ? 'NavBarButtonActive' : ''}`}
                        id=''
                        onClick={() => this.handlePlatformChange(0)}
                    >
                        <div className='NavBarButtonIcon' id='VideoIcon'>
                        </div>
                        <div className='NavBarButtonText'> 视频 </div>
                    </div>

                    <div
                        className={`NavBarButton ${activeButtonIndex === 2 ? 'NavBarButtonActive' : ''}`}
                        id=''
                        onClick={() => this.handlePlatformChange(2)}
                    >
                        <div className='NavBarButtonIcon' id='SettingIcon'>
                        </div>
                        <div className='NavBarButtonText'> 设置 </div>
                    </div>

                    <div
                        className={`NavBarButton ${activeButtonIndex === 3 ? 'NavBarButtonActive' : ''}`}
                        id=''
                        onClick={() => this.handlePlatformChange(3)}
                    >
                        <div className='NavBarButtonIcon mdi-information-outline' id=''>
                        </div>
                        <div className='NavBarButtonText'> 关于 </div>
                    </div>

                </div>

            </div>
        );
    }
}
