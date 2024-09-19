import { Component } from 'preact';
import { MediaSearchBar } from './MediaSearchBar';
import { PlatformSelector } from './PlatformSelector';
import { MediaContainerSubNavBar } from './MediaContainerSubNavBar';
import { MediaCard } from './media-card-container/MediaCard';
import { PlatformData } from '../../platforms/interfaces';
import { SettingData } from '../../settings/interfaces';
import { MediaContainerContext, Provider } from './media-container-context/MediaContainerContext';
import { BilibiliPlatform } from '../../platforms/BilibiliPlatform';
import { NetEasePlatform } from '../../platforms/NetEasePlatform';
import { GetBiliBiliAccount } from '../../Account/BiliBili/GetBiliBili';
import { BiliBiliSettings } from '../../settings/bilibiliSettings/BiliBiliSettings';
import { NetEaseSettings } from '../../settings/neteaseSettings/NetEaseSettings';
import { About } from '../../platforms/About';

interface MediaContainerProps
{
    CategoriesIndex: number;
    needOutFromMultiPage: boolean;
    needOutFromSettings: boolean;
    ShowOrHideIMC: () => Promise<void>;
}

export interface MediaContainerState
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
    currentSubNavBarAction: () => void;
    currentOnDemandPlay: (platformData: PlatformData) => void;
}

export interface OldItems
{
    mediaData: Promise<{ platformData: PlatformData[], totalPage: number }> | null;
    allMediaData: PlatformData[];
    SubNavBarAction: () => void;
    OnDemandPlay: (platformData: PlatformData) => void;
    totalPage: number;
    currentPage: number;
}

export interface Platform
{
    title: string;
    iconsrc: string;
    color: string;
    collectable: boolean;
    subNavBarItems: {
        title: string;
        class?: string;
        searchAction: () => void;
    }[];
}

export interface Categories
{
    platform: Platform[];
}

export class MediaContainer extends Component<MediaContainerProps, MediaContainerState>
{
    static contextType = MediaContainerContext;

    bilibiliPlatform = new BilibiliPlatform();
    private itemsPerPage = 10

    constructor(props: MediaContainerProps)
    {
        super(props);
    }

    componentDidUpdate(prevProps: Readonly<MediaContainerProps>, prevState: Readonly<MediaContainerState>, snapshot?: any): void
    {
        const { needOutFromMultiPage, needOutFromSettings } = this.props;
        const { settingsData, isCurrentInMultiPage, oldItems, mediaData, allMediaData, totalPage } = this.state;

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
    }

    render()
    {
        const { CategoriesIndex, ShowOrHideIMC } = this.props;
        const { PlatformIndex, mediaData, settingsData, searchKeyword, currentPage, totalPage, isCurrentInMultiPage, currentSubNavBarAction, currentOnDemandPlay } = this.state;
        const {
            changeSearchKeyword,
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
        };

        return (
            <Provider value={providerValue}>
                <div className='MediaContainerWrapper'>

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
                                            currentSubNavBarAction,
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
                            collectable={categoriesPlatform.collectable}
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
        currentSubNavBarAction: () => { },
        currentOnDemandPlay: (platformData: PlatformData) => { },
    };

    private controller = {
        /**
         * @description 更新搜索词
         * @param keyword 
         * @returns 
         */
        changeSearchKeyword: (keyword: string | null) =>
        {
            const { SubNavBarIndex } = this.state;
            if (keyword === null || keyword === '')
            {
                keyword = '';
                if (SubNavBarIndex === 0) return
                this.setState({ allMediaData: [] });
                this.setState({ mediaData: null });
                this.setState({ searchKeyword: keyword, currentPage: 1 });
            } else
            {
                this.setState({ allMediaData: [] });
                this.setState({ searchKeyword: keyword, currentPage: 1 });
            }

        },
        /**
         * @description 更新目前的页面
         * @param page 
         * @returns 
         */
        changecurrentPage: (page: number) =>
        {
            const updating = this.state.updating;
            if (updating) return;
            this.setState({ currentPage: page });
        },

        /**
         * @description 更新平台的子选项
         * @param current 
         * @param prev 
         */
        updateSubNavBarIndex: async (current: number, prev?: number) =>
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
                this.setState({ currentSubNavBarAction: this.bilibiliAction.BilibiliMultipageAction });
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
        }
    }

