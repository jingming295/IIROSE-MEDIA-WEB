import { Component } from 'preact';
import { PlatformData } from "../../../platforms/interfaces";

interface MediaCardImgProps
{
    src: string;
    platformData: PlatformData;
}

export class MediaCardImg extends Component<MediaCardImgProps>
{
    render()
    {
        const { src, platformData } = this.props;
        let duration: string | null = null
        let type: string | null = null
        let infoArea = ''
        const trackCount = platformData.trackCount;

        if (platformData.duration)
        {
            duration = this.formatSecondsToMinutes(platformData.duration);
        }

        if (platformData.bilibili?.course_id)
        {
            type = '课程'
        } else if (platformData.bilibili?.bvid)
        {
            type = '视频'
        } else if (platformData.bilibiliLive)
        {
            type = '直播'
        } else if (platformData.neteaseMusic?.isSongList)
        {
            type = '歌单'
        } else if (platformData.neteaseMusic?.isAlbum)
        {
            type = '专辑'
        } else if (platformData.neteaseMusic?.isMV)
        {
            type = 'MV'
        } else if (platformData.neteaseMusic?.isDjRadios)
        {
            type = '电台'
        }
        else if (platformData.neteaseMusic)
        {
            type = '音乐'
        }

        if (type)
        {
            if (trackCount)
            {
                infoArea = `${type} / ${trackCount}首`
            }
            else if (duration)
            {
                infoArea = `${type} / ${duration}`
            } else
            {
                infoArea = type
            }
        }




        return (
            <div className="MediaCardImgCover">
                <img src={src} className="MediaCardImg" onClick={() => { window.open(platformData.websiteUrl || '') }} />
                <div className="MediaCardDuration">{`${infoArea}`}</div>
            </div>
        );
    }

    private formatSecondsToMinutes(seconds: number)
    {
        // 先将秒数四舍五入为整数
        const roundedSeconds = Math.round(seconds);

        // 计算分钟数
        const minutes = Math.floor(roundedSeconds / 60);
        // 计算剩余的秒数
        const remainingSeconds = roundedSeconds % 60;

        // 格式化分钟和秒数为两位数字
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(remainingSeconds).padStart(2, '0');

        // 返回 "xx:xx" 格式的字符串
        return `${formattedMinutes}:${formattedSeconds}`;
    }

}