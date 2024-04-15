export interface SearchRequest
{
    code: number;
    message: string;
    ttl: number;
    data?: {
        seid: string; // 搜索id
        page: number; // 页数，固定为1
        page_size: number; // 每页条数
        num_results: number; // 总条数，最大为1000
        num_pages: number; // 分页数
        suggest_keyword: string; // 不知道有什么用途
        rqt_type: string; // 不知道有什么用途
        cost_time: cost_time;
        exp_list: exp_list; // 不知道有什么用途
        egg_hit: number; // 不知道有什么用途
        pageinfo: {
            video: pageInfoObject; // 视频数
            bangumi: pageInfoObject; // 不知道有什么用途
            special: pageInfoObject; // 不知道有什么用途
            topic: pageInfoObject; // 话题数
            upuser: pageInfoObject; // 不知道有什么用途
            tv: pageInfoObject; // 不知道有什么用途
            movie: pageInfoObject; // 不知道有什么用途
            media_bangumi: pageInfoObject; // 番剧数
            media_ft: pageInfoObject; // 电影数
            related_search: pageInfoObject;
            user: pageInfoObject; // 不知道有什么用途
            activity: pageInfoObject; // 活动数
            operation_card: pageInfoObject; // 不知道有什么用途
            pgc: pageInfoObject; // 不知道有什么用途
            live: pageInfoObject; // 直播间数
            live_all: pageInfoObject; // 不知道有什么用途
            live_user: pageInfoObject; // 主播数
            live_master: pageInfoObject; // 不知道有什么用途
            article: pageInfoObject; // 专栏数
            live_room: pageInfoObject; // 直播数
            bili_user: pageInfoObject; // 用户数
        }; // 分类页数信息	
        top_tlist: {
            video: number; // 视频数
            bangumi: number; // 番剧数
            special: number; // 还不知道是什么
            topic: number; // 还不知道是什么
            upuser: number; // 还不知道是什么
            tv: number; // 还不知道是什么
            movie: number; // 还不知道是什么
            card: number; // 还不知道是什么
            media_bangumi: number; // 番剧数
            media_ft: number; // 电影数
            pgc: number; // 还不知道是什么
            live: number; // 直播间数
            user: number; // 用户数
            activity: number; // 还不知道是什么
            operation_card: number; // 还不知道是什么
            live_user: number; // 主播数
            article: number; // 专栏数
            live_room: number; // 直播数
            live_master: number; // 还不知道是什么
            bili_user: number; // 用户数
        }; // 分类结果数目信息
        show_column: number; // 不知道有什么用途
        show_module_list: string[]; // 返回结果类型列表
        app_display_option: {
            is_search_page_grayed: number; // 不知道有什么用途
        }; // 不知道有什么用途
        in_black_key: number; // 不知道有什么用途
        in_white_key: number; // 不知道有什么用途
        result: {
            result_type: string; // 返回结果类型
            data: media_ftAndmedia_bangumiResult[] & VideoResult[] & UserResult[] & web_gameResult[] & activityResult[]; // 事情是这样的，他可能是这些的其中一个，反正自求多福
        }[];
        is_search_page_grayed: number; // 不知道有什么用途
    };
}

export interface SearchRequestByType
{
    code: number;
    message: string;
    ttl: number;
    data: {
        seid: string; // 搜索id
        page: number; // 页数，固定为1
        pagesize: number; // 每页条数
        numResults: number; // 总条数，最大为1000
        numPages: number; // 分页数
        suggest_keyword: string; // 不知道有什么用途
        rqt_type: string; // search
        cost_time: cost_time;
        exp_list: exp_list;
        egg_hit: number; // 不知道有什么用途
        result:[];
        show_column: number; // 不知道有什么用途
        in_black_key: number; // 不知道有什么用途
        in_white_key: number; // 不知道有什么用途

    };
}

