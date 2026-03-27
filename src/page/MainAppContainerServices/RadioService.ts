import { RadioPlatform } from "../../platforms/RadioPlatform";

export class RadioService
{

    /**
     * @description 通用搜索处理器 (内部私有)
     */
    private static handleSearch(
        ctx: MainAppContainerActionContext,
        itemsPerPage: number,
        area: string,
        searchFn: (k: string) => Promise<any>,
        getOnDemandPlay: (platform: RadioPlatform) => (data: PlatformData) => void,
    )
    {
        const { allMediaData, currentPage, totalPage, updating, requestToken, isCurrentInMultiPage } = ctx.getState();
        const maxPage = Math.ceil(allMediaData.length / itemsPerPage);

        // 1. 逻辑 A: 处理本地分页缓存
        if (currentPage <= maxPage)
        {
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, allMediaData.length);
            const currentPageData = allMediaData.slice(startIndex, endIndex);

            // 如果在多级页面，点播逻辑通常会变为 MOD (播放单曲)
            const onDemand = isCurrentInMultiPage ? RadioPlatform.MOD : getOnDemandPlay(RadioPlatform);

            ctx.setState({
                mediaData: Promise.resolve({ platformData: currentPageData, totalPage }),
                currentOnDemandPlay: onDemand
            });
        }
        // 2. 逻辑 B: 处理异步网络请求
        else if (!updating)
        {

            const currentRequestToken = requestToken + 1;
            ctx.setState({ updating: true, requestToken: currentRequestToken });

            const dataPromise = searchFn(area);
            const onDemand = getOnDemandPlay(RadioPlatform);

            ctx.setState({
                mediaData: dataPromise,
                currentOnDemandPlay: onDemand,
                requestToken: currentRequestToken
            });

            dataPromise.then((res) =>
            {
                ctx.pushAllData(currentRequestToken, res.allPlatformData, res.totalPage);
            });
        }
    }

    static search(ctx: MainAppContainerActionContext, itemsPerPage: number, area: string)
    {
        this.handleSearch(ctx, itemsPerPage, area,
            (k) => RadioPlatform.searchSongs(k),
            () => RadioPlatform.MOD
        );
    }


}