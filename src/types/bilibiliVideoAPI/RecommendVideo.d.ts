interface RecommandVideo
{
    code: number;
    message: string;
    ttl: number;
    data?: VideoData[];
}

interface RecommendVideoFromMainPage
{
    code: number;
    message: string;
    ttl: number;
    data?: {
        item: {
            id: number;
            bvid: string;
            cid: number;
            goto: string;
            uri: string;
            pic: string;
            pic_4_3: string;
            title: string;
            duration: number;
            pubdate: number;
            owner: {
                mid: number;
                name: string;
                face: string;
            }
            stat: {
                view: number;
                like: number;
                danmaku: number;
                vt: number;
            }
            av_feature: null;
            is_followed: number;
            rcmd_reason: { reason_type: number; }
            show_info: number;
            track_id: string;
            pos: number;
            room_info: null;
            ogv_info: null;
            business_info: null;
            is_stock: number;
            enable_vt: number;
            vt_display: string;
            dislike_switch: number;
        }[];
        side_bar_column: {
            id: number;
            goto: string;
            track_id: string;
            pos: number;
            card_type: string;
            card_type_en: string;
            cover: string;
            url: string;
            title: string;
            sub_title: string;
            duration: number;
            stats: {
                follow: number;
                view: number;
                danmaku: number;
                reply: number;
                coin: number;
                series_follow: number;
                series_view: number;
                likes: number;
                favorite: number;
            }
            room_info: null;
            new_ep: {
                id: number;
                index_show: string;
                cover: string;
                title: string;
                long_title: string;
                pub_time: string;
                duration: number;
                day_of_week: number;
            }
            styles: string[];
            comic: null;
            producer: {
                mid: number;
                name: string;
                type: number;
                is_contribute: number;
            }[];
            source: string;
            av_feature: null;
            is_rec: number;
            is_finish: number;
            is_started: number;
            is_play: number;
            horizontal_cover_16_9: string;
            horizontal_cover_16_10: string;
            enable_vt: number;
            vt_display: string;
        }[];
        business_card: null;
        floor_info: null;
        user_feature: null;
        preload_expose_pct: number;
        preload_floor_expose_pct: number;
        mid: number;
    }

}

interface RecommentShortVideo
{
    code: number;
    message: string;
    ttl: number;
    data?: {
        items: {
            card_type: string;
            card_goto: string;
            goto: string;
            param: string;
            cover: string;
            title: string;
            uri: string;
            three_point: {
                dislike_reasons: {
                    id: number;
                    name: string;
                    toast: string;
                }[];
                feedback: {
                    id: number;
                    name: string;
                    toast: string;
                }[];
                watch_later: number;
            }
            args: {
                up_id: number;
                up_name: string;
                rid: number;
                rname: string;
                tid: number;
                tname: string;
                aid: number;
            }
            player_args: {
                aid: number;
                cid: number;
                type: string;
                duration: number;
            }
            idx: number;
            three_point_v2: {
                title: string;
                type: string;
                icon: string;
                reasons?: {
                    id: number;
                    name: string;
                    toast: string;
                }
            }[];
            talk_back: string;
            report_flow_data: string;
            cover_left_text_1: string;
            cover_left_icon_1: number;
            cover_left_1_content_description: string;
            cover_left_text_2: string;
            cover_left_icon_2: number;
            cover_left_2_content_description: string;
            cover_right_text: string;
            cover_right_content_description: string;
            desc_button: {
                text: string;
                uri: string;
                event: string;
                type: number;
            }
            official_icon: number;
            can_play: number;
            goto_icon: {
                icon_url: string;
                icon_night_url: string;
                icon_width: number;
                icon_height: number;
            }
        }[];

        config: {
            column: number;
            autoplay_card: number;
            feed_clean_abtest: number;
            home_transfer_test: number;
            auto_refresh_time: number;
            show_inline_danmaku: number;
            toast: null;
            is_back_to_homepage: boolean;
            enable_rcmd_guide: boolean;
            inline_sound: number;
            auto_refresh_time_by_appear: number;
            auto_refresh_time_by_active: number;
            visible_area: number;
            card_density_exp: number;
            story_mode_v2_guide_exp: number;
        }
        interest_choose: null;

    }

} 
