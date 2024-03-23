import { Lyric } from "../../Api/NeteaseAPI/NeteaseMusic/SongList";

export class NeteaseLyric{

    /**
     * 原版歌词+中文翻译
     * @param lyric 
     * @returns 
     */
    public originalAndTranslatedLyric(lyric:Lyric){
        if(!lyric.lrc || !lyric.tlyric) return '';
        const jpLines = lyric.lrc.lyric.split('\n');
        const cnLines = lyric.tlyric.lyric.split('\n');
    
        const jpEntries: { [key: string]: string } = {};
        const cnEntries: { [key: string]: string } = {};
    
        // Parse Japanese lyrics
        for (const line of jpLines) {
            const timeRegex = /\[(\d+:\d+\.\d+)\]/;
            const timeMatch = line.match(timeRegex);
            if (timeMatch) {
                const time = timeMatch[1];
                const content = line.replace(timeRegex, '').trim();
                jpEntries[time] = content;
            }
        }
    
        // Parse Chinese lyrics
        for (const line of cnLines) {
            const timeRegex = /\[(\d+:\d+\.\d+)\]/;
            const timeMatch = line.match(timeRegex);
            if (timeMatch) {
                const time = timeMatch[1];
                const content = line.replace(timeRegex, '').trim();
                cnEntries[time] = content;
            }
        }
    
        // Merge and format
        const mergedLines: { time: string; content: string; translation: string }[] = [];
        for (const time in jpEntries) {
            const jpContent = jpEntries[time];
            const cnContent = cnEntries[time] || ''; // Use empty string if no translation
    
            mergedLines.push({ time, content: jpContent, translation: cnContent });
        }
    
        // Format the merged lines
        const mergedOutput = mergedLines.map(line => {
            const { time, content, translation } = line;
            let outputLine = `[${time}] ${content}`;
            if (translation) {
                outputLine += ` | ${translation}`;
            }
            return outputLine;
        }).join('\n');
    
        return mergedOutput;
    }

}