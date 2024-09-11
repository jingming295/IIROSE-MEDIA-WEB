import { SendFetch } from "../..";
import { BVideoStream } from "../BiliBiliVideoAPI/StreamInterface";
import { CoursePagesData } from "./CourseStreamInterface";

export class BiliBiliCourseApi extends SendFetch
{

    /**
     * 
     * @param season_id 课程ssid，与番剧ssid不互通
     * @param ps 每页项数，默认为50
     * @param pn 页码，默认为1
     */
    public async getBilibiliCoursePagesData(season_id: number, ps?: number, pn?: number)
    {
        const url = `${this.cors}https://api.bilibili.com/pugv/view/web/ep/list`
        const params = new URLSearchParams()
        params.append("season_id", season_id.toString())
        ps && params.append("ps", ps.toString())
        pn && params.append("pn", pn.toString())

        const headers = this.returnBilibiliHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: CoursePagesData = await response.json();
            return data;
        } else
        {
            return null;
        }

    }

    public async getBilibiliCourseStream(
        aid: number | null = null,
        ep_id: number | null = null,
        cid: number,
        qn: number,
        fnval: number = 16,
        fourk: number = 1,
    )
    {
        const url = `${this.cors}https://api.bilibili.com/pugv/player/web/playurl`
        const params = new URLSearchParams()
        aid && params.append("aid", aid.toString())
        ep_id && params.append("ep_id", ep_id.toString())
        params.append("cid", cid.toString())
        params.append("qn", qn.toString())
        params.append("fnval", fnval.toString())
        params.append("fourk", fourk.toString())

        const headers = this.returnBilibiliHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: BVideoStream = await response.json();
            return data;
        } else
        {
            return null;
        }


    }

}