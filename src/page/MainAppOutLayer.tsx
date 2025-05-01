import { Component } from 'preact';
import { MainNavigationBar } from './components/navigationBar/main/IMCNavigationBar';
import { MediaContainer } from '../iirose-media-component/media-container/MediaContainer';

interface MainAppOutLayerState
{
    CategoriesIndex: number;
    needOutFromMultiPage: boolean;
    needOutFromSettings: boolean;
}

interface MainAppOutLayerProps
{
    ShowHideMainApp: () => Promise<void>;
    searchKeyword: string;
    changeSearchKeyword: (keyword: string | null) => void
    mainAppDisplay: boolean;

}

export class MainAppOutLayer extends Component<MainAppOutLayerProps, MainAppOutLayerState>
{
    state = {
        CategoriesIndex: 0,
        needOutFromMultiPage: false,
        needOutFromSettings: false,
    }

    itemsPerPage = 10;

    componentDidUpdate(_prevProps: Readonly<MainAppOutLayerProps>, prevState: Readonly<MainAppOutLayerState>): void
    {
        const { needOutFromMultiPage, CategoriesIndex } = this.state;
        if (CategoriesIndex !== prevState.CategoriesIndex)
        {
            this.setState({ needOutFromMultiPage: true });
        } else if (needOutFromMultiPage)
        {
            this.setState({ needOutFromMultiPage: false })
        }

    }

    render()
    {
        const { CategoriesIndex, needOutFromMultiPage, needOutFromSettings } = this.state;
        const { searchKeyword, mainAppDisplay, changeSearchKeyword } = this.props;
        return (
            <div className='IIROSE_MEDIA' id='IIROSE_MEDIA'>
                <MainNavigationBar
                    switchPage={this.switchPage}
                    ShowHideMainApp={this.props.ShowHideMainApp}
                />
                <MediaContainer
                    CategoriesIndex={CategoriesIndex}
                    needOutFromMultiPage={needOutFromMultiPage}
                    needOutFromSettings={needOutFromSettings}
                    ShowOrHideIMC={this.props.ShowHideMainApp}
                    searchKeyword={searchKeyword}
                    changeSearchKeyword={changeSearchKeyword}
                    active={mainAppDisplay}
                />
            </div>
        );
    }

    /**
     * 
     * @param index 0: 视频 1: 音乐 2: 设置 3: 关于
     */
    protected switchPage = async (index: number) =>
    {
        await this.setState({ CategoriesIndex: index });
        if (index !== 2 && index !== 3)
        {
            this.setState({ needOutFromSettings: true });
        } else if (this.state.needOutFromSettings)
        {
            this.setState({ needOutFromSettings: false });
        }

    }
}



