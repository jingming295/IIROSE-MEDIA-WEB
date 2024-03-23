export interface AlbumData
{
    resourceState: boolean;
    songs: Song[];
    code: number;
    album: Album;
}

interface Song
{
    rtUrls: string[];               // 字符串数组
    ar: Artist[];                   // 艺术家数组，你可能需要定义 Artist 类型
    al: Album;                      // 专辑类型，你可能需要定义 Album 类型
    st: number;                     // 数字
    noCopyrightRcmd: null | boolean;    // 可能为 null 或其他类型，根据实际情况定义
    songJumpInfo: null | string;       // 同上
    rtype: number;                  // 数字
    rurl: null | string;            // 可能为 null 或字符串
    pst: number;                    // 数字
    alia: string[];                 // 字符串数组
    pop: number;                    // 数字
    rt: string;                     // 字符串
    mst: number;                    // 数字
    cp: number;                     // 数字
    crbt: null;               // 同上
    cf: string;                     // 字符串
    dt: number;                     // 数字
    h: Quality;                     // Quality 类型，你可能需要定义 Quality 类型
    sq: Quality;                    // 同上
    hr: Quality | null;             // 可能为 null 或 Quality 类型
    l: Quality;                     // 同上
    rtUrl: null | string;           // 可能为 null 或字符串
    ftype: number;                  // 数字
    djId: number;                   // 数字
    no: number;                     // 数字
    fee: number;                    // 数字
    mv: number;                     // 数字
    t: number;                      // 数字
    v: number;                      // 数字
    cd: string;                     // 字符串
    a: null | string;                  // 可能为 null 或其他类型，根据实际情况定义
    m: Quality;                 // MusicDetail 类型，你可能需要定义该类型
    name: string;                   // 字符串
    id: number;                     // 数字
    videoInfo: VideoInfo[];               // 可能需要定义更具体的类型
    tns: string[];                  // 字符串数组
    privilege: MusicPrivilege;                 // 可能需要定义更具体的类型
}

interface Artist
{
    id: number;
    name: string;
    alias: string[];
}

interface Quality
{
    br: number;    // 比特率，表示每秒传输的比特数
    fid: number;   // 文件ID，可能是文件的唯一标识符
    size: number;  // 文件大小，表示音频文件的大小
    vd: number;    // 未知属性，可能是某种修饰或修正值
    sr: number;    // 采样率，表示每秒采样的次数
}

interface Album
{
    songs: [];  // 你可以根据实际情况定义这个类型
    paid: boolean;
    onSale: boolean;
    mark: number;
    awardTags: null;  // 你可以根据实际情况定义这个类型
    companyId: number;
    blurPicUrl: string;
    artists: ArtistData[];
    copyrightId: number;
    picId: number;
    artist: Artist;
    briefDesc: string;
    publishTime: number;
    company: string;
    picUrl: string;
    commentThreadId: string;
    pic: number;
    status: number;
    subType: string;
    alias: string[];
    description: string;
    tags: string;
    name: string;
    id: number;
    type: string;
    size: number;
    picId_str: string;
    info: AlbumInfo;
}

interface ArtistData
{
    img1v1Id: number;
    topicPerson: number;
    followed: boolean;
    picId: number;
    briefDesc: string;
    musicSize: number;
    albumSize: number;
    picUrl: string;
    img1v1Url: string;
    trans: string;
    alias: string[];
    name: string;
    id: number;
    img1v1Id_str: string;
}

interface AlbumInfo
{
    commentThread: CommentThread;
    latestLikedUsers: null;  // 你可以根据实际情况定义这个类型
    liked: boolean;
    comments: null | string;  // 你可以根据实际情况定义这个类型
    resourceType: number;
    resourceId: number;
    commentCount: number;
    likedCount: number;
    shareCount: number;
    threadId: string;
}

interface CommentThread
{
    id: string;
    resourceInfo: ResourceInfo;  // 你可以根据实际情况定义这个类型
    resourceType: number;
    commentCount: number;
    likedCount: number;
    shareCount: number;
    hotCount: number;
    latestLikedUsers: null;  // 你可以根据实际情况定义这个类型
    resourceOwnerId: number;
    resourceTitle: string;
    resourceId: number;
}

interface ResourceInfo
{
    id: number;
    userId: number;
    name: string;
    imgUrl: string;
    creator: null;  // 你可以根据实际情况定义这个类型
    encodedId: null;  // 你可以根据实际情况定义这个类型
    subTitle: string | null;
    webUrl: string | null;
}

interface VideoInfo
{
    moreThanOne: boolean;  // 表示是否存在多个视频
    video: Video | null;   // Video 类型或 null，表示视频信息
}

interface Video
{
    // 在这里定义视频相关的属性，比如视频ID、链接等，根据实际情况添加
}

interface MusicPrivilege
{
    id: number;               // 音乐ID
    fee: number;              // 费用，通常表示是否需要付费
    payed: number;            // 已支付的费用
    st: number;               // 状态，通常表示音乐的可用性
    pl: number;               // 是否可以播放
    dl: number;               // 是否可以下载
    sp: number;               // 特殊属性
    cp: number;               // 版权标识
    subp: number;             // 未知属性，可能与订阅相关
    cs: boolean;              // 是否支持客户端收费
    maxbr: number;            // 最大比特率
    fl: number;               // 未知属性，可能与音质相关
    toast: boolean;           // 是否显示提示信息
    flag: number;             // 标志
    preSell: boolean;         // 是否预售
    playMaxbr: number;        // 播放最大比特率
    downloadMaxbr: number;    // 下载最大比特率
    maxBrLevel: string;       // 最大比特率级别
    playMaxBrLevel: string;   // 播放最大比特率级别
    downloadMaxBrLevel: string; // 下载最大比特率级别
    plLevel: string;          // 播放级别
    dlLevel: string;          // 下载级别
    flLevel: string;          // 音质级别
    rscl: null;                // 未知属性，可能与资源相关
    freeTrialPrivilege: {
        resConsumable: boolean;  // 是否是消耗型资源
        userConsumable: boolean; // 是否是用户可消耗资源
        listenType: null;         // 听歌类型，具体类型根据实际情况定义
    };
    chargeInfoList: ChargeInfo[];     // 收费信息列表，具体类型根据实际情况定义
}

interface ChargeInfo
{
    rate: number;           // 比特率
    chargeUrl: string | null;     // 收费链接，可能为null
    chargeMessage: string | null; // 收费信息，可能为null
    chargeType: number;     // 收费类型，1表示有费用，0表示免费
}
