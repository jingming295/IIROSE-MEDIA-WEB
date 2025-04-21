interface MovieDetailEPSS
{
  code: number;
  message: string;
  result?: {
    activity: {
      head_bg_url: string;
      id: number;
      title: string;
    }
    actors: string;
    alias: string;
    areas: {
      id: number;
      name: string;
    }[];
    bkg_cover: string;
    cover: string;
    enable_vt: boolean;
    episodes: MovieDetail_Episodes[];
    evaluate: string;
    freya: {
      bubble_desc: string;
      bubble_show_cnt: number;
      icon_show: number;
    }
    hide_ep_vv_vt_dm: number;
    icon_font: {
      name: string;
      text: string;
    }
    jp_title: string;
    link: string;
    media_id: number;
    mode: number;
    new_ep: {
      desc: string;
      id: number;
      is_new: number;
      title: string;
    }
    payment: {
      discount: number;
      pay_type: {
        allow_discount: number;
        allow_pack: number;
        allow_ticket: number;
        allow_time_limit: number;
        allow_vip_discount: number;
        forbid_bb: number;
      }[];
      price: string;
      promotion: string;
      tip: string;
      view_start_time: number;
      vip_discount: number;
      vip_first_promotion: string;
      vip_price: string;
      vip_promotion: string;
    }
    play_strategy: {
      strategies: string[];
    }
    positive: {
      id: number;
      title: string;
    }
    publish: {
      is_finish: number;
      is_started: number;
      pub_time: string;
      pub_time_show: string;
      unknow_pub_date: number;
      weekday: number;
    }
    rating: {
      count: number;
      score: number;
    }
    record: string;
    rights: {
      allow_bp: number;
      allow_bp_rank: number;
      allow_download: number;
      allow_review: number;
      area_limit: number;
      ban_area_show: number;
      can_watch: number;
      copyright: string;
      forbid_pre: number;
      freya_white: number;
      is_cover_show: number;
      is_preview: number;
      only_vip_download: number;
      resource: string;
      watch_platform: number;
    }
    season_id: number;
    season_title: string;
    seasons: MovieDetail_Season[];
    section: MovieDetail_Section[];
    series: {
      display_type: number;
      series_id: number;
      series_title: string;
    }
    share_copy: string;
    share_sub_title: string;
    share_url: string;
    show: {
      wide_screen: number;
    }
    show_season_type: number;
    square_cover: string;
    staff: string;
    stat: {
      coins: number;
      danmakus: number;
      favorite: number;
      favorites: number;
      follow_text: string;
      likes: number;
      reply: number;
      share: number;
      views: number;
      vt: number;
    }
    status: number;
    styles: string[];
    subtitle: string;
    title: string;
    total: number;
    type: number;
    up_info: {
      avatar: string;
      avatar_subscript_url: string;
      follower: number;
      is_follow: number;
      mid: number;
      nickname_color: string;
      pendant: {
        image: string;
        name: string;
        pid: number;
      }
      theme_type: number;
      uname: string;
      verify_type: number;
      vip_label: {
        bg_color: string,
        bg_style: number,
        border_color: string,
        text: string,
        text_color: string;
      }
      vip_status: number;
      vip_type: number;
    }
    user_status: {
      area_limit: number;
      ban_area_show: number;
      follow: number;
      follow_status: number;
      login: number;
      pay: number;
      pay_pack_paid: number;
      progress: {
        last_ep_id: number;
        last_ep_index: string;
        last_time: number;
      }
      sponsor: number;
      vip_info: {
        due_date: number;
        status: number;
        type: number;
      }
    }
  }
}

interface MovieDetail_Season
{
  badge: string;
  badge_info: {
    bg_color: string;
    bg_color_night: string;
    text: string;
  }
  badge_type: number;
  cover: string;
  enable_vt: boolean;
  horizontal_cover_1610: string;
  horizontal_cover_169: string;
  icon_font: {
    name: string;
    text: string;
  }
  media_id: number;
  new_ep: {
    cover: string;
    id: number;
    index_show: string;
  }
  season_id: number;
  season_title: string;
  season_type: number;
  stat: {
    favorites: number;
    series_follow: number;
    views: number;
    vt: number;
  }
}

interface MovieDetail_Section
{
  attr: number;
  episode_id: number;
  episode_ids: number[];
  episodes: MovieDetail_Episodes[];
  id: number;
  title: string;
  type: number;
  type2: number;
  report?: {
    season_id: string;
    season_type: string;
    sec_title: string;
    section_id: string;
    section_type: string;
  }
}

interface MovieDetail_Episodes
{
  aid: number;
  badge: string;
  badge_info: {
    bg_color: string;
    bg_color_night: string;
    text: string;
  }
  badge_type: number;
  bvid: string;
  cid: number;
  cover: string;
  dimension: {
    height: number;
    rotate: number;
    width: number;
  }
  duration: number;
  enable_vt: boolean;
  ep_id: number;
  from: string;
  id: number;
  is_view_hide: boolean;
  link: string;
  long_title: string;
  pub_time: number;
  pv: number;
  release_date: string;
  rights: {
    allow_demand: number;
    allow_dm: number;
    allow_download: number;
    area_limit: number;
  }
  share_copy: string;
  share_url: string;
  short_link: string;
  showDrmLoginDialog: boolean;
  status: number;
  subtitle: string;
  title: string;
  vid: string;
}

interface MovieDetailMDID
{
  code: number;
  message: string;
  result?: {
    media: {
      areas: {
        id: number; // 地区id
        name: string; // 地区名
      }[]; // 地区
      cover: string; // 封面图片url
      horizontal_picture: string; // 横板封面图片url
      media_id: number; // 剧集mdid
      new_ep: {
        id: number; // 最新一话的epid
        index: string; // 最新一话名称
        index_show: string; // 最新一话显示名称
      }
      rating: {
        count: number; // 总计评分人数
        score: number; // 评分
      }
      season_id: number; // 剧集ssid
      share_url: string; // 剧集详情页连接
      title: string; // 标题
      type: number; // 剧集类型id
      type_name: string; // 剧集类型
    }
  }
}

interface MovieSeasonSection
{
  code: number;
  message: string;
  result?: {
    main_section: section;
    section: section[];
  }
}

interface section
{
  episodes: {
    aid: number; // av号
    badge: string;
    badge_info: {
      bg_color: string;
      bg_color_night: string;
      text: string;
    }
    badge_type: number;
    cid: number; // 分集cid
    cover: string; // 分集封面
    from: string; // 来源 
    id: number; // 分集epid
    is_premiere: number;
    long_title: string; // 长标题
    share_url: string; // 分集播放页url
    status: number;
    title: string; // 短标题
    vid: string;
  }[];
  id: number; // 分组id
  title: string;
  type: number; // 0: 正片 1: PV&其他 2: OP&ED
}