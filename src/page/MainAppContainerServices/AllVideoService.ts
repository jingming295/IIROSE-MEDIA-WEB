// AllVideosService.ts
import { AllVideosPlatform } from "../../platforms/AllVideosPlatform";

export class AllVideosService
{
    /**
     * @description 多源剧集搜索逻辑
     * @param ctx 核心操作上下文
     * @param baseUrl 采集站基础地址
     * @param itemsPerPage 每页显示条数 (通常为 10)
     */
    static searchAllVideos(ctx: MainAppContainerActionContext, baseUrl: string, itemsPerPage: number)
    {
        const {
            searchKeyword,
            allMediaData,
            currentPage,
            updating,
            totalPage,
            requestToken
        } = ctx.getState();

        const allVideosPlatform = new AllVideosPlatform();

        // 1. 基础校验：空关键字处理
        if (searchKeyword === '')
        {
            ctx.setState({ mediaData: null, totalPage: 0 });
            return;
        }

        // 2. 初始化总页数检查
        if (!allMediaData.length)
        {
            ctx.setState({ totalPage: 0 });
        }

        const maxLoadedPage = Math.ceil(allMediaData.length / itemsPerPage);

        // 3. 逻辑 A: 处理本地分页缓存
        if (currentPage <= maxLoadedPage)
        {
            const vod = allVideosPlatform.VOD.bind(allVideosPlatform);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, allMediaData.length);
            const currentPageData = allMediaData.slice(startIndex, endIndex);

            const mediaDataPromise = Promise.resolve({
                platformData: currentPageData,
                totalPage: totalPage
            });

            ctx.setState({
                mediaData: mediaDataPromise,
                currentOnDemandPlay: vod
            });
        }
        // 4. 逻辑 B: 处理异步网络请求
        else
        {
            if (updating) return;

            const currentRequestToken = requestToken + 1;
            ctx.setState({ updating: true, requestToken: currentRequestToken });

            const vod = allVideosPlatform.VOD.bind(allVideosPlatform);
            // 计算采集站对应的页码 (假设每页 10 条)
            const page = currentPage !== 1 ? Math.floor(allMediaData.length / 10) + 1 : 1;
            const dataPromise = allVideosPlatform.searchAllVideos(searchKeyword, page, baseUrl);

            ctx.setState({
                mediaData: dataPromise,
                currentOnDemandPlay: vod
            });

            dataPromise.then((res) =>
            {
                // 调用 context 中定义的 pushAllData 将数据追加到全局列表
                ctx.pushAllData(currentRequestToken, res.allPlatformData, res.totalPage);
            });
        }
    }
}