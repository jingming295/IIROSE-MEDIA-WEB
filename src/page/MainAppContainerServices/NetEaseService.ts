// NetEaseService.ts
import { NetEasePlatform } from "../../platforms/NetEasePlatform";

export class NetEaseService
{
    /**
     * @description 网易云通用搜索处理器 (内部私有)
     */
    private static handleSearch(
        ctx: MainAppContainerActionContext,
        itemsPerPage: number,
        searchFn: (k: string, p: number) => Promise<{
            platformData: PlatformData[];
            totalPage: number;
            allPlatformData: PlatformData[];
        }>,
        getOnDemandPlay: (platform: NetEasePlatform) => (data: PlatformData) => void
    )
    {
        const { searchKeyword, allMediaData, currentPage, totalPage, updating, requestToken, isCurrentInMultiPage } = ctx.getState();
        const maxPage = Math.ceil(allMediaData.length / itemsPerPage);

        // 1. 逻辑 A: 处理本地分页缓存
        if (currentPage <= maxPage)
        {
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, allMediaData.length);
            const currentPageData = allMediaData.slice(startIndex, endIndex);

            // 如果在多级页面，点播逻辑通常会变为 MOD (播放单曲)
            const onDemand = isCurrentInMultiPage ? NetEasePlatform.MOD : getOnDemandPlay(NetEasePlatform);

            ctx.setState({
                mediaData: Promise.resolve({ platformData: currentPageData, totalPage }),
                currentOnDemandPlay: onDemand
            });
        }
        // 2. 逻辑 B: 处理异步网络请求
        else if (!updating)
        {
            if (searchKeyword === '')
            {
                ctx.setState({ mediaData: null, totalPage: 0 });
                return;
            }

            const currentRequestToken = requestToken + 1;
            ctx.setState({ updating: true, requestToken: currentRequestToken });

            // 计算页码 (网易云通常 100 条/页)
            const page = currentPage !== 1 ? Math.floor(allMediaData.length / 100) + 1 : 1;
            const dataPromise = searchFn(searchKeyword, page);
            const onDemand = getOnDemandPlay(NetEasePlatform);

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

    // --- 外部调用的静态接口 ---

    static searchMusic(ctx: MainAppContainerActionContext, itemsPerPage: number)
    {
        this.handleSearch(ctx, itemsPerPage,
            (k, p) => NetEasePlatform.searchForMusicsBasicsData(k, p),
            () => NetEasePlatform.MOD
        );
    }

    static searchAlbum(ctx: MainAppContainerActionContext, itemsPerPage: number)
    {
        this.handleSearch(ctx, itemsPerPage,
            (k, p) => NetEasePlatform.searchForAlbumBasicsData(k, p),
            () => NetEasePlatform.AOD
        );
    }

    static searchPlaylist(ctx: MainAppContainerActionContext, itemsPerPage: number)
    {
        this.handleSearch(ctx, itemsPerPage,
            (k, p) => NetEasePlatform.searchForMusicListBasicsData(k, p),
            () => NetEasePlatform.MLOD
        );
    }

    static searchMV(ctx: MainAppContainerActionContext, itemsPerPage: number)
    {
        this.handleSearch(ctx, itemsPerPage,
            (k, p) => NetEasePlatform.searchForMVBasicsData(k, p),
            () => NetEasePlatform.MVOD
        );
    }
}