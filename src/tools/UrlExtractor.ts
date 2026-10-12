import { SendFetch } from "../Api";
import { ParseMediaMetaData } from "./parseMediaMetaData";

declare const GM_xmlhttpRequest: any;

export interface ExtractedUrlInfo {
    url: string;
    titleHint?: string;
    originalInput: string;
}

export interface DirectMediaProbeResult {
    isMedia: boolean;
    type?: 'music' | 'video';
    duration?: number;
    timedOut?: boolean;
}

export class UrlExtractor {
    /**
     * 常见音视频扩展名正则
     */
    private static audioExtRegex = /\.(mp3|wav|m4a|ogg|flac|aac|weba)(?:[\?#].*)?$/i;
    private static videoExtRegex = /\.(mp4|m3u8|webm|flv|mov|mkv)(?:[\?#].*)?$/i;

    /**
     * 从用户输入的 @ 文本中提取 URL 及可能的标题提示
     */
    public static extract(input: string): ExtractedUrlInfo | null {
        if (!input || !input.startsWith('@')) return null;

        const raw = input.slice(1).trim();
        if (!raw) return null;

        // 尝试从分享文案中提取标题线索（如【标题】或《歌名》或 分享歌单: xxx）
        let titleHint: string | undefined;
        const btitleMatch = raw.match(/【([^】]+)】/);
        if (btitleMatch) {
            titleHint = btitleMatch[1].replace(/#.*$/, '').trim();
        } else {
            const neteaseSongMatch = raw.match(/《([^》]+)》/);
            if (neteaseSongMatch) {
                titleHint = neteaseSongMatch[1].trim();
            } else {
                const playlistMatch = raw.match(/分享歌单:\s*([^https?:]+)/i);
                if (playlistMatch) {
                    titleHint = playlistMatch[1].trim();
                }
            }
        }

        // 1. 优先匹配带协议的 http/https URL
        const urlMatch = raw.match(/https?:\/\/[^\s"'<>\u4e00-\u9fa5\)\]\}（）《》【】“”‘’，。！？：]+/i);
        if (urlMatch) {
            let url = urlMatch[0];
            // 清理末尾可能误匹配的中英文标点符号
            url = url.replace(/[\)\]\}\>,\.;（）《》【】“”‘’，。！？：]+$/, '');
            return {
                url,
                titleHint,
                originalInput: input
            };
        }

        // 2. 匹配未带协议但以知名域名开头的 URL（如 bilibili.com/... 或 music.163.com/...）
        const domainMatch = raw.match(/(?:www\.)?(?:bilibili\.com|b23\.tv|music\.163\.com|163cn\.tv)[^\s"'<>\u4e00-\u9fa5\)\]\}（）《》【】“”‘’，。！？：]+/i);
        if (domainMatch) {
            let url = domainMatch[0].replace(/[\)\]\}\>,\.;（）《》【】“”‘’，。！？：]+$/, '');
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = `https://${url}`;
            }
            return {
                url,
                titleHint,
                originalInput: input
            };
        }

        return null;
    }

    /**
     * 判断是否是显式音频扩展名
     */
    public static isAudioExtension(url: string): boolean {
        const cleanPath = url.split('?')[0].split('#')[0];
        return this.audioExtRegex.test(cleanPath);
    }

    /**
     * 判断是否是显式视频扩展名
     */
    public static isVideoExtension(url: string): boolean {
        const cleanPath = url.split('?')[0].split('#')[0];
        return this.videoExtRegex.test(cleanPath);
    }

    /**
     * 从 URL 提取文件名作为默认标题
     */
    public static getFilenameFromUrl(urlStr: string): string {
        try {
            const u = new URL(urlStr);
            const segments = u.pathname.split('/').filter(Boolean);
            if (segments.length > 0) {
                const last = decodeURIComponent(segments[segments.length - 1]);
                const dotIdx = last.lastIndexOf('.');
                return dotIdx > 0 ? last.slice(0, dotIdx) : last;
            }
        } catch {
            // ignore
        }
        return "直链媒体";
    }

    /**
     * 获取当前有效 CORS 代理地址（优先动态环境配置）
     */
    public static getCorsUrl(): string {
        if (typeof window !== 'undefined' && (window as any).iirosemedia?.cors) {
            return (window as any).iirosemedia.cors;
        }
        return SendFetch.cors;
    }

    /**
     * 探测直链媒体类型与元数据（带超时时间）
     */
    public static async probeDirectMedia(url: string, timeoutMs: number = 8000): Promise<DirectMediaProbeResult> {
        // 1. 显式扩展名判断
        if (this.isAudioExtension(url)) {
            const duration = await ParseMediaMetaData.getAudioDuration(url);
            return { isMedia: true, type: 'music', duration };
        }
        if (this.isVideoExtension(url)) {
            let duration = 0;
            if (url.includes('.m3u8')) {
                duration = await ParseMediaMetaData.getM3U8Duration(url);
            } else {
                duration = await ParseMediaMetaData.getVideoDuration(url);
            }
            return { isMedia: true, type: 'video', duration };
        }

        // 2. 无扩展名直链：发起 HEAD 请求探测 Content-Type
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const cors = this.getCorsUrl();
            const fullUrl = `${cors}${encodeURIComponent(url)}`;
            const response = await fetch(fullUrl, {
                method: 'HEAD',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response || !response.ok) {
                return { isMedia: false };
            }

            const contentType = response.headers.get('content-type') || '';
            if (contentType.startsWith('audio/')) {
                const duration = await ParseMediaMetaData.getAudioDuration(url);
                return { isMedia: true, type: 'music', duration };
            }
            if (contentType.startsWith('video/') || contentType.includes('mpegurl') || contentType.includes('m3u8')) {
                let duration = 0;
                if (contentType.includes('mpegurl') || contentType.includes('m3u8')) {
                    duration = await ParseMediaMetaData.getM3U8Duration(url);
                } else {
                    duration = await ParseMediaMetaData.getVideoDuration(url);
                }
                return { isMedia: true, type: 'video', duration };
            }

            return { isMedia: false };
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error?.name === 'AbortError') {
                return { isMedia: false, timedOut: true };
            }
            return { isMedia: false };
        }
    }

    /**
     * 追踪短链（b23.tv / 163cn.tv）重定向并获取真实目标 URL
     */
    public static async resolveShortUrl(url: string): Promise<string> {
        // 1. 如果在 Tampermonkey / 油猴环境下运行，首选 GM_xmlhttpRequest（直接绕过任何 CORS 阻断）
        const gmXhr = (typeof GM_xmlhttpRequest !== 'undefined' ? GM_xmlhttpRequest : null) ||
                      ((window as any).GM_xmlhttpRequest) ||
                      ((parent as any)?.GM_xmlhttpRequest);

        if (typeof gmXhr === 'function') {
            try {
                const resolved = await new Promise<string>((resolve, reject) => {
                    gmXhr({
                        method: 'GET',
                        url: url,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
                        },
                        onload: (res: any) => {
                            if (res.finalUrl && res.finalUrl !== url) {
                                resolve(res.finalUrl);
                                return;
                            }
                            const locMatch = res.responseHeaders?.match(/location:\s*([^\r\n]+)/i);
                            if (locMatch) {
                                resolve(locMatch[1].trim());
                                return;
                            }
                            resolve(res.finalUrl || url);
                        },
                        onerror: (err: any) => reject(err),
                        ontimeout: () => reject(new Error('GM_xmlhttpRequest timeout'))
                    });
                });
                if (resolved && resolved !== url) {
                    return resolved;
                }
            } catch (e) {
                console.warn('[UrlExtractor] GM_xmlhttpRequest resolve error:', e);
            }
        }

        // 2. 如果是 b23.tv 短链，尝试社区 b23.wtf 直解服务作为轻量兜底
        if (url.includes('b23.tv/')) {
            try {
                const wtfUrl = url.replace('b23.tv/', 'b23.wtf/');
                const res = await fetch(wtfUrl, { signal: AbortSignal.timeout(4000) });
                if (res.ok) {
                    const text = await res.text();
                    const cleanUrl = text.trim();
                    if (cleanUrl.startsWith('http')) {
                        return cleanUrl;
                    }
                }
            } catch {
                // ignore
            }
        }

        // 3. 走项目配置的腾讯云 CORS 代理追踪重定向
        try {
            const cors = this.getCorsUrl();
            const targetUrl = `${cors}${encodeURIComponent(url)}`;
            const res = await fetch(targetUrl, { signal: AbortSignal.timeout(5000) });
            const html = await res.text();
            // 腾讯云反代 302 时返回的响应体格式为 <a href="目标长链">Found</a>
            const hrefMatch = html.match(/<a\s+href="([^"]+)">/i);
            if (hrefMatch) {
                return hrefMatch[1].replace(/&amp;/g, '&');
            }
            if (res.url && res.url !== targetUrl) {
                return res.url;
            }
        } catch (e) {
            console.warn('[UrlExtractor] CORS proxy resolve error:', e);
        }

        return url;
    }
}
