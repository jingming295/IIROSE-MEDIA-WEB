import { Component } from 'preact';

interface MediaCardImgProps
{
    src: string | Promise<string>;
    platformData: PlatformData;
}

interface MediaCardImgState
{
    displaySrc: string;
}

export class MediaCardImg extends Component<MediaCardImgProps, MediaCardImgState>
{
    // 初始状态：使用一个透明占位图或 Loading 图
    state: MediaCardImgState = {
        displaySrc: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    };

    constructor(props: MediaCardImgProps)
    {
        super(props);
        this.resolveSrc(props.src);
    }

    // 当 Props 改变（比如搜索了新关键词）时重新解析
    componentWillReceiveProps(nextProps: MediaCardImgProps)
    {
        if (nextProps.src !== this.props.src)
        {
            this.resolveSrc(nextProps.src);
        }
    }

    private resolveSrc(src: string | Promise<string>)
    {
        if (typeof src === 'string')
        {
            this.setState({ displaySrc: src });
        } else if (src instanceof Promise)
        {
            src.then(url =>
            {
                if (url) this.setState({ displaySrc: url });
            }).catch(() =>
            {
                // 失败逻辑：可以设为默认图
                this.setState({ displaySrc: '你的默认图地址' });
            });
        }
    }

    render()
    {
        const { platformData } = this.props;
        const { displaySrc } = this.state;

        let duration: string | null = null;
        let type: string | null = null;
        let infoArea = '';
        const trackCount = platformData.trackCount;

        if (platformData.duration)
        {
            duration = this.formatSecondsToMinutes(platformData.duration);
        }

        // --- 类型判断逻辑保持不变 ---
        if (platformData.bilibili?.course_id)
        {
            type = '课程';
        } else if (platformData.bilibili?.bvid)
        {
            type = '视频';
        } else if (platformData.bilibiliLive)
        {
            type = '直播';
        } else if (platformData.neteaseMusic?.isSongList)
        {
            type = '歌单';
        } else if (platformData.neteaseMusic?.isAlbum)
        {
            type = '专辑';
        } else if (platformData.neteaseMusic?.isMV)
        {
            type = 'MV';
        } else if (platformData.neteaseMusic?.isDjRadios)
        {
            type = '电台';
        } else if (platformData.neteaseMusic)
        {
            type = '音乐';
        } else if (platformData.joox?.isSong)
        {
            type = '音乐';
        } else if (platformData.radio?.isradio)
        {
            type = '电台';
        } else if (platformData.subtitle)
        {
            // 兼容你之前的“茅台资源”副标题作为类型展示
            type = platformData.subtitle;
        }

        if (type)
        {
            if (trackCount)
            {
                infoArea = `${type} / ${trackCount}首`;
            } else if (duration)
            {
                infoArea = `${type} / ${duration}`;
            } else
            {
                infoArea = type;
            }
        }

        // 判断是否还在加载中（如果是 data 开头则是占位图）
        const isLoading = displaySrc.startsWith('data');

        return (
            <div className="MediaCardImgCover">
                <img
                    src={displaySrc}
                    className={`MediaCardImg ${isLoading ? 'MediaCardImg-loading' : 'MediaCardImg-loaded'}`}
                    onClick={() => { window.open(platformData.websiteUrl || '') }}
                    style={{
                        transition: 'opacity 0.3s ease',
                        opacity: isLoading ? 0.5 : 1,
                        backgroundColor: '#1a1a1a' // 没图时的背景色
                    }}
                />
                <div className="MediaCardDuration">{`${infoArea}`}</div>
            </div>
        );
    }

    private formatSecondsToMinutes(seconds: number)
    {
        const roundedSeconds = Math.round(seconds);
        const minutes = Math.floor(roundedSeconds / 60);
        const remainingSeconds = roundedSeconds % 60;
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(remainingSeconds).padStart(2, '0');
        return `${formattedMinutes}:${formattedSeconds}`;
    }
}