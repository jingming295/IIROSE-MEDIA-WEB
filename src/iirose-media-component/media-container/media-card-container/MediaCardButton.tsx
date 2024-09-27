import { Component, ContextType } from 'preact';
import { PlatformData } from "../../../platforms/interfaces";
import { MediaContainerContext } from "../media-container-context/MediaContainerContext";


interface MediaContainerProps
{
    platformData: PlatformData;
}

interface State
{
    isMultipage?: boolean;
    isMultiAction?: boolean;
}

export class MediaCardButton extends Component<MediaContainerProps>
{
    static contextType = MediaContainerContext
    declare context: ContextType<typeof MediaContainerContext>;
    state: State = {}

    // 点播播放的处理函数
    private demandPlay = async () =>
    {
        const { platformData } = this.props;
        const { switchToMultiPage, currentOnDemandPlay, updateCurrentInMultiPageStatus, ShowOrHideIMC } = this.context;

        const multipagePromise = platformData.multiPage;
        if (multipagePromise)
        {
            const multipage = await multipagePromise;
            if (multipage)
            {
                await updateCurrentInMultiPageStatus(true)
                switchToMultiPage(platformData, this.state.isMultipage);
            } else
            {
                ShowOrHideIMC()
                currentOnDemandPlay(platformData);
            }
        } else
        {
            ShowOrHideIMC()
            currentOnDemandPlay(platformData);
        }
    }

    private confirmMultiPageAction = async () =>
    {
        const { platformData } = this.props;
        const { switchToMultiPage, updateCurrentInMultiPageStatus } = this.context;
        await updateCurrentInMultiPageStatus(true)
        switchToMultiPage(platformData, this.state.isMultiAction);
    }

    render()
    {
        const { isMultipage } = this.state;
        const { platformData } = this.props;
        const isMultiAction = platformData.multiAction;
        const contextState = this.context;
        return (
            <div className="MediaCardButtonsWrapper">
                <div
                    className="MediaCardButtonContainer"
                    style={{ color: contextState.color }}
                    onClick={this.demandPlay}
                >
                    {isMultipage ? (
                        <div className="MediaCardPickButtonIcon"></div>
                    ) : (
                        <div className="MediaCardPlayButtonIcon"></div>
                    )}
                    <div className="MediaCardPlayButtonText">
                        {isMultipage ? '选集' : '播放'}
                    </div>
                </div>

                {
                    isMultiAction && (
                        <div
                            className="MediaCardButtonContainer"
                            style={{ color: contextState.color, borderLeft: '1px solid rgba(0, 0, 0, 0.1)' }}
                            onClick={this.confirmMultiPageAction}
                        >
                            <div className="MediaCardPickButtonIcon"></div>
                            <div className="MediaCardPlayButtonText">选歌</div>
                        </div>
                    )
                }
            </div>

        );
    }

    componentDidMount(): void
    {
        const { platformData } = this.props;
        const multipage = platformData.multiPage;
        if (multipage)
        {
            multipage.then((value) =>
            {
                this.setState({ isMultipage: value });
            });
        } else if (platformData.multiAction)
        {
            this.setState({ isMultiAction: true });
        }
    }

    componentDidUpdate(prevProps: Readonly<MediaContainerProps>): void
    {
        if (this.props.platformData !== prevProps.platformData)
        {
            this.setState({ isMultipage: undefined });
            const { platformData } = this.props;
            const multipage = platformData.multiPage;
            if (multipage)
            {
                multipage.then((value) =>
                {
                    this.setState({ isMultipage: value });
                });
            }
        }
    }
}
