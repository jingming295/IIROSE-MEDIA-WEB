import { Component } from 'preact';
import { IMCNavigationBar } from './IMCNavigationBar';
import { MediaContainer } from './media-container/MediaContainer';

interface IMCState
{
    CategoriesIndex: number;
    needOutFromMultiPage: boolean;
    needOutFromSettings: boolean;
}

interface IMCProps
{
    ShowOrHideIMC: () => Promise<void>;
    searchKeyword: string;
    changeSearchKeyword: (keyword: string | null) => void
    active: boolean;

}

export class IMC extends Component<IMCProps, IMCState>
{
    state = {
        CategoriesIndex: 0,
        needOutFromMultiPage: false,
        needOutFromSettings: false,
    }

    itemsPerPage = 10;

    componentDidUpdate(prevProps: Readonly<IMCProps>, prevState: Readonly<IMCState>): void
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
        const { searchKeyword, active, changeSearchKeyword } = this.props;
        return (
            <div className='IIROSE_MEDIA' id='IIROSE_MEDIA'>
                <IMCNavigationBar
                    switchPlatforms={this.switchPlatforms}
                    ShowOrHideIMC={this.props.ShowOrHideIMC}
                />
                <MediaContainer
                    CategoriesIndex={CategoriesIndex}
                    needOutFromMultiPage={needOutFromMultiPage}
                    needOutFromSettings={needOutFromSettings}
                    ShowOrHideIMC={this.props.ShowOrHideIMC}
                    searchKeyword={searchKeyword}
                    changeSearchKeyword={changeSearchKeyword}
                    active={active}
                />
            </div>
        );
    }

    // Method to switch categories
    protected switchPlatforms = async (index: number) =>
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



