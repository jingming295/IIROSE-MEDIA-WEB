import { Component, ContextType } from 'preact';
import { MediaContainerContext } from "../media-container-context/MediaContainerContext";


interface MediaContainerProps
{
    platformData: PlatformData;
}

interface State
{
    multipage?: MultiPageData;
}

export class MediaCardButton extends Component<MediaContainerProps>
{
    static contextType = MediaContainerContext;
    declare context: ContextType<typeof MediaContainerContext>;

    // 初始化 state，用来记录 Promise 是否已经有了结果
    // resolved: 是否已经解析完成 (无论结果是数据还是 undefined)
    state: State & { resolved: boolean } = { resolved: false };

    private demandPlay = async () =>
    {
        const { platformData } = this.props;
        const { currentOnDemandPlay, ShowOrHideIMC } = this.context;

        // 如果定义了 multiPage 但还没解析完，拦截点击
        if (platformData.multiPage && !this.state.resolved)
        {
            return;
        }

        ShowOrHideIMC();
        currentOnDemandPlay(platformData);
    }

    private confirmMultiPageAction = async () =>
    {
        const { platformData } = this.props;
        const { switchToMultiPage, updateCurrentInMultiPageStatus } = this.context;
        await updateCurrentInMultiPageStatus(true);
        // 执行到这里肯定已经 resolved 了
        switchToMultiPage(platformData, !!this.state.multipage);
    }

    // 提取解析逻辑
    private handlePromise(promise?: Promise<MultiPageData | undefined>)
    {
        if (promise)
        {
            promise.then((value) =>
            {
                this.setState({ multipage: value, resolved: true });
            }).catch(() =>
            {
                this.setState({ resolved: true }); // 出错也视为完成，退回到普通播放
            });
        } else
        {
            this.setState({ resolved: true }); // 没有 Promise，直接视为完成
        }
    }

    componentDidMount()
    {
        this.handlePromise(this.props.platformData.multiPage);
    }

    componentDidUpdate(prevProps: Readonly<MediaContainerProps>)
    {
        if (this.props.platformData !== prevProps.platformData)
        {
            this.setState({ multipage: undefined, resolved: false });
            this.handlePromise(this.props.platformData.multiPage);
        }
    }

    render()
    {
        const { multipage, resolved } = this.state;
        const { platformData } = this.props;
        const contextState = this.context;

        // 加载状态
        const isLoading = !!platformData.multiPage && !resolved;

        // 平台识别
        const isNetease = platformData.neteaseMusic || platformData.websiteUrl?.includes('163.com');
        const hasMultiPage = !!multipage;

        const playIcon = isNetease ? "mdi-headphones" : "mdi-play";
        const actionText = isNetease ? "选歌" : "选集";

        // 公共容器类 (整合了你的 SCSS 逻辑)
        const containerBaseClass = "MediaCardButtonContainer w-full flex justify-center items-center text-[20px] leading-[88px] transition-all duration-100 ease-in-out hover:opacity-70";

        // 图标公共类
        const iconBaseClass = "font-['md'] text-[28px] font-bold transition-all duration-500 ease-in-out";

        return (
            <div className="MediaCardButtonsWrapper flex w-full">
                {/* 播放按钮 */}
                <div
                    className={`${containerBaseClass} ${isLoading ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                    style={{ color: contextState.color }}
                    onClick={isLoading ? undefined : this.demandPlay}
                >
                    <div className={`${playIcon} ${iconBaseClass}`}></div>
                    <div className="ml-[22px] font-bold">播放</div>
                </div>

                {/* 选集/选歌按钮 */}
                {hasMultiPage && (
                    <div
                        className={`${containerBaseClass} border-l border-black/10 cursor-pointer`}
                        style={{ color: contextState.color }}
                        onClick={this.confirmMultiPageAction}
                    >
                        <div className={`mdi-playlist-plus ${iconBaseClass}`}></div>
                        <div className="ml-[22px] font-bold">{actionText}</div>
                    </div>
                )}
            </div>
        );
    }
}
