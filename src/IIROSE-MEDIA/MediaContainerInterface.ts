export interface MediaContainerNavBarPlatform{
    id: string;
    title: string;
    iconsrc: string;
    buttonBackgroundColor: string;
    subNavBarItems: MediaContainerSubNavBarItem[];
    inputEvent: InputEvent;
}

interface MediaContainerSubNavBarItem{
    title: string;
    class?: string;
    id: string;
    onclick: () => void;
    item?: Promise<Promise<MediaContainerItem[] | null>[] | null>;

}

export interface MediaContainerItem{
    formatMillisecondsToMinutes?(arg0: number): string | undefined;
    id: number;
    title: string;
    img: string;
    url?: string;
    author: Promise<string> | string;
    duration: string;
    multipage?:Promise<boolean>;
    MediaRequest?: () => void;
}

export interface InputEvent{
    title: string;
    InputAreaConfirmBtnOnClick: () => void;
}

export interface MediaItem{
    id: number;
    keyword?: string;
    title?: string;
    img?: string;
    url?: string;
    author?: string;
    duration?: string;
    bilibili?: {
        bvid?: string;
        cid?: number;
    }
}