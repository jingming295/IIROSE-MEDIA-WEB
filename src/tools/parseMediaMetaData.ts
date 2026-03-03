export class ParseMediaMetaData
{
    /**
     * 前端版：获取 m3u8 总时长
     */
    public static async getM3U8Duration(url: string): Promise<number>
    {
        try
        {
            const response = await fetch(url);
            if (!response.ok) return 0;

            const text = await response.text();

            // 1. 判断是否是二级嵌套索引 (Master Playlist)
            if (text.includes("#EXT-X-STREAM-INF"))
            {
                const lines = text.split('\n');
                let subUrl = "";
                for (let i = 0; i < lines.length; i++)
                {
                    if (lines[i].includes(".m3u8"))
                    {
                        subUrl = lines[i].trim();
                        break;
                    }
                }

                if (subUrl)
                {
                    // 拼接绝对路径
                    const fullSubUrl = subUrl.startsWith('http')
                        ? subUrl
                        : new URL(subUrl, url).href;
                    return await this.getM3U8Duration(fullSubUrl);
                }
            }

            // 2. 累加时长
            return this.processM3U8Text(text);
        } catch (e)
        {
            console.error("解析m3u8时长失败", e);
            return 0;
        }
    }

    private static processM3U8Text(text: string): number
    {
        let total = 0;
        const lines = text.split('\n');
        for (const line of lines)
        {
            if (line.startsWith('#EXTINF:'))
            {
                // 处理类似 #EXTINF:10.000, 或 #EXTINF:9.082
                const durationPart = line.substring(8).split(',')[0];
                const d = parseFloat(durationPart);
                if (!isNaN(d)) total += d;
            }
        }
        return total;
    }

    /**
     * 前端版：获取普通音频文件 (MP3/OGG/WAV) 的时长
     */
    public static getAudioDuration = (url: string): Promise<number> =>
    {
        return new Promise((resolve) =>
        {
            const audio = new Audio();

            // 这一步很关键：静音并尝试仅加载元数据
            audio.muted = true;
            audio.preload = 'metadata';
            audio.src = url;

            // 当元数据加载完成时获取时长
            audio.onloadedmetadata = () =>
            {
                const duration = audio.duration;
                // 清理对象释放内存
                audio.src = '';
                audio.load();
                resolve(isNaN(duration) ? 0 : duration);
            };

            // 如果加载出错
            audio.onerror = () =>
            {
                console.error("解析音频时长失败", url);
                resolve(0);
            };

            // 设置超时，防止某些链接由于 CORS 或响应慢挂死
            setTimeout(() => resolve(0), 10000);
        });
    };

}