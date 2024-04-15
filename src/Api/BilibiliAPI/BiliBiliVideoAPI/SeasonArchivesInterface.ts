export interface SeasonArchives{
    code: number;
    message: string;
    ttl: number;
    data?:{
        aids: number[];
        archives:{
            aid: number
            bvid: string
            ctime: number
            duration: number
            enable_vt: boolean
            interactive_video: boolean
            pic: string
            playback_position: number
            pubdate: number
            stat:{
                view: number
                vt: number
            }
            state: number
            title: string
            ugc_pay: number
            vt_display: string
        }[]
        meta: {
            category: number
            cover: string
            description: string
            mid: number
            name: string
            ptime: number
            season_id: number   
            total: number;
        }
        page: {
            page_num: number
            page_size: number
            total: number
        }
    }
}