import { Component } from 'preact';
import { Platform, Categories } from "../../page/MediaContainer";
interface MediaContainerSubNavBarProps
{
    platform: Platform;
    searchKeyword: string | null;
    categories: Categories;
    isCurrentInMultiPage: boolean;
    PlatformIndex: number;
    actions: Actions;
}

interface Actions
{
    updateSubNavBarIndex: (current: number, prev?: number) => Promise<void>
    updateCurrentSubNavBarAction: (action: () => void) => void
}

interface MediaContainerSubNavBarState
{
    activeIndex: number; // 记录当前激活的项的索引
    subNavBarClass?: string; // 当前的 class
}

export class MediaContainerSubNavBar extends Component<MediaContainerSubNavBarProps, MediaContainerSubNavBarState>
{
    constructor(props: MediaContainerSubNavBarProps)
    {
        super(props);
        this.state = {
            activeIndex: 0, // 初始状态，激活第一个项
            subNavBarClass: '', // 当前的 class 初始化为空
        }
    }

    async componentDidUpdate(prevProps: Readonly<MediaContainerSubNavBarProps>): Promise<void>
    {
        const { updateSubNavBarIndex, updateCurrentSubNavBarAction } = this.props.actions;
        const { platform } = this.props;
        const { activeIndex, subNavBarClass } = this.state;

        const { searchKeyword } = this.props;

        if ((prevProps.searchKeyword !== searchKeyword && searchKeyword !== ''))
        {
            if (subNavBarClass === 'search')
            {
                platform.subNavBarItems[activeIndex].searchAction();
            } else
            {
                for (const item of platform.subNavBarItems)
                {
                    if (item.class === 'search')
                    {
                        this.setState({ subNavBarClass: 'search', activeIndex: platform.subNavBarItems.indexOf(item) }, async () =>
                        {
                            await updateSubNavBarIndex(platform.subNavBarItems.indexOf(item));
                            item.searchAction();
                            updateCurrentSubNavBarAction(item.searchAction);
                        });
                        break;
                    }
                }
            }
        }

        if (prevProps.categories !== this.props.categories)
        {
            if (platform.subNavBarItems.length > 0)
            {
                const firstIndex = 0;
                this.setState({ activeIndex: firstIndex }, async () =>
                {
                    await updateSubNavBarIndex(firstIndex);
                    const firstItem = platform.subNavBarItems[firstIndex];
                    firstItem.searchAction();
                    this.setState({ subNavBarClass: firstItem.class });
                    updateCurrentSubNavBarAction(firstItem.searchAction);
                });
            }
        }

        if (prevProps.PlatformIndex !== this.props.PlatformIndex)
        {
            if (platform.subNavBarItems.length > 0)
            {
                const firstIndex = 0;
                this.setState({ activeIndex: firstIndex }, async () =>
                {
                    await updateSubNavBarIndex(firstIndex);
                    const firstItem = platform.subNavBarItems[firstIndex];
                    firstItem.searchAction();
                    this.setState({ subNavBarClass: firstItem.class });
                    updateCurrentSubNavBarAction(firstItem.searchAction);
                });
            }
        }

    }

    componentDidMount()
    {
        // 当组件挂载时，自动激活第一个项并执行其 onClick（如果存在）
        const { platform } = this.props;
        const { updateSubNavBarIndex, updateCurrentSubNavBarAction } = this.props.actions;
        if (platform.subNavBarItems.length > 0)
        {
            const firstIndex = 0;
            this.setState({ activeIndex: firstIndex }, async () =>
            {
                await updateSubNavBarIndex(0);
                // 在状态更新完成后执行 onClick
                const firstItem = platform.subNavBarItems[firstIndex];
                firstItem.searchAction();
                this.setState({ subNavBarClass: firstItem.class });
                // 执行传入的函数
                updateCurrentSubNavBarAction(firstItem.searchAction);

            });
        }
    }

    handleItemClick = (index: number, onClick?: () => void, subNavBarClass?: string) =>
    {
        const { updateSubNavBarIndex, updateCurrentSubNavBarAction } = this.props.actions;
        // 更新激活项的索引
        this.setState({ activeIndex: index, subNavBarClass: subNavBarClass }, async () =>
        {
            // 调用 item 的 onClick 事件处理程序（如果存在）
            if (onClick)
            {
                await updateSubNavBarIndex(index);
                onClick();
                updateCurrentSubNavBarAction(onClick);
            }
        });
    }


    render()
    {
        const { platform, isCurrentInMultiPage } = this.props;
        const { activeIndex } = this.state;

        return (
            <div className="MediaContainerSubNavBar">
                {
                    !isCurrentInMultiPage &&
                    platform.subNavBarItems.map((item, index) =>
                    {
                        const isActive = index === activeIndex;
                        const subNavBarClass = item.class ? item.class : '';
                        return (
                            <div
                                key={index} // 加入 key 属性
                                className={`SubNavBarItem ${subNavBarClass} ${isActive ? 'subNavBarItemActive' : ''}`} // 动态应用类名
                                onClick={() => this.handleItemClick(index, item.searchAction, item.class)}
                            >
                                {item.title}
                            </div>
                        );
                    })
                }
            </div>
        );
    }
}
