// const crypto = require('crypto');
import { QRcode, Refresh, RefreshCookiedata, buvid, qrLogin } from './interface';
import { SendFetch } from '../..';
import { NavUserInfo } from './LoginInfoInterface';
import { BiliBiliSettings } from '../../../settings/bilibiliSettings/BiliBiliSettings';
// import { MainPageCookie } from '../../Generate/MainPageCookieInterface';
// const jsdom = require('jsdom');
// const { JSDOM } = jsdom;

export class BiliBiliLoginApi extends SendFetch
{
    public async QRLogin(qrcode_key: string)
    {
        const url = `${this.cors}https://passport.bilibili.com/x/passport-login/web/qrcode/poll`;
        const headers = this.returnBilibiliHeaders();
        // headers.set('cookie', `bili_ticket_expires=${CookieData['bili_ticket_expires']?.value} bili_ticket=${CookieData['bili_ticket']?.value}bmg_af_switch=${CookieData['bmg_af_switch']?.value}FEED_LIVE_VERSION=${CookieData['FEED_LIVE_VERSION']?.value}browser_resolution=${CookieData['browser_resolution']?.value}header_theme_version=${CookieData['header_theme_version']?.value}home_feed_column=${CookieData['home_feed_column']?.value}bmg_src_def_domain=${CookieData['bmg_src_def_domain']?.value}enable_web_push=${CookieData['enable_web_push']?.value}_uuid=${CookieData['_uuid']?.value}b_lsid=${CookieData['b_lsid']?.value}buvid3=${CookieData['buvid3']?.value}b_ut=${CookieData['b_ut']?.value}buvid_fp=${CookieData['buvid_fp']?.value}b_nut=${CookieData['b_nut']?.value}buvid4=${CookieData['buvid4']?.value}`);
        const params = new URLSearchParams({
            qrcode_key: qrcode_key
        });

        const bParams = this.returnBilibiliHeadersParam();
        for (const [key, value] of bParams)
        {
            params.set(key, value);
        }

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const responseData: qrLogin = await response.json();
            return responseData;
        } else
        {
            return null;
        }
    }

    async getQRCode()
    {
        const url = `${this.cors}https://passport.bilibili.com/x/passport-login/web/qrcode/generate`;
        const headers = this.returnBilibiliHeaders();
        // headers.set('cookie', `bili_ticket_expires=${CookieData['bili_ticket_expires']?.value} bili_ticket=${CookieData['bili_ticket']?.value}bmg_af_switch=${CookieData['bmg_af_switch']?.value}FEED_LIVE_VERSION=${CookieData['FEED_LIVE_VERSION']?.value}browser_resolution=${CookieData['browser_resolution']?.value}header_theme_version=${CookieData['header_theme_version']?.value}home_feed_column=${CookieData['home_feed_column']?.value}bmg_src_def_domain=${CookieData['bmg_src_def_domain']?.value}enable_web_push=${CookieData['enable_web_push']?.value}_uuid=${CookieData['_uuid']?.value}b_lsid=${CookieData['b_lsid']?.value}buvid3=${CookieData['buvid3']?.value}b_ut=${CookieData['b_ut']?.value}buvid_fp=${CookieData['buvid_fp']?.value}b_nut=${CookieData['b_nut']?.value}buvid4=${CookieData['buvid4']?.value}`);
        const response = await this.sendGet(url, new URLSearchParams(''), headers);
        if (response && response.ok)
        {
            const data: QRcode = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    public async accountStatusAPI(csrf: string)
    {
        const url = 'https://passport.bilibili.com/x/passport-login/web/cookie/info';
        const params = new URLSearchParams({
            csrf: csrf
        });
        const headers = this.returnBilibiliHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: Refresh = await response.json();
            if (data.code === 0)
            {
                return data;
            } else
            {
                console.log(`accountStatusAPI: ${data.message}, code: ${data.code}`);
                throw new Error(`accountStatusAPI: ${data.message}, code: ${data.code}`);
            }
        } else
        {
            return null;
        }
    }

    /**
     * 获取buvid (游览器指纹?)
     * @returns 
     */
    public async getBuvid()
    {
        const url = `${this.cors}https://api.bilibili.com/x/frontend/finger/spi`;
        const bParams = this.returnBilibiliHeadersParam();
        const response = await this.sendGet(url, bParams);
        if (response && response.ok)
        {
            const data: buvid = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 激活cookie
     * 还没做好，不清楚是什么问题
     * @see {@link https://github.com/SocialSisterYi/bilibili-API-collect/issues/686}
     * @see {@link https://github.com/SocialSisterYi/bilibili-API-collect/issues/933}
     * @returns 
     */
    public async activateCookie()
    {
        const url = 'https://api.bilibili.com/x/internal/gaia-gateway/ExClimbWuzhi';
        const headers = this.returnBilibiliHeaders();
        const timestamp: number = Date.now();
        const payload = {
            "3064": 1, // ptype, mobile => 2, others => 1
            "5062": timestamp, // timestamp
            "03bf": "https%3A%2F%2Fwww.bilibili.com%2F", // url accessed
            "39c8": "333.1007.fp.risk", // spm_id,
            "34f1": "", // target_url, default empty now
            "d402": "", // screenx, default empty
            "654a": "", // screeny, default empty
            "6e7c": "839x959", // browser_resolution, window.innerWidth || document.body && document.body.clientWidth + "x" + window.innerHeight || document.body && document.body.clientHeight
            "3c43": { // 3c43 => msg
                "2673": 1, // hasLiedResolution, window.screen.width < window.screen.availWidth || window.screen.height < window.screen.availHeight
                "5766": 24, // colorDepth, window.screen.colorDepth
                "6527": 0, // addBehavior, !!window.HTMLElement.prototype.addBehavior, html5 api
                "7003": 1, // indexedDb, !!window.indexedDB, html5 api
                "807e": 1, // cookieEnabled, navigator.cookieEnabled
                "b8ce": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", // ua
                "641c": 0, // webdriver, navigator.webdriver, like Selenium
                "07a4": "zh-CN", // language
                "1c57": 8, // deviceMemory in GB, navigator.deviceMemory
                "0bd0": 16, // hardwareConcurrency, navigator.hardwareConcurrency
                "748e": [
                    2560, // window.screen.width
                    1080  // window.screen.height
                ], // screenResolution
                "d61f": [
                    2467, // window.screen.availWidth
                    1091  // window.screen.availHeight
                ], // availableScreenResolution
                "fc9d": 480, // timezoneOffset, (new Date).getTimezoneOffset()
                "6aa9": "Asia/Hong_Kong", // timezone, (new window.Intl.DateTimeFormat).resolvedOptions().timeZone
                "75b8": 1, // sessionStorage, window.sessionStorage, html5 api
                "3b21": 1, // localStorage, window.localStorage, html5 api
                "8a1c": 0, // openDatabase, window.openDatabase, html5 api
                "d52f": "not available", // cpuClass, navigator.cpuClass
                "adca": "Win32", // platform, navigator.platform
                "80c9": [
                    [
                        "PDF Viewer",
                        "Portable Document Format",
                        [
                            [
                                "application/pdf",
                                "pdf"
                            ],
                            [
                                "text/pdf",
                                "pdf"
                            ]
                        ]
                    ],
                    [
                        "Chrome PDF Viewer",
                        "Portable Document Format",
                        [
                            [
                                "application/pdf",
                                "pdf"
                            ],
                            [
                                "text/pdf",
                                "pdf"
                            ]
                        ]
                    ],
                    [
                        "Chromium PDF Viewer",
                        "Portable Document Format",
                        [
                            [
                                "application/pdf",
                                "pdf"
                            ],
                            [
                                "text/pdf",
                                "pdf"
                            ]
                        ]
                    ],
                    [
                        "Microsoft Edge PDF Viewer",
                        "Portable Document Format",
                        [
                            [
                                "application/pdf",
                                "pdf"
                            ],
                            [
                                "text/pdf",
                                "pdf"
                            ]
                        ]
                    ],
                    [
                        "WebKit built-in PDF",
                        "Portable Document Format",
                        [
                            [
                                "application/pdf",
                                "pdf"
                            ],
                            [
                                "text/pdf",
                                "pdf"
                            ]
                        ]
                    ]
                ], // plugins
                "13ab": "mTUAAAAASUVORK5CYII=", // canvas fingerprint
                "bfe9": "aTot0S1jJ7Ws0JC6QkvAL/A4H1PbV+/QA3AAAAAElFTkSuQmCC", // webgl_str
                "a3c1": [
                    "extensions:ANGLE_instanced_arrays;EXT_blend_minmax;EXT_color_buffer_half_float;EXT_disjoint_timer_query;EXT_float_blend;EXT_frag_depth;EXT_shader_texture_lod;EXT_texture_compression_bptc;EXT_texture_compression_rgtc;EXT_texture_filter_anisotropic;EXT_sRGB;KHR_parallel_shader_compile;OES_element_index_uint;OES_fbo_render_mipmap;OES_standard_derivatives;OES_texture_float;OES_texture_float_linear;OES_texture_half_float;OES_texture_half_float_linear;OES_vertex_array_object;WEBGL_color_buffer_float;WEBGL_compressed_texture_s3tc;WEBGL_compressed_texture_s3tc_srgb;WEBGL_debug_renderer_info;WEBGL_debug_shaders;WEBGL_depth_texture;WEBGL_draw_buffers;WEBGL_lose_context;WEBGL_multi_draw",
                    "webgl aliased line width range:[1, 1]",
                    "webgl aliased point size range:[1, 1024]",
                    "webgl alpha bits:8",
                    "webgl antialiasing:yes",
                    "webgl blue bits:8",
                    "webgl depth bits:24",
                    "webgl green bits:8",
                    "webgl max anisotropy:16",
                    "webgl max combined texture image units:32",
                    "webgl max cube map texture size:16384",
                    "webgl max fragment uniform vectors:1024",
                    "webgl max render buffer size:16384",
                    "webgl max texture image units:16",
                    "webgl max texture size:16384",
                    "webgl max varying vectors:30",
                    "webgl max vertex attribs:16",
                    "webgl max vertex texture image units:16",
                    "webgl max vertex uniform vectors:4095",
                    "webgl max viewport dims:[32767, 32767]",
                    "webgl red bits:8",
                    "webgl renderer:WebKit WebGL",
                    "webgl shading language version:WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)",
                    "webgl stencil bits:0",
                    "webgl vendor:WebKit",
                    "webgl version:WebGL 1.0 (OpenGL ES 2.0 Chromium)",
                    "webgl unmasked vendor:Google Inc. (NVIDIA) #X3fQVPgERx",
                    "webgl unmasked renderer:ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Laptop GPU (0x00002560) Direct3D11 vs_5_0 ps_5_0, D3D11) #X3fQVPgERx",
                    "webgl vertex shader high float precision:23",
                    "webgl vertex shader high float precision rangeMin:127",
                    "webgl vertex shader high float precision rangeMax:127",
                    "webgl vertex shader medium float precision:23",
                    "webgl vertex shader medium float precision rangeMin:127",
                    "webgl vertex shader medium float precision rangeMax:127",
                    "webgl vertex shader low float precision:23",
                    "webgl vertex shader low float precision rangeMin:127",
                    "webgl vertex shader low float precision rangeMax:127",
                    "webgl fragment shader high float precision:23",
                    "webgl fragment shader high float precision rangeMin:127",
                    "webgl fragment shader high float precision rangeMax:127",
                    "webgl fragment shader medium float precision:23",
                    "webgl fragment shader medium float precision rangeMin:127",
                    "webgl fragment shader medium float precision rangeMax:127",
                    "webgl fragment shader low float precision:23",
                    "webgl fragment shader low float precision rangeMin:127",
                    "webgl fragment shader low float precision rangeMax:127",
                    "webgl vertex shader high int precision:0",
                    "webgl vertex shader high int precision rangeMin:31",
                    "webgl vertex shader high int precision rangeMax:30",
                    "webgl vertex shader medium int precision:0",
                    "webgl vertex shader medium int precision rangeMin:31",
                    "webgl vertex shader medium int precision rangeMax:30",
                    "webgl vertex shader low int precision:0",
                    "webgl vertex shader low int precision rangeMin:31",
                    "webgl vertex shader low int precision rangeMax:30",
                    "webgl fragment shader high int precision:0",
                    "webgl fragment shader high int precision rangeMin:31",
                    "webgl fragment shader high int precision rangeMax:30",
                    "webgl fragment shader medium int precision:0",
                    "webgl fragment shader medium int precision rangeMin:31",
                    "webgl fragment shader medium int precision rangeMax:30",
                    "webgl fragment shader low int precision:0",
                    "webgl fragment shader low int precision rangeMin:31",
                    "webgl fragment shader low int precision rangeMax:30"
                ], // webgl_params, cab be set to [] if webgl is not supported
                "6bc5": "Google Inc. (NVIDIA) #X3fQVPgERx~ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Laptop GPU (0x00002560) Direct3D11 vs_5_0 ps_5_0, D3D11) #X3fQVPgERx", // webglVendorAndRenderer
                "ed31": 0, // hasLiedLanguages
                "72bd": 0, // hasLiedOs
                "097b": 0, // hasLiedBrowser
                "52cd": [
                    0, // void 0 !== navigator.maxTouchPoints ? t = navigator.maxTouchPoints : void 0 !== navigator.msMaxTouchPoints && (t = navigator.msMaxTouchPoints);
                    0, // document.createEvent("TouchEvent"), if succeed 1 else 0
                    0 // "ontouchstart" in window ? 1 : 0
                ], // touch support
                "a658": [
                    "Arial",
                    "Arial Black",
                    "Arial Narrow",
                    "Book Antiqua",
                    "Bookman Old Style",
                    "Calibri",
                    "Cambria",
                    "Cambria Math",
                    "Century",
                    "Century Gothic",
                    "Century Schoolbook",
                    "Comic Sans MS",
                    "Consolas",
                    "Courier",
                    "Courier New",
                    "Georgia",
                    "Helvetica",
                    "Helvetica Neue",
                    "Impact",
                    "Lucida Bright",
                    "Lucida Calligraphy",
                    "Lucida Console",
                    "Lucida Fax",
                    "Lucida Handwriting",
                    "Lucida Sans",
                    "Lucida Sans Typewriter",
                    "Lucida Sans Unicode",
                    "Microsoft Sans Serif",
                    "Monotype Corsiva",
                    "MS Gothic",
                    "MS PGothic",
                    "MS Reference Sans Serif",
                    "MS Sans Serif",
                    "MS Serif",
                    "Palatino Linotype",
                    "Segoe Print",
                    "Segoe Script",
                    "Segoe UI",
                    "Segoe UI Light",
                    "Segoe UI Semibold",
                    "Segoe UI Symbol",
                    "Tahoma",
                    "Times",
                    "Times New Roman",
                    "Trebuchet MS",
                    "Verdana",
                    "Wingdings",
                    "Wingdings 2",
                    "Wingdings 3"
                ], // font details. see https://github.com/fingerprintjs/fingerprintjs for implementation details
                "d02f": "124.04347527516074" // audio fingerprint. see https://github.com/fingerprintjs/fingerprintjs for implementation details
            },
            "54ef": "{\"b_ut\":\"7\",\"home_version\":\"V8\",\"i-wanna-go-back\":\"-1\",\"in_new_ab\":true,\"ab_version\":{\"for_ai_home_version\":\"V8\",\"tianma_banner_inline\":\"CONTROL\",\"enable_web_push\":\"DISABLE\"},\"ab_split_num\":{\"for_ai_home_version\":54,\"tianma_banner_inline\":54,\"enable_web_push\":10}}", // abtest info, embedded in html
            "8b94": "", // refer_url, document.referrer ? encodeURIComponent(document.referrer).substr(0, 1e3) : ""
            // "df35": this.BilibiliAccountData?._uuid, // _uuid, set from cookie, generated by client side(algorithm remains unknown)
            "07a4": "zh-CN", // language
            "5f45": null, // laboratory, set from cookie, null if empty, source remains unknown
            "db46": 0 // is_selfdef, default 0
        }
        const param = new URLSearchParams({
            payload: JSON.stringify(payload)

        });// 这个我不知道怎么弄
        const response = await this.sendPost(url, param, headers);
        if (response && response.ok)
        {
            const data = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    // async GenerateCrorrespondPath(timestamp: number)
    // {
    //     const publicKeyData = {
    //         kty: "RSA",
    //         n: "y4HdjgJHBlbaBN04VERG4qNBIFHP6a3GozCl75AihQloSWCXC5HDNgyinEnhaQ_4-gaMud_GF50elYXLlCToR9se9Z8z433U3KjM-3Yx7ptKkmQNAMggQwAVKgq3zYAoidNEWuxpkY_mAitTSRLnsJW-NCTa0bqBFF6Wm1MxgfE",
    //         e: "AQAB",
    //     }

    //     const publicKey = await crypto.webcrypto.subtle.importKey(
    //         "jwk",
    //         publicKeyData,
    //         { name: "RSA-OAEP", hash: "SHA-256" },
    //         true,
    //         ["encrypt"]
    //     );

    //     const data = new TextEncoder().encode(`refresh_${timestamp}`);
    //     const encrypted = new Uint8Array(await crypto.webcrypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, data));
    //     return encrypted.reduce((str, c) => str + c.toString(16).padStart(2, "0"), "");
    // }

    // public async getrefresh_csfr(correspondPath: string, biliBiliSessData: string)
    // {
    //     const url = `https://www.bilibili.com/correspond/1/${correspondPath}`;
    //     const headers = this.returnBilibiliHeaders(biliBiliSessData);
    //     const response = await this.sendGet(url, new URLSearchParams(''), headers);

    //     if (response && response.ok)
    //     {
    //         const htmlContent = await response.text();
    //         const dom = new JSDOM(htmlContent);
    //         const refreshCsrf: string = dom.window.document.querySelector('[id="1-name"]').textContent;
    //         return refreshCsrf;
    //     } else
    //     {
    //         console.log('Warn:', response.statusText);
    //         return null;
    //     }
    // }


    /**
     * 刷新并且获取cookie
     * @param csrf CSRF Token, 位于 Cookie 中的bili_jct字段
     * @param refresh_csrf 实时刷新口令，通过getrefresh_csfr 获得
     * @param refresh_token 持久化刷新口令，在localStorage 中的ac_time_value字段
     * @param biliBiliSessData SESSDATA
     * @returns 
     */
    // public async refreshCookie(csrf: string, refresh_csrf: string, refresh_token: string, biliBiliSessData: string)
    // {
    //     const url = 'https://passport.bilibili.com/x/passport-login/web/cookie/refresh';
    //     const data = new URLSearchParams({
    //         csrf: csrf,
    //         refresh_csrf: refresh_csrf,
    //         source: 'main_web',
    //         refresh_token: refresh_token
    //     });
    //     const headers = this.returnBilibiliHeaders(biliBiliSessData);

    //     const response = await this.sendPost(url, data, headers);

    //     if (response && response.ok)
    //     {
    //         const data: RefreshCookiedata = await response.json();
    //         const cookies = response.headers.get('set-cookie');
    //         if (!cookies) throw new Error('GetRefreshCookie: 获取的cookie为空');
    //         // 将字符串按逗号分隔成数组
    //         const cookieArray = cookies.split(', ');

    //         // 创建一个空对象来存储重组后的 cookie
    //         const parsedCookies: { [key: string]: string; } = {}

    //         // 遍历数组，解析每个 cookie 并存储到对象中
    //         cookieArray.forEach(cookie =>
    //         {
    //             const cookieParts = cookie.split(';')[0].split('=');
    //             const key = cookieParts[0];
    //             const value = cookieParts[1];
    //             parsedCookies[key] = value;
    //         });
    //         console.log(parsedCookies);
    //         parsedCookies['refresh_token'] = data.data.refresh_token;
    //         return parsedCookies;
    //     } else
    //     {
    //         console.log('Warn:', response.statusText);
    //         return null;
    //     }
    // }

    // public async confirmRefreshCookie(csrf: string, refresh_token: string, biliBiliSessData: string)
    // {

    //     const url = 'https://passport.bilibili.com/x/passport-login/web/confirm/refresh';

    //     const headers = this.returnBilibiliHeaders(biliBiliSessData);

    //     const data = new URLSearchParams({
    //         csrf: csrf,
    //         refresh_token: refresh_token
    //     });
    //     data.append('csrf', csrf);
    //     data.append('refresh_token', refresh_token);

    //     const response = await this.sendPost(url, data, headers);

    //     if (response && response.ok)
    //     {
    //         const responseData: RefreshCookiedata = await response.json();
    //         return responseData;
    //     } else
    //     {
    //         console.log('Warn:', response.statusText);
    //         return null;
    //     }
    // }

    public async getNavUserData(sessdata?: string)
    {
        const url = `${this.cors}https://api.bilibili.com/x/web-interface/nav`;
        const params = new URLSearchParams
        if (!sessdata)
        {
            const bParams = this.returnBilibiliHeadersParam();
            for (const [key, value] of bParams)
            {
                params.set(key, value);
            }
        } else
        {
            params.append('cookie', `SESSDATA=${sessdata}`);
        }
        const response = await this.sendGet(url, params);
        if (response && response.ok)
        {
            const data: NavUserInfo = await response.json();
            return data;
        } else
        {
            return null;
        }
    }



}
