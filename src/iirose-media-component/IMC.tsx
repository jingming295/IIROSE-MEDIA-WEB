import { Component } from 'preact';
import { IMCNavigationBar } from './IMCNavigationBar';
import { MediaContainer } from './media-container/MediaContainer';

interface IMCState
{
    CategoriesIndex: number;
    needOutFromMultiPage: boolean;
    needOutFromSettings: boolean;
}

export class IMC extends Component<{}, IMCState>
{
    state = {
        CategoriesIndex: 0,
        needOutFromMultiPage: false,
        needOutFromSettings: false,
    }

    itemsPerPage = 10;

    componentDidUpdate(prevProps: Readonly<{}>, prevState: Readonly<IMCState>, snapshot?: any): void
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

        return (
            <div className='IIROSE_MEDIA' id='IIROSE_MEDIA'>
                <IMCNavigationBar switchPlatforms={this.switchPlatforms} />
                <MediaContainer
                    CategoriesIndex={CategoriesIndex}
                    needOutFromMultiPage={needOutFromMultiPage}
                    needOutFromSettings={needOutFromSettings}
                />
            </div>
        );
    }

    // Method to switch categories
    protected switchPlatforms = async (index: number) =>
    {
        await this.setState({ CategoriesIndex: index });

        if (index !== 2)
        {
            this.setState({ needOutFromSettings: true });
        } else if (this.state.needOutFromSettings)
        {
            this.setState({ needOutFromSettings: false });
        }

    };
}



