import { Component, ContextType } from 'preact';
import { PlatformData } from "../../../platforms/interfaces";
import { MediaContainerContext } from "../media-container-context/MediaContainerContext";


interface MediaContainerProps
{
    platformData: PlatformData;
}

interface State
{
    isMultipage: boolean | undefined;
}

export class MediaCardButton extends Component<MediaContainerProps>
{
    static contextType = MediaContainerContext
    declare context: ContextType<typeof MediaContainerContext>;
    state: State = {
        isMultipage: undefined,
    }

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

    render()
    {
        const { isMultipage } = this.state;
        const contextState = this.context;
        return (
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