    private bilibiliAction = {
        bilibiliRefreshCount: 1,
        /**
         * @description 哔哩哔哩首页推荐
         */
        BilibiliRecommend: () =>
        {
            const data = this.bilibiliPlatform.getRecommendVideosBasicsData(
                this.bilibiliAction.bilibiliRefreshCount
            );
            const vod = this.bilibiliPlatform.VOD.bind(this.bilibiliPlatform);
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
        BiliBiliSearchVideoByKeyword: () =>
        {
            const {
                searchKeyword,
                allMediaData,
                currentPage,
                updating,
                totalPage
            } = this.state;

            // 如果search的时候，keyword是空的
            if (searchKeyword === '')
            {
                this.setState({ mediaData: null, totalPage: 0 });
                return;
            }

            // 如果有全部MediaData
            if ((allMediaData.length > 0 && allMediaData.length) && allMediaData.length >= currentPage * this.itemsPerPage) 
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
                let page = currentPage !== 1 ? Math.floor(allMediaData.length / 50) + 1 : 1;
                const bilibili = new BilibiliPlatform();
                const data = bilibili.searchForVideosBasicsData(searchKeyword, page);
                const vod = bilibili.VOD.bind(bilibili);

                this.setState({ mediaData: data, currentOnDemandPlay: vod.bind(bilibili) });

                data.then((res) =>
                {
                    if (this.state.requestToken !== currentRequestToken)
                    {
                        this.setState({ updating: false });
                        return
                    };

                    if (res.allPlatformData)
                    {
                        allMediaData.push(...res.allPlatformData);
                        this.setState({ allMediaData: allMediaData, updating: false });
                        this.setState({ totalPage: res.totalPage });
                    }
                });

            }
        },
        /**
         * @description 哔哩哔哩搜索直播
         * @returns 
         */
        BiliBiliSearchLiveByKeyword: () =>
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
                };

