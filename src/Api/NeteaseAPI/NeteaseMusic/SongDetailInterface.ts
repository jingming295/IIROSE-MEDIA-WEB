export interface SongDetail
{
  songs?: SongDetailSong[];
  equalizers: string; // 这里是一个键值对，值的类型未知，可以根据需要修改
  code: number;
}

export interface SongDetailFromBinaryify
{
  code: number;
  privileges: [];
  songs?: SongDetailFromXCSong[];
}

export interface SongDetailFromXCSong
{
  a: null
  al: {
    id: number; // 专辑id
    name: string; // 专辑名
    picUrl: string; // 专辑图片
    pic: number; // 未知
    pic_str: string; // 专辑图片
  }; // 专辑信息
  alia: string[];
  ar: {
    id: number; // 歌手id
    name: string; // 歌手名
    alias: [];
    tns: [];
  }[]; // 歌手信息
  awardTags: null; // 未知
  cd: string; // 未知
  cf: string; // 未知
  crbt: null; // 未知
  djId: number; // 未知
  dt: number; // 时长, 貌似是毫秒
  entertainmentTags: null; // 未知
  fee: number; // 未知
  ftype: number; // 未知
  tns?: string[]; // 副标题
  sq: {
    br: number; // 比特率
    fid: number; // 未知
    size: number; // 大小
    vd: number; // 未知
  }; // 歌曲分辨率信息？最高
  h: {
    br: number; // 比特率
    fid: number; // 未知
    size: number; // 大小
    vd: number; // 未知
  }; // 歌曲分辨率信息？中等偏上
  hr: null; // 未知
  id: number; // 歌曲id
  l: {
    br: number; // 比特率
    fid: number; // 未知
    size: number; // 大小
    vd: number; // 未知
  }; // 歌曲分辨率信息？最低
  m: {
    br: number; // 比特率
    fid: number; // 未知
    size: number; // 大小
    vd: number; // 未知
  }; // 歌曲分辨率信息？中等
  mark: number; // 未知
  mst: number; // 未知
  mv: number; // 未知
  name: string; // 歌曲名
  no: number; // 未知
  noCopyrightRcmd: null // 未知
  originCoverType: number; // 未知
  originSongSimpleData: null; // 未知
  pop: number; // 未知
  pst: number; // 未知
  publishTime: number; // 发行时间 13位时间戳
  resourceState: boolean; // 未知
  rt: string; // 未知
  rtUrl: null; // 未知
  rtUrls: []; // 未知
  rtype: number; // 未知
  rurl: null; // 未知
  s_id: number; // 未知
  single: number; // 未知
  songJumpInfo: null; // 未知
  st: number; // 未知
  t: number; // 未知
  tagPicList: null; // 未知
  v: number; // 未知
  version: number; // 未知

}

export interface SongDetailSong
{
  name: string;
  id: number;
  position: number;
  alias: string[];
  status: number;
  fee: number;
  copyrightId: number;
  disc: string;
  no: number;
  artists: MusicDetailArtists[];
  album: MusicDetailAlbum;
  starred: boolean;
  popularity: number;
  score: number;
  starredNum: number;
  duration: number;
  playedNum: number;
  dayPlays: number;
  hearTime: number;
  sqMusic: null; // 根据实际情况定义
  hrMusic: null; // 根据实际情况定义
  ringtone: string;
  crbt: null; // 根据实际情况定义
  audition: null; // 根据实际情况定义
  copyFrom: string;
  commentThreadId: string;
  rtUrl: null; // 根据实际情况定义
  ftype: number;
  rtUrls: null[]; // 根据实际情况定义
  copyright: number;
  transName?: string;
  sign: null; // 根据实际情况定义
  mark: number;
  originCoverType: number;
  originSongSimpleData: null; // 根据实际情况定义
  single: number;
  noCopyrightRcmd: null; // 根据实际情况定义
  rtype: number;
  rurl: null; // 根据实际情况定义
  mvid: number;
  bMusic: MusicFormat;
  mp3Url: string; // 根据实际情况定义
  hMusic: MusicFormat;
  mMusic: MusicFormat;
  lMusic: MusicFormat;
  transNames: string[];
}

interface MusicDetailArtists
{
  name: string;
  id: number;
  picId: number;
  img1v1Id: number;
  briefDesc: string;
  picUrl: string;
  img1v1Url: string;
  albumSize: number;
  alias: null[];
  trans: string;
  musicSize: number;
  topicPerson: number;
}

interface MusicDetailAlbum
{
  name: string;
  id: number;
  type: string;
  size: number;
  picId: number;
  blurPicUrl: string;
  companyId: number;
  pic: number;
  picUrl: string;
  publishTime: number;
  description: string;
  tags: string;
  company: string;
  briefDesc: string;
  commentThreadId: string;
  artists: Artist[];
  subType: string;
  transName: null; // 根据实际情况定义
  onSale: boolean;
  mark: number;
  gapless: number;
  dolbyMark: number;
  picId_str: string;
}

interface Artist
{

}

interface MusicFormat
{
  name: string | null;
  id: number;
  size: number;
  extension: string;
  sr: number;
  dfsId: number;
  bitrate: number;
  playTime: number;
  volumeDelta: number;
}