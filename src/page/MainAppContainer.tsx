import { Component } from 'preact';
import { MediaSearchBar } from './components/mediaContainerBar/MediaSearchBar';
import { PlatformSelector } from './components/mediaContainerBar/PlatformSelector';
import { MediaContainerSubNavBar } from './components/mediaContainerBar/MediaContainerSubNavBar';
import { MediaCard } from '../iirose-media-component/media-container/media-card-container/MediaCard';
import { PlatformData } from '../platforms/interfaces';
import { MediaContainerContext, Provider } from '../iirose-media-component/media-container/media-container-context/MediaContainerContext';
import { BilibiliPlatform } from '../platforms/BilibiliPlatform';
import { NetEasePlatform } from '../platforms/NetEasePlatform';
import { GetBiliBiliAccount } from '../Account/BiliBili/GetBiliBili';
import { BiliBiliSettings } from '../settings/bilibiliSettings/BiliBiliSettings';
import { NetEaseSettings } from '../settings/neteaseSettings/NetEaseSettings';
import { About } from '../platforms/About';
import { PluginSettings } from '../settings/pluginSettings/PluginSettings';

interface MainAppContainerProps
{
    CategoriesIndex: number;
    needOutFromMultiPage: boolean;
    needOutFromSettings: boolean;
    searchKeyword: string;
    active: boolean;
    changeSearchKeyword: (keyword: string | null) => void
    ShowOrHideIMC: () => Promise<void>;
}

interface MainAppContainerState
{
    PlatformIndex: number;
    searchKeyword: string;
    SubNavBarIndex: number;
    mediaData: Promise<{ platformData: PlatformData[], totalPage: number }> | null;
    allMediaData: PlatformData[];
    currentPage: number;
    updating: boolean;
    totalPage: number;
    oldItems: OldItems | null;
    settingsData: SettingData[] | null;
    isCurrentInMultiPage: boolean;
    requestToken: number;
    onlineCount: number;
    currentSubNavBarAction: () => void;
    currentOnDemandPlay: (platformData: PlatformData) => void;
}

export class MainAppContainer extends Component<MainAppContainerProps, MainAppContainerState>
{
    static contextType = MediaContainerContext;
    private itemsPerPage = 10
    mediaContainerGesture = new MediaContainerGesture(this.props.ShowOrHideIMC);
    private intervalId: NodeJS.Timeout | null = null;

    constructor(props: MainAppContainerProps)
    {
        super(props);
    }

