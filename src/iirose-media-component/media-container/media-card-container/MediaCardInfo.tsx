import { Component } from 'preact';
import { PlatformData } from "../../../platforms/interfaces";

interface MediaCardInfoProps
{
    platformData: PlatformData;
    collectable: boolean;
}

export class MediaCardInfo extends Component<MediaCardInfoProps>
{
    render()
    {
        const { platformData, collectable } = this.props;

        const { collected } = this.state;

        return (
            <div className="MediaCardInfoContainer">
                {collectable && (
                    <div className="collectIcomWrapper" onClick={this.switchCollect}>
                        <div className={`addFavoriteIcon ${collected ? 'addedFavoriteIcon' : ''}`}></div>
                        <div className={`collectText ${collected ? 'collectedText' : ''}`}>收藏</div>
                    </div>
                )}

                {platformData.title && (
                    <div className="MediaCardInfoTitleWrapper">
                        <div className="MediaCardInfoTitle">{platformData.title}</div>
                        {platformData.subtitle && (
                            <div className="MediaCardInfoSubTitle">{platformData.subtitle}</div>
                        )}
                    </div>
                )}

                <div className="MediaCardInfoAuthor">{platformData.author || ""}</div>
            </div>
        );
    }

    switchCollect = () =>
    {
        console.log(1)
        const { collected } = this.state;
        this.setState({ collected: !collected });
    }

    state = {
        collected: false,
    }
}
