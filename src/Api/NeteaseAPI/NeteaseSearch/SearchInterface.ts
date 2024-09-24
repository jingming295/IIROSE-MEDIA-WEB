export interface SearchData
{
    code: number;
    hasMore?: boolean;
    songCount: number;
    result?: {
        hasMore: boolean;
        songCount?: number;
        songs?: Song[];
        playlists?: playlists[];
        playlistCount?: number;
        albums?: albums[];
        albumCount?: number;
        mvs?: mvs[];
        mvCount?: number;
        hlWords?: string[];
        djRadiosCount?: number;
        djRadios?: djRadios[];
    }
}

interface djRadios
{
    alg: string;
    buyed: boolean;
    category: string;
    categoryId: number;
    commentCount: number;
    composeVideo: boolean;
    createTime: number;
    desc: string;
    discountPrice: null;
    dj: {
        accountStatus: number;
        anchor: boolean;
        authStatus: number;
        authenticationTypes: number;
        authority: number;
        avatarDetail: null;
        avatarImgId: number;
        avatarImgIdStr: string;
        avatarImgId_str: string;
        avatarUrl: string;
        backgroundImgId: number;
        backgroundImgIdStr: string;
        backgroundUrl: string;
        birthday: number;
        city: number;
        defaultAvatar: boolean;
        description: string;
        detailDescription: string;
        djStatus: number;
        expertTags: null;
        experts: null;
        followed: boolean;
        gender: number;
        mutual: boolean;
        nickname: string;
        province: number;
        remarkName: null;
        signature: string;
        userId: number;
        userType: number;
        vipType: number;
    }
    feeScope: number;
    finished: boolean;
    hightQuality: boolean;
    icon: string;
    id: number;
    intervenePicUrl: string
    lastProgramCreateTime: number;
    lastProgramId: number;
    lastProgramName: string;
    likedCount: number;
    liveInfo: null;
    name: string;
    originalPrice: number;
    picId: number;
    picUrl: string;
    playCount: number;
    price: number;
    privacy: boolean;
    programCount: number;
    purchaseCount: number;
    radioFeeType: number;
    rcmdText: string;
    secondCategory: string;
    secondCategoryId: number;
    shareCount: number;
    subCount: number;
    underShelf: boolean;
    videos: null
    whiteList: boolean;
}

interface mvs
{
    alg: string;
    alias: [];
    arTransName: ''
    artistId: number;
    artistName: string;
    artists: {
        alias: string[];
        id: number;
        name: string;
        transNames: null
    }[]
    briefDesc: string;
    cover: string;
    desc: string;
    duration: number;
    id: number;
    mark: number;
    name: string;
    playCount: number;
    transNames: null;
}

interface albums
{
    alg: string;
    alias: [];

    artist: {
        albumSize: number;
        alia: [];
        alias: [];
        briefDesc: string;
        id: number;
        img1v1Id: number;
        img1v1Id_str: string;
        img1v1Url: string;
        musicSize: number;
        name: string;
        picId: number;
        picId_str: string;
        picUrl: null;
        topicPerson: number
        trans: string;
    }
    artists: {
        albumSize: number;
        alia: [];
        alias: [];
        briefDesc: string;
        id: number;
        img1v1Id: number;
        img1v1Id_str: string;
        img1v1Url: string;
        musicSize: number;
        name: string;
        picId: number;
        picId_str: string;
        picUrl: null;
        topicPerson: number
        trans: string;
    }[];
    blurPicUrl: string;
    briefDesc: string;
    commentThreadId: string;
    company: string;
    companyId: number;
    containedSong: string;
    description: string;
    copyrightId: number;
    id: number;
    mark: number;
    name: string;
    onSale: boolean;
    paid: boolean;
    pic: number;
    picId: number;
    picUrl: string;
    publishTime: number;
    size: number;
    songs: [];
    status: number;
    tags: string;
    type: string;
}

