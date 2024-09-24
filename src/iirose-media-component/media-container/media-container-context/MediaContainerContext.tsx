import { createContext } from 'preact';
import { PlatformData } from '../../../platforms/interfaces';

export const MediaContainerContext = createContext({
    color: '',
    switchToMultiPage: (platformData: PlatformData, isCurrentInMultiPage?: boolean) => { },
    currentOnDemandPlay: (platformData: PlatformData) => { },
    updateCurrentInMultiPageStatus: (isCurrentInMultiPage: boolean) => { },
    ShowOrHideIMC: () => { },
});

const { Provider, Consumer } = MediaContainerContext;

export { Provider, Consumer }