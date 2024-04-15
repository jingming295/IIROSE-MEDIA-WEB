export interface interactVideoDetail
{
    code: 0 | -400 | -404 | 99003 | 99077 | number;
    message: string;
    ttl: number;
    data?: {
        title: string;
        edge_id: number;
        story_list: {
            node_id: number;
            edge_id: number;
            title: string;
            cid: number;
            start_pos: number;
            cover: string;
            cursor: number;
        }[];
        edges: {
            dimension: {
                width: number;
                height: number;
                rotate: number;
                sar: string;
            };
            questions: {
                id: number;
                type: number;
                start_time_r: number;
                duration: number;
                pause_video: number;
                title: string;
                choices: {
                    id: number;
                    platform_action: string;
                    native_action: string;
                    condition: string;
                    cid: number;
                    x: number;
                    y: number;
                    text_align: number;
                    option: string;
                    is_default: number;
                }[];
            }[];
            skin: {
                choice_image: string;
                title_text_color: string;
                title_shadow_color: string;
                title_shadow_offset_y: number;
                title_shadow_radius: number;
                progressbar_color: string;
                progressbar_shadow_color: string;
            };
        };
        preload: {
            video: {
                aid: number;
                cid: number;
            }[]
        };
        hidden_vars?: {
            value:number
            id: string
            id_v2:string
            type: number
            is_show: number
            name: string
            skip_overwrite: number
        }[]; // 变量列表, 无变量时不存在此项
        is_leaf: 0 | 1; // 是否为结束模块
        no_tutorial?: 1; // 禁止记录选择, 非禁止时无此项
        no_backtracking?: 1; // 禁止进度回溯, 非禁止时无此项
        no_evaluation?: 1; // 禁止结尾评分, 非禁止时无此项
    };
}