interface playlists
{
    action: string;
    actionType: string;
    alg: string;
    bookCount: number;
    coverImgUrl: string;
    creator: {
        authStatus: number;
        avatarUrl: string;
        expertTags: null;
        experts: null;
        nickname: string;
        userId: number;
        userType: number;
    }
    description: string;
    highQuality: boolean;
    id: number;
    name: string;
    officialTags: string[];
    playCount: number;
    recommendText: string;
    score: number;
    specialType: number;
    subscribed: boolean;
    track: {
        album: {
            alias: [];
            artist: {
                albumSize: number;
                alias: [];
                briefDesc: string;
                id: number;
                img1v1: number;
                img1v1Url: string;
                musicSize: number;
                name: string;
                picId: number;
                picUrl: null;
                topicPerson: number;
                trans: string;
            }
            artists: {
                albumSize: number;
                alias: [];
                briefDesc: string;
                id: number;
                img1v1: number;
                img1v1Url: string;
                musicSize: number;
                name: string;
                picId: number;
                picUrl: null;
                topicPerson: number;
                trans: string;
            }[];
            blurPicUrl: string;
            briefDesc: string;
            commentThreadId: string;
            company: string;
            companyId: number;
            copyrightId: number;
            description: string;
            id: number;
            idStr: string;
            name: string;
            onSale: boolean;
            pic: number;
            picId: number;
            picId_str: string;
            picUrl: string;
            publishTime: number;
            size: number;
            songs: [];
            status: number;
            tags: string;
            type: string;
        }
        alias: [];
        artists: {
            albumSize: number;
            alias: [];
            briefDesc: string;
            id: number;
            img1v1: number;
            img1v1Url: string;
            musicSize: number;
            name: string;
            picId: number;
            picUrl: null;
            topicPerson: number
        }[];
        bMusic: {
            bitrate: number;
            dfsId: number;
            extension: string;
            name: null;
            id: number;
            playTime: number;
            size: number;
            sr: number;
            volumeDelta: number
        }
        commentThreadId: string;
        copyFrom: string;
        copyright: number;
        copyrightId: number;
        crbt: null;
        dayPlays: number;
        disc: string;
        duration: number;
        fee: number;
        ftype: number;
        hearTime: number;
        id: number;
        hMusic: {
            bitrate: number;
            dfsId: number;
            extension: string;
            name: null;
            id: number;
            playTime: number;
            size: number;
            sr: number;
            volumeDelta: number
        }
        lMusic: {
            bitrate: number;
            dfsId: number;
            extension: string;
            name: null;
            id: number;
            playTime: number;
            size: number;
            sr: number;
            volumeDelta: number
        }
        mMusic: {
            bitrate: number;
            dfsId: number;
            extension: string;
            name: null;
            id: number;
            playTime: number;
            size: number;
            sr: number;
            volumeDelta: number
        }
        mp3Url: null;
        mvid: number;
        name: string;
        no: number;
        playedNum: number;
        popularity: number;
        position: number;
        ringtone: string;
        rtUrl: null;
        rtUrls: [];
        rtype: number;
        rurl: null;
        score: number;
        starred: boolean;
        starredNum: number;
        status: number;
    }
    trackCount: number;
    userId: number;
}

interface Song
{
    album: {
        artist: {
            albumSize: number;
            alias: [];
            fansGroup: null;
            id: number;
            img1v1: number;
            img1v1Url: string; // 歌手图片
            name: string; // 歌手名
            picId: number;
            picUrl: null;
            trans: null
        }
        copyrightId: number;
        id: number;
        mark: number;
        name: string;
        picId: number;
        publishTime: number;
        size: number; // 专辑歌曲数量
        status: number;
    } // 专辑信息
    alias: [];
    artists: {
        albumSize: number;
        alias: [];
        fansGroup: null;
        id: number;
        img1v1: number;
        img1v1Url: string; // 歌手图片
        name: string; // 歌手名
        picId: number;
        picUrl: null;
        trans: null
    }[];
    copyrightId: number
    duration: number; // 时长, 貌似是毫秒
    fee: number;
    ftype: number;
    id: number; // 歌曲id
    mark: number;
    mvid: number;
    name: string; // 歌曲名
    rUrl: null;
    rtype: number;
    status: number;
}