    sleep(ms: number): Promise<void>
    {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 定义 API 调用的类型
    callAPI = async (): Promise<void> =>
    {
        try
        {
            const { settingsData } = this.state;
            await fetch(`https://xc.null.red:8043/api/online/heartbeat?t=mingmedia&_=${Date.now()}`);
            await this.sleep(200);
            const response = await fetch(`https://xc.null.red:8043/api/online/list?t=mingmedia&_=${Date.now()}`);
            const data: { online: number } = await response.json();
            this.setState({ onlineCount: data.online });
            if (settingsData)
            {
                if (settingsData[0].title === '作者')
                {
                    this.AboutAction.about()
                }
            }

        } catch (error)
        {
            console.error(error);
        }
    };

    componentDidUpdate(prevProps: Readonly<MainAppContainerProps>, prevState: Readonly<MainAppContainerState>): void
    {
        const { needOutFromMultiPage, needOutFromSettings } = this.props;
        const { settingsData, isCurrentInMultiPage, oldItems, mediaData, allMediaData, totalPage } = this.state;
        const propsSearchKeyword = this.props.searchKeyword;

        const prevPropsSearchKeyword = prevProps.searchKeyword;
        if (prevPropsSearchKeyword !== propsSearchKeyword)
        {
            const { SubNavBarIndex } = this.state;
            if (propsSearchKeyword === null || propsSearchKeyword === '')
            {
                if (SubNavBarIndex === 0) return
                this.setState({ allMediaData: [] });
                this.setState({ mediaData: null });
                this.setState({ searchKeyword: '', currentPage: 1 });
            } else
            {
                this.setState({ allMediaData: [] });
                this.setState({ searchKeyword: propsSearchKeyword, currentPage: 1 });
            }
        }

        // 退出多页
        if (needOutFromMultiPage && isCurrentInMultiPage)
        {
            this.setState({ isCurrentInMultiPage: false });
        }

        // 退出设置页面
        if (needOutFromSettings && settingsData)
        {
            this.setState({ settingsData: null });
        }

        // 储存mediaItems
        if (isCurrentInMultiPage && !oldItems)
        {

            this.setState(
                {
                    oldItems: {
                        mediaData: this.state.mediaData,
                        allMediaData: this.state.allMediaData,
                        totalPage: this.state.totalPage,
                        currentPage: this.state.currentPage,
                        SubNavBarAction: this.state.currentSubNavBarAction,
                        OnDemandPlay: this.state.currentOnDemandPlay,
                    }
                }
            );
        }

        // 搜索关键字改变, 重置页面
        if (
            (prevState.searchKeyword !== this.state.searchKeyword) &&
            (prevState.SubNavBarIndex !== this.state.SubNavBarIndex)
        )
        {
            this.setState({ totalPage: 0, currentPage: 1, allMediaData: [], mediaData: null });
        }

        // 当前页面改变
        if (!mediaData && allMediaData.length > 0 && totalPage > 0)
        {
            this.setState({ totalPage: 0, currentPage: 1, allMediaData: [], mediaData: null });
        }

        // 设置定时器
        if (!this.intervalId)
        {
            this.callAPI();
            this.intervalId = setInterval(this.callAPI, 2 * 60 * 1000);
        }

    }

    componentWillUnmount(): void
    {
        // 组件卸载时清除定时器
        if (this.intervalId)
        {
            clearInterval(this.intervalId);
        }
    }

    render()
    {
        const { CategoriesIndex, ShowOrHideIMC, changeSearchKeyword } = this.props;
        const { PlatformIndex, mediaData, settingsData, searchKeyword, currentPage, totalPage, isCurrentInMultiPage, currentOnDemandPlay } = this.state;
        const {
            changecurrentPage,
            updateSubNavBarIndex,
            updateCurrentSubNavBarAction,
            updateCurrentInMultiPageStatus,
            switchPlatform,
            switchToMultiPage,
            switchToOutFromMultiPage
        } = this.controller
        const categories = this.categories[CategoriesIndex];
        const categoriesPlatform = categories?.platform[PlatformIndex] || categories.platform[0];
        const color = categoriesPlatform.color;

        const providerValue = {
            color,
            switchToMultiPage,
            currentOnDemandPlay,
            updateCurrentInMultiPageStatus,
            ShowOrHideIMC
        }

        return (
            <Provider value={providerValue}>
                <div
                    className='MediaContainerWrapper'
                    onTouchStart={(e) => this.mediaContainerGesture.handleStart(e, currentPage, totalPage, changecurrentPage)}
                    onMouseDown={(e) => this.mediaContainerGesture.handleStart(e, currentPage, totalPage, changecurrentPage)}
                >

                    <div className='MediaContainer'>

                        <div className='MediaContainerController' style={{ backgroundColor: color }}>
                            {
                                !settingsData &&
                                <MediaSearchBar
                                    searchKeyword={searchKeyword}
                                    currentPage={currentPage}
                                    totalPage={totalPage}
                                    isCurrentInMultiPage={isCurrentInMultiPage}
                                    mediaSearchBarActions={
                                        {
                                            changeSearchKeyword,
                                            changecurrentPage,
                                            switchToOutFromMultiPage
                                        }
                                    }
                                />
                            }
                            <PlatformSelector
                                platform={categories.platform}
                                isCurrentInMultiPage={isCurrentInMultiPage}
                                switchPlatform={switchPlatform}
                            />
                            <MediaContainerSubNavBar
                                platform={categoriesPlatform}
                                searchKeyword={searchKeyword}
                                categories={categories}
                                isCurrentInMultiPage={isCurrentInMultiPage}
                                PlatformIndex={PlatformIndex}
                                actions={
                                    {
                                        updateCurrentSubNavBarAction,
                                        updateSubNavBarIndex
                                    }
                                }
                            />
                        </div>


                        <MediaCard
                            mediaData={mediaData}
                            settingsData={settingsData}
                        />
                    </div>


                </div>
            </Provider>
        );
    }

    state = {
        searchKeyword: '',
        SubNavBarIndex: 0,
        currentPage: 1,
        updating: false,
        totalPage: 0,
        PlatformIndex: 0,
        isCurrentInMultiPage: false,
        mediaData: null as Promise<{ platformData: PlatformData[], totalPage: number }> | null,
        allMediaData: [] as PlatformData[],
        oldItems: null as OldItems | null,
        settingsData: null as SettingData[] | null,
        requestToken: 0,
        onlineCount: 0,
        currentSubNavBarAction: () => { },
        currentOnDemandPlay: () => { },
    }

    private controller = {
        /**
         * @description 更新目前的页面
         * @param page 
         * @returns 
         */
        changecurrentPage: async (page: number) =>
        {
            const { updating, currentSubNavBarAction } = this.state;
            if (updating) return;
            await this.setState({ currentPage: page });
            currentSubNavBarAction();
        },

        /**
         * @description 更新平台的子选项
         * @param current 
         * @param prev 
         */
        updateSubNavBarIndex: async (current: number) =>
        {
            await this.setState({ SubNavBarIndex: current, currentPage: 1 });
            this.setState({ allMediaData: [] });
        },

        /**
         * @description 更新平台的子选项点下去之后会发生什么
         * @param action 
         */
        updateCurrentSubNavBarAction: (action: () => void) =>
        {
            this.setState({ currentSubNavBarAction: action });
        },

        /**
         * @description 更新目前是否在多集页面里面
         * @param status 
         */
        updateCurrentInMultiPageStatus: (status: boolean) =>
        {
            this.setState({ isCurrentInMultiPage: status });
        },

        /**
         * 更新平台
         * @param index 
         */
        switchPlatform: (index: number) =>
        {
            this.setState({ PlatformIndex: index });
        },

        /**
         * @description 切换到多集页面
         * @param platformData 
         * @param isCurrentInMultiPage 
         */
        switchToMultiPage: (platformData: PlatformData, isCurrentInMultiPage?: boolean) =>
        {
            if (platformData.bilibili)
            {
                const bilibili = new BilibiliPlatform();
                const data = bilibili.getMultiPageBasicsData(platformData);
                const vod = bilibili.VOD.bind(bilibili);
                this.setState({ currentPage: 1, totalPage: 0 });
                this.setState({ mediaData: data });
                this.setState({ currentOnDemandPlay: vod });
                data.then((res) =>
                {
                    if (!isCurrentInMultiPage) return;
                    if (!res) return;
                    this.setState({ totalPage: res.totalPage });
                    if (res.allPlatformData)
                    {
                        this.setState({ allMediaData: res.allPlatformData });
                    }
                })

            } else if (platformData.neteaseMusic?.isSongList)
            {
                const netEase = new NetEasePlatform()
                const data = netEase.getSongListMultiPageData(platformData);

                const MOD = netEase.MOD.bind(netEase);
                this.setState({ currentPage: 1, totalPage: 0 });
                this.setState({ mediaData: data });
                this.setState({ currentOnDemandPlay: MOD });

                data.then((res) =>
                {
                    if (!isCurrentInMultiPage) return;
                    if (!res) return;
                    this.setState({ totalPage: res.totalPage });
                    if (res.allPlatformData)
                    {
                        this.setState({ allMediaData: res.allPlatformData });
                    }
                })
            } else if (platformData.neteaseMusic?.isAlbum)
            {
                const netEase = new NetEasePlatform()
                const data = netEase.getAlbumMultiPageData(platformData);

                const MOD = netEase.MOD.bind(netEase);
                this.setState({ currentPage: 1, totalPage: 0 });
                this.setState({ mediaData: data });
                this.setState({ currentOnDemandPlay: MOD });

                data.then((res) =>
                {
                    if (!isCurrentInMultiPage) return;
                    if (!res) return;
                    this.setState({ totalPage: res.totalPage });
                    if (res.allPlatformData)
                    {
                        this.setState({ allMediaData: res.allPlatformData });
                    }
                })

            }

        },

        /**
         * @description 退出多集页面
         * @returns 
         */
        switchToOutFromMultiPage: () =>
        {
            const oldItems = this.state.oldItems;
            if (!oldItems) return;
            this.setState({ oldItems: null });
            this.setState({ mediaData: oldItems.mediaData });
            this.setState({ allMediaData: oldItems.allMediaData });
            this.setState({ totalPage: oldItems.totalPage });
            this.setState({ currentPage: oldItems.currentPage });
            this.setState({ isCurrentInMultiPage: false });
            this.setState({ currentSubNavBarAction: oldItems.SubNavBarAction });
            this.setState({ currentOnDemandPlay: oldItems.OnDemandPlay });
        },

        pushAllData: (currentRequestToken: number, allPlatformData: PlatformData[] | undefined, totalPage: number) =>
        {
            const { allMediaData } = this.state;
            if (this.state.requestToken !== currentRequestToken)
            {
                return;
            }

            if (allPlatformData)
            {
                allMediaData.push(...allPlatformData);
                this.setState({ allMediaData: allMediaData, updating: false });
                this.setState({ totalPage: totalPage });
            }
        }
    }

    private bilibiliAction = {
        bilibiliRefreshCount: 1,
        /**
         * @description 哔哩哔哩首页推荐
         */
        snbclick_bilibiliRecommand: () =>
        {
            const bilibiliPlatform = new BilibiliPlatform();
            const data = bilibiliPlatform.getRecommendVideosBasicsData(
                this.bilibiliAction.bilibiliRefreshCount
            );
            const vod = bilibiliPlatform.VOD.bind(bilibiliPlatform);
            this.setState({
                mediaData: data,
                currentOnDemandPlay: vod,
                currentPage: 1,
                totalPage: 1,
                requestToken: +1
            });
            this.bilibiliAction.bilibiliRefreshCount++;
        },
        /**
         * @description 哔哩哔哩搜索视频
         * @returns 
         */
        snbclick_bilibiliSearchVideoByKeyword: () =>
        {
            const {
                searchKeyword,
                allMediaData,
                currentPage,
                updating,
                totalPage
            } = this.state;
            const { pushAllData } = this.controller;
            if (!allMediaData.length) this.setState({ totalPage: 0 });

            // 如果search的时候，keyword是空的
            if (searchKeyword === '')
            {
                this.setState({ mediaData: null, totalPage: 0 });
                return;
            }

            const maxPage = Math.ceil(allMediaData.length / this.itemsPerPage); // 最大页数


            // 如果有全部MediaData
            if (currentPage <= maxPage) 
            {
                const vod = new BilibiliPlatform().VOD.bind(new BilibiliPlatform());
                // 计算起始和结束索引
                const startIndex = (currentPage - 1) * this.itemsPerPage;
                const endIndex = Math.min(startIndex + this.itemsPerPage, allMediaData.length);
                const currentPageData = allMediaData.slice(startIndex, endIndex);
                const mediaData = new Promise<{ platformData: PlatformData[], totalPage: number }>((resolve) => { resolve({ platformData: currentPageData, totalPage: totalPage }) });
                this.setState({ mediaData: mediaData });
                this.setState({ currentOnDemandPlay: vod });
            }
            // 如果正在没有在更新数据
            else if (!updating)
            {
                const currentRequestToken = this.state.requestToken + 1; // 新的请求标识符
                this.setState({ updating: true, requestToken: currentRequestToken });
                const page = currentPage !== 1 ? Math.floor(allMediaData.length / 50) + 1 : 1;
                const bilibili = new BilibiliPlatform();
                const data = bilibili.searchForVideosBasicsData(searchKeyword, page);
                const vod = bilibili.VOD.bind(bilibili);

                this.setState({ mediaData: data, currentOnDemandPlay: vod.bind(bilibili) });

                data.then((res) =>
                {
                    pushAllData(currentRequestToken, res.allPlatformData, res.totalPage);
                });

            }
        },
        /**
         * @description 哔哩哔哩搜索直播
         * @returns 
         */
        snbclick_bilibiliSearchLiveByKeyword: () =>
        {
            const { searchKeyword, currentPage } = this.state;

            const currentRequestToken = this.state.requestToken + 1;
            if (searchKeyword === '')
            {
                this.setState({ mediaData: null, totalPage: 0 });
                return;
            }

            const page = currentPage;
            const bilibili = new BilibiliPlatform();
            const data = bilibili.searchForLiveBasicsData(searchKeyword, page);
            const lod = bilibili.LOD.bind(bilibili);
            this.setState({ mediaData: data, currentOnDemandPlay: lod, requestToken: currentRequestToken });
            data.then((res) =>
            {

                if (this.state.requestToken !== currentRequestToken)
                {
                    return;
                }

                this.setState({ totalPage: res.totalPage });
            });

        }
    }

    private netEaseAction = {

        netEaseRecommendPlayList: () =>
        {
            const { allMediaData, totalPage, currentPage, isCurrentInMultiPage } = this.state;
            const currentRequestToken = this.state.requestToken + 1;
            const netease = new NetEasePlatform();
            if (allMediaData.length > 0)
            {
                if (!isCurrentInMultiPage)
                {
                    const mlod = netease.MLOD.bind(netease);
                    this.setState({ currentOnDemandPlay: mlod });
                } else if (isCurrentInMultiPage)
                {
                    const MOD = netease.MOD.bind(netease);
                    this.setState({ currentOnDemandPlay: MOD });
                }

                // 计算起始和结束索引
                const startIndex = (currentPage - 1) * this.itemsPerPage;
                const endIndex = Math.min(startIndex + this.itemsPerPage, allMediaData.length);

                const currentPageData = allMediaData.slice(startIndex, endIndex);

                const mediaData = new Promise<{ platformData: PlatformData[], totalPage: number }>((resolve) => { resolve({ platformData: currentPageData, totalPage: totalPage }) });

                this.setState({ mediaData: mediaData });

            } else
            {
                const data = netease.searchForRecommendPlayListBasicsData();
                const mlod = netease.MLOD.bind(netease);

                this.setState({
                    mediaData: data,
                    currentOnDemandPlay: mlod,
                    requestToken: currentRequestToken,
                    currentPage: 1,
                    totalPage: 0
                });

                data.then((res) =>
                {
                    if (this.state.requestToken !== currentRequestToken)
                    {
                        return;
                    }
                    this.setState({ totalPage: res.totalPage });
                    if (res.allPlatformData)
                    {
                        this.setState({ allMediaData: res.allPlatformData });
                    }
                })
            }

        },
        netEaseSearchMusicByKeyword: () =>
        {
            const { searchKeyword, allMediaData, currentPage, totalPage, updating } = this.state;
            const { pushAllData } = this.controller;
            const netease = new NetEasePlatform();
            const currentRequestToken = this.state.requestToken + 1;
            const maxPage = Math.ceil(allMediaData.length / this.itemsPerPage); // 最大页数
            if (!allMediaData.length) this.setState({ totalPage: 0 });
            if (currentPage <= maxPage)
            {
                const MOD = netease.MOD.bind(netease);

                // 计算起始和结束索引

                const startIndex = (currentPage - 1) * this.itemsPerPage;
                const endIndex = Math.min(startIndex + this.itemsPerPage, allMediaData.length);

                const currentPageData = allMediaData.slice(startIndex, endIndex);

                const mediaData = new Promise<{ platformData: PlatformData[], totalPage: number }>((resolve) => { resolve({ platformData: currentPageData, totalPage: totalPage }) });

                this.setState({ mediaData: mediaData });
                this.setState({ currentOnDemandPlay: MOD });

            } else if (!updating) 
            {
                if (searchKeyword === '')
                {
                    this.setState({ mediaData: null, totalPage: 0 });
                    return;
                }

                this.setState({ updating: true });
                const page = currentPage !== 1 ? Math.floor(allMediaData.length / 100) + 1 : 1;
                const data = netease.searchForMusicsBasicsData(searchKeyword, page);
                const MOD = netease.MOD.bind(netease);

                this.setState({
                    mediaData: data,
                    currentOnDemandPlay: MOD,
                    requestToken: currentRequestToken
                });

                data.then((res) =>
                {
                    pushAllData(currentRequestToken, res.allPlatformData, res.totalPage);
                });
            }
        },
        netEaseSearchSongListByKeyword: () =>
        {
            const { searchKeyword, allMediaData, currentPage, totalPage, updating, isCurrentInMultiPage } = this.state;
            const { pushAllData } = this.controller;
            const netease = new NetEasePlatform();
            const currentRequestToken = this.state.requestToken + 1;
            const MLOD = netease.MLOD.bind(netease);

            const maxPage = Math.ceil(allMediaData.length / this.itemsPerPage); // 最大页数
            if (currentPage <= maxPage)
            {
                if (!isCurrentInMultiPage)
                {
                    this.setState({ currentOnDemandPlay: MLOD });
                } else if (isCurrentInMultiPage)
                {
                    const MOD = netease.MOD.bind(netease);
                    this.setState({ currentOnDemandPlay: MOD });
                }
                const startIndex = (currentPage - 1) * this.itemsPerPage;
                const endIndex = Math.min(startIndex + this.itemsPerPage, allMediaData.length);

                const currentPageData = allMediaData.slice(startIndex, endIndex);

                const mediaData = new Promise<{ platformData: PlatformData[], totalPage: number }>((resolve) => { resolve({ platformData: currentPageData, totalPage: totalPage }) });

                this.setState({ mediaData: mediaData });

            } else if (!updating)
            {
                if (searchKeyword === '')
                {
                    this.setState({ mediaData: null, totalPage: 0 });
                    return;
                }
                const page = currentPage !== 1 ? Math.floor(allMediaData.length / 100) + 1 : 1;

                const data = netease.searchForMusicListBasicsData(searchKeyword, page);

                this.setState({
                    mediaData: data,
                    currentOnDemandPlay: MLOD,
                    requestToken: currentRequestToken,
                    updating: true
                });



                data.then((res) =>
                {
                    pushAllData(currentRequestToken, res.allPlatformData, res.totalPage);
                })
            }
        },
        netEaseSearchAlbumByKeyword: () =>
        {

            const { searchKeyword, allMediaData, currentPage, totalPage, updating, isCurrentInMultiPage } = this.state;
            const { pushAllData } = this.controller;
            const netease = new NetEasePlatform();
            const currentRequestToken = this.state.requestToken + 1;
            const AOD = netease.AOD.bind(netease);
            const maxPage = Math.ceil(allMediaData.length / this.itemsPerPage); // 最大页数
            if (!allMediaData.length) this.setState({ totalPage: 0 });

            if (currentPage <= maxPage)
            {

                const startIndex = (currentPage - 1) * this.itemsPerPage;
                const endIndex = Math.min(startIndex + this.itemsPerPage, allMediaData.length);

                const currentPageData = allMediaData.slice(startIndex, endIndex);

                const mediaData = new Promise<{ platformData: PlatformData[], totalPage: number }>((resolve) => { resolve({ platformData: currentPageData, totalPage: totalPage }) });

                this.setState({ mediaData: mediaData });
                if (!isCurrentInMultiPage)
                {
                    this.setState({ currentOnDemandPlay: AOD });
                } else if (isCurrentInMultiPage)
                {
                    const MOD = netease.MOD.bind(netease);
                    this.setState({ currentOnDemandPlay: MOD });
                }

            } else if (!updating)
            {
                if (searchKeyword === '')
                {
                    this.setState({ mediaData: null, totalPage: 0 });
                    return;
                }
                const page = currentPage !== 1 ? Math.floor(allMediaData.length / 100) + 1 : 1;
                console.log(page)
                const data = netease.searchForAlbumBasicsData(searchKeyword, page);

                this.setState({
                    mediaData: data,
                    currentOnDemandPlay: AOD,
                    requestToken: currentRequestToken,
                    updating: true
                });

                data.then((res) =>
                {
                    pushAllData(currentRequestToken, res.allPlatformData, res.totalPage);
                })
            }

        },
        netEaseSearchMVByKeyword: () =>
        {
            const { searchKeyword, allMediaData, currentPage, totalPage, updating } = this.state;
            const { pushAllData } = this.controller;
            const netease = new NetEasePlatform();
            const currentRequestToken = this.state.requestToken + 1;
            const MVOD = netease.MVOD.bind(netease);
            this.setState({ currentOnDemandPlay: MVOD });
            if (!allMediaData.length) this.setState({ totalPage: 0 });

            const maxPage = Math.ceil(allMediaData.length / this.itemsPerPage); // 最大页数


            if (currentPage <= maxPage)
            {

                const startIndex = (currentPage - 1) * this.itemsPerPage;
                const endIndex = Math.min(startIndex + this.itemsPerPage, allMediaData.length);

                const currentPageData = allMediaData.slice(startIndex, endIndex);

                const mediaData = new Promise<{ platformData: PlatformData[], totalPage: number }>((resolve) => { resolve({ platformData: currentPageData, totalPage: totalPage }) });

                this.setState({ mediaData: mediaData });

            } else if (!updating)
            {
                if (searchKeyword === '')
                {
                    this.setState({ mediaData: null, totalPage: 0 });
                    return;
                }

                const page = currentPage !== 1 ? Math.floor(allMediaData.length / 100) + 1 : 1;

                const data = netease.searchForMVBasicsData(searchKeyword, page);

                this.setState({
                    mediaData: data,
                    requestToken: currentRequestToken,
                    updating: true
                });

                data.then((res) =>
                {
                    pushAllData(currentRequestToken, res.allPlatformData, res.totalPage);
                })
            }

        },
        netEaseSearchRadioByKeyword: () =>
        {
            const { searchKeyword, allMediaData, currentPage, totalPage } = this.state;
            const netease = new NetEasePlatform();
            const currentRequestToken = this.state.requestToken + 1;
            if (!allMediaData.length) this.setState({ totalPage: 0 });

            if (allMediaData.length > 0)
            {

                const startIndex = (currentPage - 1) * this.itemsPerPage;
                const endIndex = Math.min(startIndex + this.itemsPerPage, allMediaData.length);

                const currentPageData = allMediaData.slice(startIndex, endIndex);

                const mediaData = new Promise<{ platformData: PlatformData[], totalPage: number }>((resolve) => { resolve({ platformData: currentPageData, totalPage: totalPage }) });

                this.setState({ mediaData: mediaData });

            } else
            {
                if (searchKeyword === '')
                {
                    this.setState({ mediaData: null, totalPage: 0 });
                    return;
                }

                const data = netease.searchForRadioBasicsData(searchKeyword, currentPage);

                this.setState({
                    mediaData: data,
                    requestToken: currentRequestToken
                });

                data.then((res) =>
                {
                    if (this.state.requestToken !== currentRequestToken)
                    {
                        return;
                    }

                    this.setState({ allMediaData: res.allPlatformData, totalPage: res.totalPage });
                })
            }
        }
    }

    private settingsAction = {

        bilibili: {
            bilibiliAccountSetting: () =>
            {
                const getBilibiliAcc = new GetBiliBiliAccount()
                const bilibiliAccountData = getBilibiliAcc.getBiliBiliAccount();
                const bilibiliSettings = new BiliBiliSettings();
                const settingData: SettingData[] = [{
                    title: '账号',
                    actionTitle: bilibiliAccountData?.uname || '未登录',
                    icon: 'mdi-account-child-circle',
                    action: bilibiliSettings.setAccount.bind(bilibiliSettings)
                }]

                this.setState({ settingsData: settingData });
            },
            bilibiliVideoSetting: () =>
            {
                const bilibiliSettings = new BiliBiliSettings();
                const bilibiliVIdeoSettings = bilibiliSettings.getBilibiliVideoSettings();
                const quaity = bilibiliVIdeoSettings.qn;
                const liveQuality = bilibiliVIdeoSettings.streamqn;

                const qualityInText = bilibiliSettings.parseBilibiliVideoQn(quaity);
                const liveQualityInText = bilibiliSettings.parseBilibiliLiveQn(liveQuality);
                const streamMinutes = (bilibiliVIdeoSettings.streamSeconds / 60);
                const getVideoFormatInText = bilibiliSettings.parseGetVideoFormat(bilibiliVIdeoSettings.videoStreamFormat);

                const settingData: SettingData[] = [{
                    title: '点播的视频画质',
                    actionTitle: qualityInText,
                    icon: 'mdi-video',
                    action: bilibiliSettings.setBilibiliVideoQuality.bind(bilibiliSettings)
                }, {
                    title: '点播的直播画质',
                    actionTitle: liveQualityInText,
                    icon: 'mdi-video-wireless',
                    action: bilibiliSettings.setBilibiliLiveQuality.bind(bilibiliSettings)
                }, {
                    title: '点播的直播播放时长',
                    actionTitle: `${streamMinutes} 分钟`,
                    icon: 'mdi-clock-outline',
                    action: bilibiliSettings.setBilibiliStreamSeconds.bind(bilibiliSettings)
                }, {
                    title: '点播视频的获取格式',
                    actionTitle: getVideoFormatInText,
                    icon: 'mdi-hammer-wrench',
                    action: bilibiliSettings.setGetVideoFormat.bind(bilibiliSettings)

                }, {
                    title: "默认API",
                    actionTitle: bilibiliSettings.parseBilibiliApi(bilibiliVIdeoSettings.api),
                    icon: 'mdi-code-braces',
                    action: bilibiliSettings.setBilibiliDefaultApi.bind(bilibiliSettings)
                }]
                this.setState({ settingsData: settingData });
            },
        },
        netEase: {
            neteaseMusicSetting: () =>
            {
                const neteaseSettings = new NetEaseSettings();

                const neteaseMusicSettings = neteaseSettings.getNeteaseMusicSetting();

                const quality = neteaseMusicSettings.quality;

                const qualityInText = neteaseSettings.parseNetEaseMusicQuality(quality);

                const apiInText = neteaseSettings.parseNetEaseMusicApi(neteaseMusicSettings.api);

                const lyricOptionInText = neteaseSettings.parseNetEaseMusicLyricOption(neteaseMusicSettings.lyricOption);

                const settingData: SettingData[] = [{
                    title: '音乐的音质',
                    actionTitle: qualityInText,
                    icon: 'mdi-music',
                    action: neteaseSettings.setNeteaseMusicQuality.bind(neteaseSettings)
                },
                {
                    title: '歌词',
                    actionTitle: lyricOptionInText,
                    icon: 'mdi-card-bulleted',
                    action: neteaseSettings.setNeteaseMusicLyric.bind(neteaseSettings)
                },
                {
                    title: '默认API',
                    actionTitle: apiInText,
                    icon: 'mdi-code-braces',
                    action: neteaseSettings.setNeteaseDefaultApi.bind(neteaseSettings)
                }]

                this.setState({ settingsData: settingData });
            }
        },
        plugin: {
            chatBox: () =>
            {
                const pluginSetting = new PluginSettings()

                const ps = pluginSetting.getPluginSetting();

                const isProxyAtInputInText = ps.chatBox.isProxyAtInput ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off-outline';

                const plugin: SettingData[] = [{
                    title: '代理蔷薇@输入',
                    actionTitle: isProxyAtInputInText,
                    icon: 'mdi-at',
                    action: pluginSetting.isProxyAtInputSetting.bind(pluginSetting)
                }]

                this.setState({ settingsData: plugin });
            }
        }
    }

    private AboutAction = {
        about: () =>
        {
            const aboutData: SettingData[] = [{
                title: '作者',
                actionTitle: '铭',
                icon: 'mdi-account-tie',
                action: async () =>
                {
                    await this.props.ShowOrHideIMC();
                    const about = new About()
                    about.aboutCreator()
                }
            }, {
                title: '项目源代码地址',
                actionTitle: 'GitHub 🔗',
                icon: 'mdi-github',
                action: () =>
                {
                    window.open('https://github.com/jingming295/IIROSE-MEDIA-WEB')
                }
            }, {
                title: '投喂我',
                actionTitle: '投喂',
                icon: 'mdi-coffee-outline',
                action: () =>
                {
                    const about = new About()
                    about.aboutDonate()

                }
            }, {
                title: '赞助列表',
                actionTitle: '感谢名单',
                icon: 'mdi-account-group',
                action: () =>
                {
                    const about = new About()
                    about.aboutSponsorList(this.props.ShowOrHideIMC)
                }
            }, {
                title: '在线人数',
                actionTitle: this.state.onlineCount.toString(),
                icon: 'mdi-account-group',
                action: () =>
                {
                }
            }]
            this.setState({ settingsData: aboutData });
        }
    }

    private categories: Categories[] = [
        {
            platform: [
                {
                    title: '哔哩哔哩视频',
                    iconsrc: 'https://static.codemao.cn/rose/v0/images/system/media/video/bilibili/ic_launcher.png',
                    color: 'rgb(209, 79, 118)',
                    subNavBarItems: [
                        {
                            title: '首页推荐',
                            searchAction: () =>
                            {
                                this.bilibiliAction.snbclick_bilibiliRecommand()
                            }
                        },
                        {
                            title: '搜索视频',
                            class: 'search',
                            searchAction: () =>
                            {
                                this.bilibiliAction.snbclick_bilibiliSearchVideoByKeyword();
                            }
                        },
                        {
                            title: '搜索直播',
                            class: 'search',
                            searchAction: () =>
                            {
                                this.bilibiliAction.snbclick_bilibiliSearchLiveByKeyword();
                            }
                        }
                    ]
                }
            ]
        },
        {
            platform: [
                {
                    title: '网易云音乐',
                    iconsrc: 'https://static.codemao.cn/rose/v0/images/system/media/music/NeteaseMusic/logo.png',
                    color: 'rgb(221, 28, 4)',
                    subNavBarItems: [
                        {
                            title: '推荐歌单',
                            searchAction: () =>
                            {
                                this.netEaseAction.netEaseRecommendPlayList();
                            }
                        },
                        {
                            title: '搜索音乐',
                            class: 'search',
                            searchAction: () =>
                            {
                                this.netEaseAction.netEaseSearchMusicByKeyword();
                            }
                        }, {
                            title: '搜索专辑',
                            class: 'search',
                            searchAction: () =>
                            {
                                this.netEaseAction.netEaseSearchAlbumByKeyword();
                            }
                        }, {
                            title: '搜索MV',
                            class: 'search',
                            searchAction: () =>
                            {
                                this.netEaseAction.netEaseSearchMVByKeyword();
                            }
                        },
                        {
                            title: '搜索歌单',
                            class: 'search',
                            searchAction: () =>
                            {
                                this.netEaseAction.netEaseSearchSongListByKeyword();
                            }
                        }
                    ]
                }
            ]
        },
        {
            platform: [
                {
                    title: '哔哩哔哩视频',
                    iconsrc: 'https://static.codemao.cn/rose/v0/images/system/media/video/bilibili/ic_launcher.png',
                    color: 'rgb(209, 79, 118)',
                    subNavBarItems: [
                        {
                            title: '账号',
                            searchAction: () =>
                            {
                                this.settingsAction.bilibili.bilibiliAccountSetting();
                            }
                        },
                        {
                            title: '视频设置',
                            searchAction: () =>
                            {
                                this.settingsAction.bilibili.bilibiliVideoSetting();
                            }
                        }
                    ]
                }, {
                    title: '网易云音乐',
                    iconsrc: 'https://static.codemao.cn/rose/v0/images/system/media/music/NeteaseMusic/logo.png',
                    color: 'rgb(221, 28, 4)',
                    subNavBarItems: [
                        {
                            title: '音乐设置',
                            searchAction: () =>
                            {
                                this.settingsAction.netEase.neteaseMusicSetting();
                            }
                        }
                    ]
                }, {
                    title: '插件设置',
                    iconsrc: 'data:image/png;base64,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',
                    color: 'rgb(150,171,188)',
                    subNavBarItems: [
                        {
                            title: '聊天框',
                            searchAction: () =>
                            {
                                this.settingsAction.plugin.chatBox();
                            }
                        }
                    ]
                }
            ]
        }, {
            platform: [
                {
                    title: '关于这个插件',
                    iconsrc: 'data:image/png;base64,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',
                    color: 'rgb(100, 149, 237)',
                    subNavBarItems: [
                        {
                            title: '关于',
                            searchAction: () =>
                            {
                                this.AboutAction.about();
                            }
                        }
                    ]
                }
            ]
        }
    ];
}

class MediaContainerGesture
{
    constructor(private ShowOrHideIMC: () => Promise<void>) { }

