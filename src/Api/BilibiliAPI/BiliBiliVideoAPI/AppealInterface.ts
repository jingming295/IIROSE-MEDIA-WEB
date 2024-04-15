export interface AppealType{
    code: number;
    message: string;
    ttl: number;
    data: AppealData[];
}

interface AppealData{
    tid: number; // 类型tid	
    business: number // 不清楚有什么用途
    weight: number; // 权重
    round: number; // 不清楚有什么用途
    state: number; // 不清楚有什么用途
    name: string; // 类型名称
    remark: string; // 类型备注
    ctime: string // 不清楚有什么用途
    mtime: string // 不清楚有什么用途
    controls?: controls[]
}

interface controls{
    tid: number; // 类型tid
    bid: number; // 不清楚有什么用途
    name: string; // 提示名称
    title: string; // 提示标题
    component: string; // 需要填入的类型
    placeholder: string; // 文本框占位符
    required: number; // 是否必填
}

export interface MakeAppealResult{
	code: number;
    message: string;
    ttl: number;
    data?:null; // 需要完善
}