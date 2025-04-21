interface MVPlayURLData
{
    code: number;
    data?: {
        code: number;
        expi: number;
        fee: number;
        id: number;
        md5: string;
        msg: string;
        mvFee: number;
        promotionVO: null
        r: number;
        size: number;
        st: number;
        url: string;
    }
}

interface MVDetail
{
    code: number;
    bufferPic: string;
    bufferPicFS: string;
    loadingPic: string;
    loadingPicFS: string;
    subed: boolean;

    data?: MVDetailData

    mp: {
        cp: number
        dl: number
        fee: number
        id: number
        msg: null
        mvFee: number
        normal: boolean
        payed: number
        pl: number
        sid: number
        st: number
        unauthorized: boolean
    }
}

interface MVDetailData
{
    artistId: number;
    artistName: string;
    briefDesc: string;
    artists: {
        followed: boolean
        id: number
        img1v1Url: string
        name: string
    }[]
    brs: {
        br: number
        point: number
        size: number
    }[]
    commentCount: number;
    commentThreadId: string;
    cover: string;
    coverId: number;
    coverId_str: string;
    desc: string;
    duration: number;
    id: number;
    nType: number;
    name: string;
    playCount: number;
    price: number;
    publishTime: number;
    shareCount: number;
    subCount: number;
    videoGroup: []
}