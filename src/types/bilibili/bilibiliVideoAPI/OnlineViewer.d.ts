interface OnlineViewer
{
    code: number;
    message: string;
    ttl: number;
    data?: {
        total: string; // 所有终端总计人数	
        count: string; // web端实时在线人数	
        show_switch: {
            total: boolean;
            count: boolean;
        } // 数据显示控制	
        abtest: {
            group: string;
        }
    }
}