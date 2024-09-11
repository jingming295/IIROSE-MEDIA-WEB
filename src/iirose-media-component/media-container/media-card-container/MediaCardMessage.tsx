import React from "react";
import { MediaContainerContext } from "../media-container-context/MediaContainerContext";

interface MediaCardMessageProps
{
    message: number;
}

export class MediaCardMessage extends React.Component<MediaCardMessageProps>
{
    static contextType = MediaContainerContext
    context!: React.ContextType<typeof MediaContainerContext>;

    render(): React.ReactNode
    {
        const { message } = this.props;

        const color = this.context.color;

        return (
            <div className={`MediaCardMessageWrapper`} style={{ color: color }} >
                {message === 0 && (
                    <>
                        <div className="noresultLogo"></div>
                        <div className="message">什么也没有搜到...</div>
                    </>
                )}
                {message === 1 && (
                    <div className="containerSpin"></div>
                )}
                {message === 2 && (
                    <>
                        <div className="searchLogo"></div>
                        <div className="message">请点击搜索图标进行搜索！</div>
                    </>
                )}
            </div>
        );
    }
}
