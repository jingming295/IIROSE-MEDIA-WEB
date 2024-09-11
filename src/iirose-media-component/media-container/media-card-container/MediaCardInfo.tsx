import React from "react";
import { PlatformData } from "../../../platforms/interfaces";

interface MediaCardInfoProps
{
    platformData: PlatformData;
    collectable: boolean;
}

export class MediaCardInfo extends React.Component<MediaCardInfoProps>
{
    render(): JSX.Element
    {
        const { platformData, collectable } = this.props;

        return (
            <div className="MediaCardInfoContainer">
                {collectable && (
                    <div className="collectIcomWrapper">
                        <div className="addFavoriteIcon"></div>
                        <div className="collectText">收藏</div>
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
}
