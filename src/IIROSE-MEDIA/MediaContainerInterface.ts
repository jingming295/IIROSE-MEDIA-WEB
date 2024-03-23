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
    id: string;
    onclick: () => void;
    item?: Promise<Promise<MediaContainerItem[] | null>[] | null>;

}

export interface MediaContainerItem{
    id: number;
    title: string;
    img: string;
    url?: string;
    author: Promise<string> | string;
    duration: string;
    MediaRequest?: () => void;
}

export interface InputEvent{
    title: string;
    InputAreaConfirmBtnOnClick: () => void;
}