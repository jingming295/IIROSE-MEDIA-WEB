export interface ParamsObject
{
  s: string;
  type: number;
  limit: number;
  offset: number;
}

export interface SearchSimpleAlbumParamsObject
{
  albumId: number;
  header: Header;
}

interface Header
{
  appver: string;
  versioncode: string;
  buildver: string;
  resolution: string;
  __csrf: string;
  os: string;
  requestId: string;
  MUSIC_A: string;
}