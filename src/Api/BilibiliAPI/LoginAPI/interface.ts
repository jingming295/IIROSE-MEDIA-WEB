export interface QRcode{
    code: number;
    message: string;
    ttl: number;
    data: {
      url: string;
      qrcode_key: string;
    };
}
export interface qrLogin{
    code: number;
    message: string;
    ttl: number;
    data: {
      url: string;
      refresh_token: string;
      timestamp: number;
      code: number;
      message: string;
    };
}

export interface Refresh {
    code: number;
    message: string;
    ttl: number;
    data: {
      refresh: boolean;
      timestamp: number;
    };
  }

  export interface buvid{
    code: number;
    message: string;
    data?: {
      b_3: string;
      b_4: string;
    };
  }

  export interface RefreshCookieData {
    RefreshCookiedata: RefreshCookiedata;
    cookiesObject: CookiesObject;
  }

  export interface RefreshCookiedata {
    code: number;
    message: string;
    ttl: number;
    data: {
      status: number;
      message: string;
      refresh_token: string;
    }
  }
  
  export interface CookiesObject {
    SESSDATA: string;
    bili_jct: string;
    DedeUserID: string;
    DedeUserID__ckMd5: string;
    sid: string;
  }