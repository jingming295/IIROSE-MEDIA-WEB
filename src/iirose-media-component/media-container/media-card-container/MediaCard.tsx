import { Component } from 'preact';
import { MediaCardImg } from "./MediaCardImg";
import { MediaCardInfo } from "./MediaCardInfo";
import { MediaCardButton } from "./MediaCardButton";
import { MediaCardMessage } from "./MediaCardMessage";
import { PlatformData } from "../../../platforms/interfaces";
import { SettingData } from "../../../settings/interfaces";
import { SettingsCard } from "./SettingsCard";

interface MediaCardProps
{
    mediaData: Promise<{ platformData: PlatformData[], totalPage: number }> | null
    settingsData: SettingData[] | null;
    collectable: boolean;
}

interface MediaCardState
{
    data: { platformData: PlatformData[], totalPage: number } | null;
    loading: boolean;
    error: string | null;
    requestId: number;
}


export class MediaCard extends Component<MediaCardProps, MediaCardState>
{
    private requestId: number = 0; // 初始化请求 ID

    constructor(props: MediaCardProps)
    {
        super(props);
        this.state = {
            data: null,
            loading: true,
            error: null,
            requestId: 0, // 初始化请求 ID
        };
    }

    async componentDidUpdate(prevProps: MediaCardProps)
    {
        if (this.props.settingsData !== prevProps.settingsData)
        {
            return;
        }

        if (this.props.mediaData !== prevProps.mediaData)
        {
            // 生成新的请求 ID
            const newRequestId = ++this.requestId;
            this.setState({ loading: true, requestId: newRequestId });
            try
            {
                const data = await this.props.mediaData;
                // 只有当请求 ID 匹配时才更新状态
                if (this.state.requestId === newRequestId)
                {
                    this.setState({ data, loading: false });
                }
            } catch (error)
            {
                if (this.state.requestId === newRequestId)
                {
                    this.setState({ error: "Failed to load data", loading: false });
                }
            }
        }
    }

    async componentDidMount()
    {
        if (this.props.mediaData)
        {
            // 生成新的请求 ID
            const newRequestId = ++this.requestId;
            try
            {
                const data = await this.props.mediaData;
                // 只有当请求 ID 匹配时才更新状态
                if (this.state.requestId === newRequestId)
                {
                    this.setState({ data, loading: false });
                }
            } catch (error)
            {
                if (this.state.requestId === newRequestId)
                {
                    this.setState({ error: "Failed to load data", loading: false });
                }
            }
        } else
        {
            this.setState({ loading: false });
        }
    }

    render(): JSX.Element
    {
        const { data, loading, error } = this.state;
        const { collectable, settingsData } = this.props;
        if (settingsData)
        {
            return (
                <div className='MediaCardContainer'>
                    {
                        settingsData.map((item, index) => (
                            <div className='SettingsCard' key={index}>
                                <div className="titleWrapper">
                                    <div className={`titleIcon ${item.icon}`}></div>
                                    <div className='title'>{item.title}</div>
                                </div>
                                < SettingsCard settingsData={item} />
                            </div>
                        ))
                    }
                </div>
            )
        }


        if (loading)
        {
            return <div className='MediaCardContainer' style={{ height: `100%` }}>
                <MediaCardMessage message={1} />
            </div>;
        }

        if (error)
        {
            return <div className='MediaCardContainer' style={{ height: `100%` }}>
                <MediaCardMessage message={0} />
            </div>;
        }

        if (!data)
        {
            return <div className='MediaCardContainer' style={{ height: `100%` }}>
                <MediaCardMessage message={2} />
            </div>;
        }
        if (data.platformData.length === 0)
        {
            return <div className='MediaCardContainer' style={{ height: `100%` }}>
                <MediaCardMessage message={0} />
            </div>;
        }

        return (
            <div className='MediaCardContainer'>
                {data.platformData.map((item, index) => (
                    <div className='MediaCard' key={index}>
                        <MediaCardImg src={item.coverImg} platformData={item} />
                        <MediaCardInfo platformData={item} collectable={collectable} />
                        <MediaCardButton
                            platformData={item}
                        />
                    </div>
                ))}
            </div>
        );
    }
}
