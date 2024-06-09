export interface BilibiliSetting{
    qn: number,
    streamqn: number,
    streamSeconds: number,
    getVideoStreamFormat: number,
}

export interface NeteaseSetting{
    quality: 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires' | 'jyeffect' | 'sky' | 'jymaster';
}