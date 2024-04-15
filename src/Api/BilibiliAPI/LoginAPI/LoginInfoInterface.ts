export interface NavUserInfo
{
    code: number;
    message: string;
    ttl: number;
    data: {
        isLogin: boolean;
        wbi_img: {
            img_url: string;
            sub_url: string;
        };

        // 下面是登陆后才有的
        email_verified?: number; // 是否验证邮箱地址	0: 未验证 1: 已验证
        face?: string; // 用户头像 url
        face_nft?: number; // 我不清楚这是什么，非同质化代币？
        face_nft_type?: number; // 我不清楚这是什么，非同质化代币？
        level_info?: {
            current_level: number; // 当前等级
            current_min: number; // 当前等级经验最低值	
            current_exp: number; // 当前等级经验
            next_exp: number; // 升级下一等级需达到的经验
        };
        mid?: number; // 登录用户mid
        mobile_verified: number; // 是否验证手机	0: 未验证 1: 已验证
        money?: number; // 拥有硬币数
        moral?: number; // 当前节操值
        official?: {
            role: number; // 认证类型 详见 https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/user/official_role.md
            title: string; // 认证信息
            desc: string; // 认证备注
            type: number; // 官方认证类型 -1: 无 0: 认证
        };
        officialVerify?: {
            type: number; // 认证类型 -1: 无 0: 认证
            desc: string; // 认证备注
        };
        pendant?: {
            pid: number; // 挂件id
            name: string; // 挂件名称
            image: string; // 挂件图片url
            expire: number; // 不清楚这是什么
            image_enhance: string;
            image_enhance_frame: string;
            n_pid: number;
        };
        scores?: number; // 不清楚这是什么
        uname?: string; // 用户昵称
        vipDueDate?: number; // vip到期时间 (毫秒 时间戳)
        vipStatus?: number; // 会员开通状态 0: 没有 1: 有
        vipType?: number; // 会员类型 0: 无 1: 月度大会员 2: 年度及以上大会员
        vip_pay_type?: number; // 不清楚这是什么
        vip_theme_type?: number; // 不清楚这是什么
        vip_label?: {
            path: string; // 不清粗这是什么
            text: string; // 会员类型名称
            label_theme: string; // 会员标签
            text_color: string;
            bg_style: number;
            bg_color: string;
            border_color: string;
            use_img_label: boolean;
            img_label_uri_hans: string;
            img_label_uri_hant: string;
            img_label_uri_hans_static: string; // 会员标签图片 (简体)
            img_label_uri_hant_static: string; // 会员标签图片 (繁体)
        };
        vip_avatar_subscript?: number; // 是否显示会员图标 0: 不显示 1: 显示
        vip_nickname_color?: string; // 会员昵称颜色
        vip: {
            type: number; // 会员类型 0: 无 1: 月度大会员 2: 年度及以上大会员
            status: number; // 会员开通状态 0: 没有 1: 有
            due_date: number; // vip到期时间 (毫秒 时间戳)
            vip_pay_type: number; // 不清楚这是什么
            theme_type: number; // 不清楚这是什么
            label: {
                path: string; // 不清粗这是什么
                text: string; // 会员类型名称
                label_theme: string; // 会员标签
                text_color: string;
                bg_style: number;
                bg_color: string;
                border_color: string;
                use_img_label: boolean;
                img_label_uri_hans: string;
                img_label_uri_hant: string;
                img_label_uri_hans_static: string; // 会员标签图片 (简体)
                img_label_uri_hant_static: string; // 会员标签图片 (繁体)
            };
            avatar_subscript: number; // 是否显示会员图标 0: 不显示 1: 显示
            nickname_color: string; // 会员昵称颜色
            role: number;
            avatar_subscript_url: string;
            tv_vip_status: number;
            tv_vip_pay_type: number;
            tv_due_date: number;
            avatar_icon: {
                icon_type: number;
                icon_resource: {};
            };

        };
        wallet?: {
            mid: number; // 用户mid
            bcoin_balance: number; // 拥有B币数
            coupon_balance: number; // 卷？
            coupon_due_time: number; // 卷到期时间？
        };
        has_shop?: boolean; // 是否拥有推广商品
        shop_url?: string; // 推广商品页面url
        allowance_count?: number // 不清楚这是什么
        answer_status?: number // 不清楚这是什么
        is_senior_member?: number // 是否硬核会员 0: 不是 1: 是
        is_jury?: boolean // 是否风纪委员
        }
    };