export interface SearchRequestByTypeVideo
{
    code: number;
    message: string;
    ttl: number;
    data?: {
        seid: string; // 搜索id
        page: number; // 页数，固定为1
        pagesize: number; // 每页条数
        numResults: number; // 总条数，最大为1000
        numPages: number; // 分页数
        suggest_keyword: string; // 不知道有什么用途
        rqt_type: string; // search
        cost_time: cost_time;
        exp_list: exp_list;
        egg_hit: number; // 不知道有什么用途
        result?: VideoResult[];
        show_column: number; // 不知道有什么用途
        in_black_key: number; // 不知道有什么用途
        in_white_key: number; // 不知道有什么用途

    };
}

export interface SearchRequestByTypeMediaBangumiAndMediaFT
{
    code: number;
    message: string;
    ttl: number;
    data: {
        seid: string; // 搜索id
        page: number; // 页数，固定为1
        pagesize: number; // 每页条数
        numResults: number; // 总条数，最大为1000
        numPages: number; // 分页数
        suggest_keyword: string; // 不知道有什么用途
        rqt_type: string; // search
        cost_time: cost_time;
        exp_list: exp_list;
        egg_hit: number; // 不知道有什么用途
        result: media_ftAndmedia_bangumiResult[];
        show_column: number; // 不知道有什么用途
        in_black_key: number; // 不知道有什么用途
        in_white_key: number; // 不知道有什么用途

    };
}

export interface SearchRequestByTypeLive
{
    code: number;
    message: string;
    ttl: number;
    data: {
        seid: string; // 搜索id
        page: number; // 页数，固定为1
        pagesize: number; // 每页条数
        numResults: number; // 总条数，最大为1000
        numPages: number; // 分页数
        suggest_keyword: string; // 不知道有什么用途
        rqt_type: string; // search
        cost_time: cost_time;
        exp_list: exp_list;
        egg_hit: number; // 不知道有什么用途
        pageinfo: {
            live_user: pageInfoObject;
            live_room: pageInfoObject;
        };
        result: liveResult;
        show_column: number; // 不知道有什么用途
        in_black_key: number; // 不知道有什么用途
        in_white_key: number; // 不知道有什么用途

    };
}

export interface SearchRequestByTypeLiveRoom
{
    code: number;
    message: string;
    ttl: number;
    data: {
        seid: string; // 搜索id
        page: number; // 页数，固定为1
        pagesize: number; // 每页条数
        numResults: number; // 总条数，最大为1000
        numPages: number; // 分页数
        suggest_keyword: string; // 不知道有什么用途
        rqt_type: string; // search
        cost_time: cost_time;
        exp_list: exp_list;
        egg_hit: number; // 不知道有什么用途
        result: live_roomResult[];
        show_column: number; // 不知道有什么用途
        in_black_key: number; // 不知道有什么用途
        in_white_key: number; // 不知道有什么用途

    };
}

export interface SearchRequestByTypeLiveUser
{
    code: number;
    message: string;
    ttl: number;
    data: {
        seid: string; // 搜索id
        page: number; // 页数，固定为1
        pagesize: number; // 每页条数
        numResults: number; // 总条数，最大为1000
        numPages: number; // 分页数
        suggest_keyword: string; // 不知道有什么用途
        rqt_type: string; // search
        cost_time: cost_time;
        exp_list: exp_list;
        egg_hit: number; // 不知道有什么用途
        result: live_userResult[];
        show_column: number; // 不知道有什么用途
        in_black_key: number; // 不知道有什么用途
        in_white_key: number; // 不知道有什么用途

    };
}

export interface SearchRequestByTypeArticle
{
    code: number;
    message: string;
    ttl: number;
    data: {
        seid: string; // 搜索id
        page: number; // 页数，固定为1
        pagesize: number; // 每页条数
        numResults: number; // 总条数，最大为1000
        numPages: number; // 分页数
        suggest_keyword: string; // 不知道有什么用途
        rqt_type: string; // search
        cost_time: cost_time;
        exp_list: exp_list;
        egg_hit: number; // 不知道有什么用途
        result: ArticleResult[];
        show_column: number; // 不知道有什么用途
        in_black_key: number; // 不知道有什么用途
        in_white_key: number; // 不知道有什么用途

    };
}