                this.setState({ totalPage: res.totalPage });
            });

        },
        /**
         * @description 哔哩哔哩多集页面
         */
        BilibiliMultipageAction: () =>
        {
            const { mediaData, allMediaData, currentPage, totalPage } = this.state;
            if (mediaData)
            {
                const vod = new BilibiliPlatform().VOD.bind(new BilibiliPlatform());
                // 计算起始和结束索引
                const startIndex = (currentPage - 1) * this.itemsPerPage;
                const endIndex = Math.min(startIndex + this.itemsPerPage, allMediaData.length);
                const currentPageData = allMediaData.slice(startIndex, endIndex);
                const mediaData = new Promise<{ platformData: PlatformData[], totalPage: number }>((resolve) => { resolve({ platformData: currentPageData, totalPage: totalPage }) });
                this.setState({
                    mediaData: mediaData,
                    currentOnDemandPlay: vod,
                    requestToken: +1
                });
            }
        }
    }

    private netEaseAction = {
        netEaseRecommendPlayList: () =>
        {
            const { allMediaData, totalPage, currentPage } = this.state;
            const currentRequestToken = this.state.requestToken + 1;
            const netease = new NetEasePlatform();
            if (allMediaData.length > 0)
            {
                const mlod = netease.MLOD.bind(netease);

                // 计算起始和结束索引
                const startIndex = (currentPage - 1) * this.itemsPerPage;
                const endIndex = Math.min(startIndex + this.itemsPerPage, allMediaData.length);

                const currentPageData = allMediaData.slice(startIndex, endIndex);

                const mediaData = new Promise<{ platformData: PlatformData[], totalPage: number }>((resolve) => { resolve({ platformData: currentPageData, totalPage: totalPage }) });

                this.setState({ mediaData: mediaData });
                this.setState({ currentOnDemandPlay: mlod });

            } else
            {
                const data = netease.searchForRecommendPlayListBasicsData();
                const mlod = netease.MLOD.bind(netease);

                this.setState({
                    mediaData: data,
                    currentOnDemandPlay: mlod,
                    requestToken: currentRequestToken
                });

                data.then((res) =>
                {
                    if (this.state.requestToken !== currentRequestToken)
                    {
                        return;
                    };
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
            const { searchKeyword, allMediaData, currentPage, totalPage } = this.state;
            const netease = new NetEasePlatform();
            const currentRequestToken = this.state.requestToken + 1;

            if (allMediaData.length > 0)
            {
                const MOD = netease.MOD.bind(netease);

                // 计算起始和结束索引

                const startIndex = (currentPage - 1) * this.itemsPerPage;
                const endIndex = Math.min(startIndex + this.itemsPerPage, allMediaData.length);

                const currentPageData = allMediaData.slice(startIndex, endIndex);

                const mediaData = new Promise<{ platformData: PlatformData[], totalPage: number }>((resolve) => { resolve({ platformData: currentPageData, totalPage: totalPage }) });

                this.setState({ mediaData: mediaData });
                this.setState({ currentOnDemandPlay: MOD });

            } else
            {
                if (searchKeyword === '')
                {
                    this.setState({ mediaData: null, totalPage: 0 });
                    return;
                }

                const page = currentPage;

                const data = netease.searchForMusicsBasicsData(searchKeyword, page);
                const MOD = netease.MOD.bind(netease);

                this.setState({
                    mediaData: data,
                    currentOnDemandPlay: MOD,
                    requestToken: currentRequestToken
                });

                data.then((res) =>
                {
                    if (this.state.requestToken !== currentRequestToken)
                    {
                        return;
                    };

                    this.setState({ allMediaData: res.allPlatformData, totalPage: res.totalPage });
                });
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
                    icon: 'iirose-media-web-account',
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
                    icon: 'iirose-media-web-video',
                    action: bilibiliSettings.setBilibiliVideoQuality.bind(bilibiliSettings)
                }, {
                    title: '点播的直播画质',
                    actionTitle: liveQualityInText,
                    icon: 'iirose-media-web-live',
                    action: bilibiliSettings.setBilibiliLiveQuality.bind(bilibiliSettings)
                }, {
                    title: '点播的直播播放时长',
                    actionTitle: `${streamMinutes} 分钟`,
                    icon: 'iirose-media-web-time',
                    action: bilibiliSettings.setBilibiliStreamSeconds.bind(bilibiliSettings)
                }, {
                    title: '点播视频的获取格式',
                    actionTitle: getVideoFormatInText,
                    icon: 'iirose-media-web-tech',
                    action: bilibiliSettings.setGetVideoFormat.bind(bilibiliSettings)

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

                const settingData: SettingData[] = [{
                    title: '音乐的音质',
                    actionTitle: qualityInText,
                    icon: 'iirose-media-web-music',
                    action: neteaseSettings.setNeteaseMusicQuality.bind(neteaseSettings)
                }]

                this.setState({ settingsData: settingData });
            }
        },
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
                    collectable: false,
                    subNavBarItems: [
                        {
                            title: '首页推荐',
                            searchAction: () =>
                            {
                                this.bilibiliAction.BilibiliRecommend()
                            }
                        },
                        {
                            title: '搜索视频',
                            class: 'search',
                            searchAction: () =>
                            {
                                this.bilibiliAction.BiliBiliSearchVideoByKeyword();
                            }
                        },
                        {
                            title: '搜索直播',
                            class: 'search',
                            searchAction: () =>
                            {
                                this.bilibiliAction.BiliBiliSearchLiveByKeyword();
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
                    collectable: true,
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
                    collectable: false,
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
                    collectable: false,
                    subNavBarItems: [
                        {
                            title: '音乐设置',
                            searchAction: () =>
                            {
                                this.settingsAction.netEase.neteaseMusicSetting();
                            }
                        }
                    ]
                }
            ]
        }, {
            platform: [
                {
                    title: '关于这个插件',
                    iconsrc: 'https://static.codemao.cn/i/24/9/19/21/1053-JU.png',
                    color: 'rgb(100, 149, 237)',
                    collectable: false,
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

