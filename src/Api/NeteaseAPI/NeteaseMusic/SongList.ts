
// 小草提供的网易云音乐接口返回的数据结构
export interface xcSongResource
{
    auther: string;
    br: number;
    code: number;
    file_type: string;
    id: number;
    level: string;
    level_en: string;
    lrc: string;
    lrc_control: string;
    lrc_translation: string;
    md5: string;
    name: string;
    pic: string;
    time: number;
    url: string;
    vip_level?:number;
}

/**
 * 歌词
 */
export interface Lyric
{
    sgc: boolean;
    sfy: boolean;
    qfy: boolean;
    transUser: transUser;
    lyricUser: transUser;
    lrc: lrc | null;// 原版歌词
    klyric: lrc | null; // 未知
    tlyric: lrc | null;// 中文翻译歌词
    romalrc: lrc | null;// 罗马音歌词
    code: number;
}

interface transUser
{

    id: number;
    status: number;
    demand: number;
    userid: number;
    nickname: string;
    uptime: number;
}

interface lrc
{
    version: number;
    lyric: string;
}



/**
 * 歌单
 */
export interface SongList
{
    code: number;
    relatedVideos: string;
    playlist: Playlist;
    urls: unknown[] | null;
    privileges: {
        id: number;
        fee: number;
        payed: number;
        realPayed: number;
        st: number;
        pl: number;
        dl: number;
        sp: number;
        cp: number;
        subp: number;
        cs: boolean;
        maxbr: number;
        fl: number;
        pc: unknown | null;
        toast: boolean;
        flag: number;
        paidBigBang: boolean;
        preSell: boolean;
        playMaxbr: number;
        downloadMaxbr: number;
        maxBrLevel: string;
        playMaxBrLevel: string;
        downloadMaxBrLevel: string;
        plLevel: string;
        dlLevel: string;
        flLevel: string;
        rscl: unknown | null;
        freeTrialPrivilege: {
            resConsumable: boolean;
            userConsumable: boolean;
            listenType: unknown | null;
            cannotListenReason: unknown | null;
        };
        rightSource: number;
        chargeInfoList: {
            rate: number;
            chargeUrl: unknown | null;
            chargeMessage: unknown | null;
            chargeType: number;
        }[];
    }[];
    sharedPrivilege: unknown | null;
    resEntrance: unknown | null;
    fromUsers: unknown[] | null;
    fromUserCount: number;
    songFromUsers: unknown[] | null;
}
interface Playlist
{
    id: number;
    name: string;
    coverImgId: number;
    coverImgUrl: string;
    coverImgId_str: string;
    adType: number;
    userId: number;
    createTime: number;
    status: number;
    opRecommend: boolean;
    highQuality: boolean;
    newImported: boolean;
    updateTime: number;
    trackCount: number;
    specialType: number;
    privacy: number;
    trackUpdateTime: number;
    commentThreadId: string;
    playCount: number;
    trackNumberUpdateTime: number;
    subscribedCount: number;
    cloudTrackCount: number;
    ordered: boolean;
    description: string | null;
    tags: string[];
    updateFrequency: string | null;
    backgroundCoverId: number;
    backgroundCoverUrl: string | null;
    titleImage: number;
    titleImageUrl: string | null;
    englishTitle: string | null;
    officialPlaylistType: string | null;
    copied: boolean;
    relateResType: string | null;
    subscribers: unknown[]; // 你可以根据实际数据结构填写更详细的类型
    subscribed: boolean;
    creator?: PlaylistCreator;
    tracks: PlaylistTrack[];
    videoIds: unknown[] | null;
    videos: unknown[] | null;
    trackIds: PlaylistTrackId[];
    bannedTrackIds: unknown[] | null;
    mvResourceInfos: unknown[] | null;
    shareCount: number;
    commentCount: number;
    remixVideo: unknown | null;
    sharedUsers: unknown[] | null;
    historySharedUsers: unknown[] | null;
    gradeStatus: string;
    score: unknown | null;
    algTags: unknown | null;
    trialMode: number;
}
interface PlaylistTrack
{
    name: string;
    id: number;
    pst: number;
    t: number;
    ar: {
        id: number;
        name: string;
        tns: unknown[];
        alias: unknown[];
    }[];
    alia: string[];
    pop: number;
    st: number;
    rt: unknown | null;
    fee: number;
    v: number;
    crbt: unknown | null;
    cf: string;
    al: {
        id: number;
        name: string;
        picUrl: string;
        tns: unknown[];
        pic_str: string;
        pic: number;
    };
    dt: number;
    h: {
        br: number;
        fid: number;
        size: number;
        vd: number;
        sr: number;
    };
    m: {
        br: number;
        fid: number;
        size: number;
        vd: number;
        sr: number;
    };
    l: {
        br: number;
        fid: number;
        size: number;
        vd: number;
        sr: number;
    };
    sq: {
        br: number;
        fid: number;
        size: number;
        vd: number;
        sr: number;
    } | null;
    hr: unknown | null;
    a: unknown | null;
    cd: string;
    no: number;
    rtUrl: unknown | null;
    ftype: number;
    rtUrls: unknown[];
    djId: number;
    copyright: number;
    s_id: number;
    mark: number;
    originCoverType: number;
    originSongSimpleData: unknown | null;
    tagPicList: unknown | null;
    resourceState: boolean;
    version: number;
    songJumpInfo: unknown | null;
    entertainmentTags: unknown | null;
    awardTags: unknown | null;
    single: number;
    noCopyrightRcmd: unknown | null;
    mst: number;
    cp: number;
    mv: number;
    rtype: number;
    rurl: unknown | null;
    publishTime: number;
    videoInfo: {
        moreThanOne: boolean;
        video: unknown | null;
    };
    tns: string[];
}

interface PlaylistCreator
{
    defaultAvatar: boolean;
    province: number;
    authStatus: number;
    followed: boolean;
    avatarUrl: string;
    accountStatus: number;
    gender: number;
    city: number;
    birthday: number;
    userId: number;
    userType: number;
    nickname: string;
    signature: string;
    description: string;
    detailDescription: string;
    avatarImgId: number;
    backgroundImgId: number;
    backgroundUrl: string;
    authority: number;
    mutual: boolean;
    expertTags: unknown;
    experts: unknown;
    djStatus: number;
    vipType: number;
    remarkName: string | null;
    authenticationTypes: number;
    avatarDetail: unknown;
    avatarImgIdStr: string;
    backgroundImgIdStr: string;
    anchor: boolean;
    avatarImgId_str: string;
}
interface PlaylistTrackId
{
    id: number;
    v: number;
    t: number;
    at: number;
    alg: unknown | null;
    uid: number;
    rcmdReason: string;
    sc: unknown | null;
    f: unknown | null;
    sr: unknown | null;
}