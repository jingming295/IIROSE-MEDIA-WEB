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
    currentSubNavBarAction: () => void;
    currentOnDemandPlay: (platformData: PlatformData) => void;
}

interface MainAppContainerActionContext
{
    getState: () => MainAppContainerState;
    setState: (state: Partial<MainAppContainerState>) => void;
    // 如果需要调用其他控制器方法
    pushAllData: (token: number, data: PlatformData[], total: number) => void;
}

interface BilibiliActionContext extends MainAppContainerActionContext
{
    getRefreshCount: () => number;
    incrementRefreshCount: () => void;
}