export interface SearchRequestByTypePhoto
{
    code: number;
    message: string;
    ttl: number;
    data: {
        seid: string; // 搜索id
        page: number; // 页数，固定为1
        pagesize: number; // 每页条数
        numResults: number; // 总条数，最大为1000
        numPages: number; // 分页数
        suggest_keyword: string; // 不知道有什么用途
        rqt_type: string; // search
        cost_time: cost_time;
        exp_list: exp_list;
        egg_hit: number; // 不知道有什么用途
        result: [];
        show_column: number; // 不知道有什么用途
        in_black_key: number; // 不知道有什么用途
        in_white_key: number; // 不知道有什么用途

    };
}

interface pageInfoObject
{
    total: number; // 总计数量
    numResults: number; // 总计数量
    pages: number; // 分页数量
}

interface media_ftAndmedia_bangumiResult
{
    type: string; // 类型
    media_id: number; // 剧集mdid
    title: string; // 剧集标题
    org_title: string; // 剧集原名
    media_type: number; // 剧集类型 1：番剧 2：电影 3：纪录片 4：国创 5：电视剧 7：综艺
    cv: string; // 声优
    staff: string; // 制作人员
    season_id: number; // 剧集ssid
    is_avid: boolean; // 不知道有什么用途
    hit_columns: string[] | null; // 关键字匹配类型
    hit_epids: string; // 关键字匹配分集标题的分集epid
    season_type: number; // 剧集类型 1：番剧 2：电影 3：纪录片 4：国创 5：电视剧 7：综艺
    season_type_name: string; // 剧集类型名称
    selection_style: string; // 分集选择按钮风格，horizontal：横排式 grid：按钮式
    ep_size: number; // 结果匹配的分集数
    url: string; // 剧集重定向url
    button_text: string; // 观看按钮文字
    is_follow: number; // 是否追番
    is_selection: number; // 不知道有什么用途
    eps: {
        id: number; // 分集epid
        cover: string; // 分集封面
        title: string; // 完整标题
        url: string; // 分集重定向url
        release_date: string; // 空
        badges: {
            text: string; // 剧集标志
            text_color: string; // 文字颜色
            text_color_night: string; // 夜间文字颜色
            bg_color: string; // 背景颜色
            bg_color_night: string; // 夜间背景颜色
            border_color: string; // 边框颜色
            border_color_night: string; // 夜间边框颜色
            bg_style: number; // 不知道有什么用途
        }[]; // 分集标志
        index_title: string; // 短标题
        long_title: string; // 单集标题
    }[]; // 结果匹配的分集信息
    cover: string; // 剧集封面
    areas: string; // 地区
    styles: string; // 风格
    goto_url: string; // 剧集重定向url
    desc: string; // 剧集简介
    pubtime: number; // 开播时间
    media_mode: number; // 不知道有什么用途
    fix_pubtime_str: string; // 开播时间重写信息
    media_score: {
        score: number; // 评分
        user_count: number; // 总计评分人数
    }; // 评分

    display_info: {
        text: string;
        text_color: string;
        text_color_night: string;
        bg_color: string;
        bg_color_night: string;
        border_color: string;
        border_color_night: string;
        bg_style: number;
    }[]; // 剧集标志信息
    pgc_season_id: number; // 剧集ssid
    corner: number; // 角标有无	2：无 13：有
    index_show: string; // 全*话
}

export interface VideoResult
{
    type: string; // 类型
    id: number; // 视频aid
    author: string; // UP主昵称
    mid: number; // UP主mid
    typeid: number; // 视频分区tid
    typename: string; // 视频子分区名
    arcurl: string; // 视频重定向url
    aid: number; // 视频aid
    bvid: string; // 视频bvid
    title: string; // 视频标题，关键字用xml标签<em class="keyword">标注
    description: string; // 视频简介
    arcrank: string; // 不知道有什么用途
    pic: string; // 视频封面url
    play: number; // 播放数
    video_review: number; // 弹幕数
    favorites: number; // 收藏数
    tag: string; // 视频标签
    review: number; // 评论数
    pubdate: number; // 视频投稿时间，时间戳
    senddate: number;  // 视频发布时间，时间戳
    duration: string; // 视频时长 MM:SS
    badgepay: false; // 不知道有什么用途
    hit_columns: string[]; // 关键字匹配类型
    view_type: string; // 不知道有什么用途
    is_pay: number; // 不知道有什么用途
    is_union_video: number; // 是否为合作视频 0：否 1：是
    rec_tags: null; // 不知道有什么用途
    new_rec_tags: []; // 不知道有什么用途
    rank_score: number; // 结果排序量化值
    like: number; // 点赞数
    upic: string; // UP主头像url
    corner: string; // 暂时无用
    cover: string; // 暂时无用
    desc: string; // 暂时无用
    url: string; // 暂时无用
    rec_reason: string; // 暂时无用
    danmaku: number, // 弹幕数
    biz_data: null, // 不知道有什么用途
    is_charge_video: number; // 不知道有什么用途
    vt: number; // 不知道有什么用途
    enable_vt: number; // 不知道有什么用途
    vt_display: string; // 不知道有什么用途
    subtitle: string; // 不知道有什么用途
    episode_count_text: string; // 不知道有什么用途
    release_status: number; // 不知道有什么用途
    is_intervene: number; // 不知道有什么用途
}

