interface OldItems
{
    mediaData: Promise<{ platformData: PlatformData[], totalPage: number }> | null;
    allMediaData: PlatformData[];
    SubNavBarAction: () => void;
    OnDemandPlay: (platformData: PlatformData) => void;
    totalPage: number;
    currentPage: number;
}

interface Platform
{
    title: string;
    iconsrc: string;
    color: string;
    subNavBarItems: {
        title: string;
        class?: string;
        searchAction: () => void;
    }[];
}

interface Categories
{
    platform: Platform[];
}