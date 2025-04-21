interface FollowMovie
{
    code: number;
    message: string;
    result?: {
        fmid: number;
        relation: boolean
        status: number
        toast: string
    }
}