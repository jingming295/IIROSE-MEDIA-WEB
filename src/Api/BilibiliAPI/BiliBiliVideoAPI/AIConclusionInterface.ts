export interface AIConclusion {
    code: number;
    message: string;
    ttl: number;
    data?: {
        code: number;
        model_result:{
            result_type:number
            summary:string
            outline:{
                title:string
                part_outline:{
                    timestamp:number
                    content:string
                }[]
                timestamp:number
            }[]
        }
        stid:string
        status:number
        like_num:number
        dislike_num:number
    };
}

export interface likeAndDislikeAIConclusion {
    code: number;
    message: string;
    ttl: number;
}