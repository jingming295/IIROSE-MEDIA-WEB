/**
 * 使用 https://api.bilibili.com/x/web-interface/view 的时候返回的接口
 */
interface BVideoDetail
{
  code: number;
  message: string;
  ttl: number;
  data?: VideoData;
}

/**
 * BVideoDetail下的data
 */
interface VideoData
{
  bvid: string;
  aid: number;
  videos: number;
  tid: number;
  tname: string;
  copyright: number;
  pic: string;
  title: string;
  pubdate: number;
  ctime: number;
  desc: string;
  desc_v2: {
    raw_text: string;
    type: number;
    biz_id: number;
  }[];
  state: number;
  duration: number;
  mission_id: number;
  season_type: number;
  rights: rights;
  owner: {
    mid: number;
    name: string;
    face: string;
  }
  stat: {
    aid: number;
    view: number;
    danmaku: number;
    reply: number;
    favorite: number;
    coin: number;
    share: number;
    now_rank: number;
    his_rank: number;
    like: number;
    dislike: number;
    evaluation: string;
    argue_msg: string;
    vt: number;
  }
  dynamic: string;
  cid: number;
  dimension: {
    width: number;
    height: number;
    rotate: number;
  }
  season_id: number;
  premiere: null;
  teenage_mode: number;
  is_chargeable_season: boolean;
  is_story: boolean;
  is_upower_exclusive: boolean;
  is_upower_play: boolean;
  enable_vt: number;
  vt_display: string;
  no_cache: boolean;
  pages: BVideoDetailDataPage[];
  subtitle: {
    allow_submit: boolean;
    list: SubtitleList[];
  }
  ugc_season: {
    id: number;
    title: string;
    cover: string;
    mid: number;
    intro: string;
    sign_state: number;
    attribute: number;
    sections?: ugc_season_Section[];
    stat: {
      score: number;
      count: number;
      average: string;
    }
    ep_count: number;
    season_type: number;
    is_pay_season: boolean;
    enable_vt: number;
  }
  is_season_display: boolean;
  user_garb: {
    url_image_ani_cut: string;
  }
  honor_reply: HonorReply | Record<string, never>;
  like_icon: string;
  need_jump_bv: boolean;
  disable_show_up_info: boolean;
  ai_rcmd: {
    id: number;
    goto: string;
    trackid: string;
    uniq_id: string;
  }
  v_voucher: string
}

/**
 * BVideoDetail下的data的page
 * 如果视频有分页
 */
interface BVideoDetailDataPage
{
  cid: number;
  page: number;
  from: string;
  part: string;
  duration: number;
  vid: string;
  weblink: string;
  dimension: {
    width: number;
    height: number;
    rotate: number;
  }
  first_frame: string;
}

/**
 * 视频获得的荣誉？
 */
interface HonorReply
{
  honor: {
    aid: number;
    type: number;
    desc: string;
    weekly_recommend_num: number;
  }[];
}
/**
 * 不知道有什么用
 */
interface Arc
{
  aid: number;
  videos: number;
  type_id: number;
  type_name: string;
  copyright: number;
  pic: string;
  title: string;
  pubdate: number;
  ctime: number;
  desc: string;
  state: number;
  duration: number;
  rights: rights;
  author: {
    mid: number;
    name: string;
    face: string;
  }
  stat: {
    aid: number;
    view: number;
    danmaku: number;
    reply: number;
    fav: number;
    coin: number;
    share: number;
    now_rank: number;
    his_rank: number;
    like: number;
    dislike: number;
    evaluation: string;
    argue_msg: string;
    vt: number;
    vv: number;
  }
  dynamic: string;
  dimension: {
    width: number;
    height: number;
    rotate: number;
  }
  desc_v2: null; // 输出是null，不确定有没有其他输出
  is_chargeable_season: boolean;
  is_blooper: boolean;
  enable_vt: number;
  vt_display: string;
}

interface rights
{
  bp: number;
  elec: number;
  download: number;
  movie: number;
  pay: number;
  hd5: number;
  no_reprint: number;
  autoplay: number;
  ugc_pay: number;
  is_cooperation: number;
  ugc_pay_preview: number;
  no_background: number;
  clean_mode: number;
  is_stein_gate: number;
  is_360: number;
  no_share: number;
  arc_pay: number;
  free_watch: number;
}


/**
 * 集？
 */
interface Episode
{
  season_id: number;
  section_id: number;
  id: number;
  aid: number;
  cid: number;
  title: string;
  attribute: number;
  arc: Arc;
  page: BVideoDetailDataPage;
  bvid: string;
}
/**
 * 还没研究是什么，暂时不知道
 */
interface ugc_season_Section
{
  season_id: number;
  id: number;
  title: string;
  type: number;
  episodes: Episode[];
}

/**
 * 字幕列表
 */
interface SubtitleList
{
  id: number;
  lan: string;
  lan_doc: string;
  is_lock: boolean;
  subtitle_url: string;
  type: number;
  id_str: string;
  ai_type: number;
  ai_status: number;
  author: {
    mid: number;
    name: string;
    sex: string;
    face: string;
    sign: string;
    rank: number;
    birthday: number;
    is_fake_account: number;
    is_deleted: number;
    in_reg_audit: number;
    is_senior_member: number;
  }
}

interface BilibiliPagesAndCids
{

  code: number;
  message: string;
  ttl: number;
  data?: {
    cid: number;
    page: number;
    from: string;
    part: string;
    duration: number;
    vid: string;
    weblink: string;
    dimension: {
      width: number;
      height: number;
      rotate: number;
    }
    first_frame: string;
  }[]

}