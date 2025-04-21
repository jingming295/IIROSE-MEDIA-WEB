interface Snapshot
{
    code: number;
    message: string;
    ttl: number;
    data?: SnapshotData;
}
interface SnapshotData
{
    pvdata: string; //bin格式截取时间表url	
    img_x_len: number; //每行图片数
    img_y_len: number; //每列图片数
    img_x_size: number; //每张图片长	
    img_y_size: number; //每张图片宽
    image: string[]; //图片拼版
    index: number[]; //json数组截取时间表
    video_shots: null // 未知
    indexs: null // 未知
}