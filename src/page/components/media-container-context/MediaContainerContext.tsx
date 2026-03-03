import { createContext } from 'preact';

export const MediaContainerContext = createContext({
    color: '',
    switchToMultiPage: (platformData: PlatformData, isCurrentInMultiPage?: boolean) => { platformData; isCurrentInMultiPage },
    currentOnDemandPlay: (platformData: PlatformData) => { platformData },
    updateCurrentInMultiPageStatus: (isCurrentInMultiPage: boolean) => { isCurrentInMultiPage },
    ShowOrHideIMC: () => { },
});

const { Provider, Consumer } = MediaContainerContext;

export { Provider, Consumer }