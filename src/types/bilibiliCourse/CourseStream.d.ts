interface CoursePagesData
{

    code: number;
    message: string;
    data?: {
        items: {
            aid: number;
            catalogue_index: number;
            cid: number;
            cover: string;
            duration: number;
            ep_status: number;
            episode_can_view: boolean
            from: string;
            id: number;
            index: number;
            label: string;
            page: number;
            play: number;
            play_way: number;
            playable: boolean;
            release_date: number;
            show_vt: boolean;
            status: number;
            subtitle: string;
            title: string;
            watched: boolean
            watchedHistory: number
        }[],
        page: {
            next: boolean,
            num: number,
            size: number,
            total: number
        }

        v_voucher: string
    }


}