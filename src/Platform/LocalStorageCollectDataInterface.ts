export interface x{
    platform:{
        platformStorageName: string;
        foldName: string[];
    }[ ]
}

export interface LSMediaCollectData{
    id: number;
    title: string;
    subTitle?: string;
    img: string;
    url: string;
    author: string;
    duration: string;
    multipage?:boolean;
    collect: {
        collectFolder: string;
        lsKeyWord: string;
    };
}