interface UserResult
{
    type: string; // 类型
    mid: number; // 用户mid
    uname: string; // 用户昵称
    usign: string; // 用户签名
    fans: number; // 用户粉丝数
    videos: number; // 用户稿件数
    upic: string; // 用户头像url
    face_nft: number; // 不知道有什么用途
    face_nft_type: number; // 不知道有什么用途
    verify_info: string; // 不知道有什么用途
    level: number; // 用户等级
    gender: number; // 用户性别 1：男 2：女 3：保密
    is_upuser: number; // 是否为UP主 0：否 1：是
    is_live: number; // 是否在直播 0：否 1：是
    room_id: number; // 用户直播间id
    res: {
        avid: number; // 视频aid
        bvid: string; // 视频bvid
        title: string; // 视频标题
        pubdate: number; // 视频投稿时间
        arcurl: string; // 视频重定向url
        pic: string; // 视频封面url
        play: string; // 播放数
        dm: string; // 弹幕数
        coin: string; // 投币数
        fav: string; // 收藏数
        desc: string; // 视频简介
        duration: string; // 视频时长 MM:SS
        is_pay: number; // 不知道有什么用途
        is_union_video: number; // 是否为合作视频 0：否 1：是
        is_charge_video: number; // 不知道有什么用途
        vt: number; // 不知道有什么用途
        enable_vt: number; // 不知道有什么用途
        vt_display: string; // 不知道有什么用途
    }[]; // 用户投稿内容
    official_verify: {
        type: number; // 是否认证 0：个人认证 1：机构认证 127：无
        desc: string; // 认证名称
    }; // 用户认证信息
    hit_columns: []; // 关键字匹配类型
    is_senior_member: number; // 不知道有什么用途
    expand: {
        is_power_up: boolean; // 不知道有什么用途
        system_notice: null; // 不知道有什么用途
    }; // 不知道有什么用途

}

interface web_gameResult
{
    game_base_id: number; // 还未知
    game_name: string; // 游戏名
    game_icon: string; // 游戏图标
    summary: string; // 游戏简介
    game_status: number;
    game_link: string; // 游戏链接
    grade: number;
    book_num: number;
    download_num: number;
    comment_num: number;
    platform: string; // 平台
    notice_title: string; // 公告标题
    notice: string; // 简介?
    game_tags: string; // 游戏标签
    recommend_reason: string; // 不知道有什么用途
    rank_info: {
        rank_type: number; // 不知道有什么用途
        game_rank: number; // 不知道有什么用途
        search_night_icon_url: string; // 不知道有什么用途
        search_day_icon_url: string; // 不知道有什么用途
        search_bkg_night_color: string; // 不知道有什么用途
        search_bkg_day_color: string;  // 不知道有什么用途
        search_font_night_color: string; // 不知道有什么用途
        search_font_day_color: string; // 不知道有什么用途
        rank_content: string; // 不知道有什么用途
        rank_link: string; // 不知道有什么用途
    },
    official_account: number; // 不知道有什么用途
}

