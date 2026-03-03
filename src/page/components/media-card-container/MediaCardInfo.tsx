import { Component } from 'preact';

interface MediaCardInfoProps
{
    platformData: PlatformData;
}

export class MediaCardInfo extends Component<MediaCardInfoProps>
{
    render()
    {
        const { platformData } = this.props;
        return (
            <div className="MediaCardInfoContainer">

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

    state = {
        collected: false,
    }
}