    startX = 0;
    startY = 0;
    currentPage = 1;
    totalPage = 1;
    changecurrentPage = (page: number) => { page }

    handleStart(e: TouchEvent | MouseEvent, currentPage: number, totalPage: number, changecurrentPage: (page: number) => void)
    {
        this.currentPage = currentPage;
        this.totalPage = totalPage;
        this.changecurrentPage = changecurrentPage;

        if (e instanceof TouchEvent)
        {
            this.startX = e.touches[0].clientX;
            this.startY = e.touches[0].clientY;
            window.addEventListener("touchmove", this.handleMove);
            window.addEventListener("touchend", this.handleEnd);
        }
        else if (e instanceof MouseEvent)
        {
            this.startX = e.clientX;
            this.startY = e.clientY;
            window.addEventListener("mousemove", this.handleMove);
            window.addEventListener("mouseup", this.handleEnd);
        }
    }

    handleMove = (e: TouchEvent | MouseEvent) =>
    {
        let currentX = 0;
        let currentY = 0;

        if (e instanceof TouchEvent)
        {
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
        }
        else if (e instanceof MouseEvent)
        {
            currentX = e.clientX;
            currentY = e.clientY;
        }

        const diffX = currentX - this.startX;
        const diffY = currentY - this.startY;

        // 检查垂直位移是否超过水平位移的 1/3
        if (Math.abs(diffY) > Math.abs(diffX) / 3)
        {
            this.handleEnd(); // 取消事件监听，避免触发翻页
            return;
        }

        // 判断滑动是否超过 100 像素
        if (Math.abs(diffX) > 50)
        {
            if (diffX > 0)
            {
                // 右滑动（从左向右）
                if (this.currentPage > 1)
                {
                    this.changecurrentPage(this.currentPage - 1);
                }
                else
                {
                    this.ShowOrHideIMC();
                }
            }
            else
            {
                // 左滑动（从右向左）
                if (this.currentPage < this.totalPage)
                {
                    this.changecurrentPage(this.currentPage + 1);
                }
            }

            // 触发后立即解绑
            this.handleEnd();
        }
    }

    handleEnd = () =>
    {
        // 移除 touchmove 和 touchend 事件监听器
        window.removeEventListener("touchmove", this.handleMove);
        window.removeEventListener("touchend", this.handleEnd);

        // 移除 mousemove 和 mouseup 事件监听器
        window.removeEventListener("mousemove", this.handleMove);
        window.removeEventListener("mouseup", this.handleEnd);
    }
}