interface activityResult
{
    type: string; // 类型
    id: number; // 我还不敢断定这是什么
    title: string; // 标题
    desc: string; // 描述
    cover: string; // 封面
    corner: string; // 角标
    pos: number; // 不知道有什么用途
    url: string; // 链接
    card_type: number; // 不知道有什么用途
    card_value: string; // 不知道有什么用途
    state: number; // 不知道有什么用途
    status: number; // 不知道有什么用途
    author: string; // 作者
    position: number; // 不知道有什么用途
}

interface liveResult
{
    live_room: live_roomResult[];
    live_user: live_userResult[];
}

interface live_roomResult
{
    area: number; // 不知道有什么用途
    attentions: number; // 主播粉丝数
    cate_name: string; // 子分区名
    cover: string; // 关键帧截图url
    hit_columns: string[]; // 关键字匹配类型
    is_live_room_inline: number; // 不知道有什么用途
    live_status: number; // 直播状态 0：未开播 1：直播中
    live_time: string; // 开播时间 YYYY-MM-DD HH:MM:SS
    online: number; // 在线人数
    rank_index: number; // 不知道有什么用途
    rank_offset: number; // 搜索结果排名值	
    rank_score: number; // 结果排序量化值
    roomid: number; // 直播间id
    short_id: number; // 不知道有什么用途
    tags: string; // 不知道有什么用途
    title: string; // 直播间标题
    type: string; // 类型
    uface: string; // 主播头像url
    uid: number; // 主播mid
    uname: string; // 主播昵称
    user_cover: string; // 直播间封面url
}

interface live_userResult
{
    area: number; // 不知道有什么用途
    area_v2_id: number; // 不知道有什么用途
    attentions: number; // 主播粉丝数 
    cate_name: string; // 子分区名
    hit_columns: string[]; // 关键字匹配类型
    is_live: boolean; // 是否在直播
    live_status: number; // 直播状态 0：未开播 1：直播中
    live_time: string; // 开播时间 YYYY-MM-DD HH:MM:SS
    rank_index: number; // 不知道有什么用途
    rank_offset: number; // 搜索结果排名值
    rank_score: number; // 结果排序量化值
    roomid: number; // 直播间id
    tags: string; // 不知道有什么用途
    type: string; // 类型
    uface: string; // 主播头像url
    uid: number; // 主播mid
    uname: string; // 主播昵称
}

interface ArticleResult
{
    type: string // 类型
    id: number // 专栏cvid
    mid: number // UP主mid
    title: string // 专栏标题
    desc: string // 专栏简介
    template_id: number // 不知道有什么用途
    image_urls: string[] // 封面图组
    view: number // 阅读数
    like: number // 点赞数
    reply: number // 评论数
    category_name: string // 子分区名
    category_id: number // 专栏分区
    version: string // 不知道有什么用途
    sub_type: number // 不知道有什么用途
    pub_time: number // 投稿时间 时间戳
    rank_score: number // 结果排序量化值
    rank_index: number // 不知道有什么用途
    rank_offset: number // 搜索结果排名值
}

interface cost_time
{
    total: string; // 总耗时
    fetch_lexicon: string; // 不知道有什么用途
    params_check: string; // 不知道有什么用途
    is_risk_query: string; // 不知道有什么用途
    illegal_handler: string; // 不知道有什么用途
    main_handler: string; // 不知道有什么用途
    'get upuser live status'?: string; // 不知道有什么用途
    as_request_format: string; // 不知道有什么用途
    as_request: string; // 不知道有什么用途
    deserialize_response: string; // 不知道有什么用途
    as_response_format: string; // 不知道有什么用途
}

interface exp_list
{
    '5505': boolean;
    '6600': boolean;
    '7707': boolean;
    '9902': boolean;
    '9911': boolean;
    '9924': boolean;
    '9931': boolean;
    '9940': boolean;
    '9961': boolean;
    '9971': boolean;
    '9987': boolean;
    '100206': boolean;
    '100300': boolean;
    '100801': boolean;
    '101405': boolean;
    '101501': boolean;
    '101800': boolean;
    '101901': boolean;
    '102000': boolean;
    '102506': boolean;
    '102600': boolean;
    '102801': boolean;
    '102902': boolean;
    '103000': boolean;
    '103100': boolean;
    '103207': boolean;
    '103301': boolean;
    '103402': boolean;
    '103501': boolean;
}

