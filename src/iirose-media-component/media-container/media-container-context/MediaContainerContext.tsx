import React, { Component } from 'react';
import { PlatformData } from '../../../platforms/interfaces';

export const MediaContainerContext = React.createContext({
    color: '',
    switchToMultiPage: (platformData: PlatformData, isCurrentInMultiPage?: boolean) => { },
    currentOnDemandPlay: (platformData: PlatformData) => { },
    updateCurrentInMultiPageStatus: (isCurrentInMultiPage: boolean) => { },
});

const { Provider, Consumer } = MediaContainerContext;

export { Provider, Consumer };