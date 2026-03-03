// BilibiliLogic.ts

import { BilibiliPlatform } from "../../platforms/BilibiliPlatform";

export class BilibiliService
{
    /**
     * 首页推荐
     */
    static snbclickRecommand(ctx: BilibiliActionContext)
    {
        const bilibiliPlatform = new BilibiliPlatform();
        const data = bilibiliPlatform.getRecommendVideosBasicsData(
            ctx.getRefreshCount()
        );
        const vod = bilibiliPlatform.VOD.bind(bilibiliPlatform);

        ctx.setState({
            mediaData: data,
            currentOnDemandPlay: vod,
            currentPage: 1,
            totalPage: 1,
            requestToken: ctx.getState().requestToken + 1
        });
        ctx.incrementRefreshCount();
    }

    /**
     * 搜索视频 (包含分页缓存逻辑)
     */
    static snbclickSearchVideo(ctx: MainAppContainerActionContext, itemsPerPage: number)
    {
        const { searchKeyword, allMediaData, currentPage, updating, totalPage, requestToken } = ctx.getState();

        if (searchKeyword === '')
        {
            ctx.setState({ mediaData: null, totalPage: 0 });
            return;
        }

        const maxPage = Math.ceil(allMediaData.length / itemsPerPage);

        // 命中本地缓存
        if (currentPage <= maxPage)
        {
            const platform = new BilibiliPlatform();
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, allMediaData.length);
            const currentPageData = allMediaData.slice(startIndex, endIndex);

            ctx.setState({
                mediaData: Promise.resolve({ platformData: currentPageData, totalPage }),
                currentOnDemandPlay: platform.VOD.bind(platform)
            });
        }
        // 网络请求
        else if (!updating)
        {
            const currentRequestToken = requestToken + 1;
            ctx.setState({ updating: true, requestToken: currentRequestToken });

            const page = currentPage !== 1 ? Math.floor(allMediaData.length / 50) + 1 : 1;
            const bilibili = new BilibiliPlatform();
            const dataPromise = bilibili.searchForVideosBasicsData(searchKeyword, page);

            ctx.setState({
                mediaData: dataPromise,
                currentOnDemandPlay: bilibili.VOD.bind(bilibili)
            });

            dataPromise.then((res) =>
            {
                if (res.allPlatformData)
                    ctx.pushAllData(currentRequestToken, res.allPlatformData, res.totalPage);
            });
        }
    }

    /**
     * @description 哔哩哔哩搜索直播逻辑
     * @param ctx 核心操作上下文
     */
    static snbclickSearchLive(ctx: MainAppContainerActionContext)
    {
        const { searchKeyword, currentPage, requestToken } = ctx.getState();

        // 1. 基础校验：如果搜索关键字为空，重置状态并返回
        if (searchKeyword === '')
        {
            ctx.setState({ mediaData: null, totalPage: 0 });
            return;
        }

        // 2. 准备请求：生成新的 Request Token 防止并发冲突
        const currentRequestToken = requestToken + 1;

        const bilibili = new BilibiliPlatform();
        const dataPromise = bilibili.searchForLiveBasicsData(searchKeyword, currentPage);
        const lod = bilibili.LOD.bind(bilibili);

        // 3. 更新 UI 状态：设置 Loading 状态（Promise）和播放回调
        ctx.setState({
            mediaData: dataPromise,
            currentOnDemandPlay: lod,
            requestToken: currentRequestToken
        });

        // 4. 异步处理结果
        dataPromise.then((res) =>
        {
            // 校验 Token：确保回调返回时，用户没有发起新的搜索请求
            if (ctx.getState().requestToken !== currentRequestToken)
            {
                return;
            }

            // 更新总页数
            ctx.setState({ totalPage: res.totalPage });
        });
    }
}