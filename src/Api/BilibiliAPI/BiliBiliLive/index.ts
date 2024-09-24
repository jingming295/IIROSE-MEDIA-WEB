import { SendFetch } from "../..";
import { BiliBiliSettings } from "../../../settings/bilibiliSettings/BiliBiliSettings";
import { LiveRoomDetail, LiveRoomInitDetail, LiveRoomPlayInfoDetail, LiveRoomStatus, LiveUserDetail } from "./LiveDetailInterface";
import { LiveStream } from "./LiveStreamInterface";

export class BiliBiliLiveApi extends SendFetch
{
    bvSetting = new BiliBiliSettings().getBilibiliVideoSettings();
    bcors = this.getBilibiliCors(this.bvSetting.api)
    /**
     * 
     * @param roomId 
     * @returns 
     */
    public async getLiveRoomDetail(roomId: number)
    {
        const url = `${this.bcors}https://api.live.bilibili.com/room/v1/Room/get_info`;
        const params = new URLSearchParams({
            room_id: roomId.toString()
        });
        const headers = this.returnBilibiliHeaders();
        const response = await this.sendGet(url, params, headers);
        if (response && response.ok)
        {
            const data: LiveRoomDetail = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 获取用户对应的直播间状态 (根据用户mid)
     * @see {@link https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/live/info.md}
     * @param mid 
     * @returns 
     */
    public async getLiveRoomStatusByMid(mid: number)
    {
        const url = 'https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld';
        const params = new URLSearchParams({
            mid: mid.toString()
        });
        const headers = this.returnBilibiliHeaders();
        const response = await this.sendGet(url, params, headers);
        if (response && response.ok)
        {
            const data: LiveRoomStatus = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 获取房间页初始化信息
     * @param id 
     * @returns 
     */
    public async getLiveRoomInitDetail(id: number)
    {
        const url = 'https://api.live.bilibili.com/room/v1/Room/room_init';
        const params = new URLSearchParams({
            id: id.toString()
        });
        const headers = this.returnBilibiliHeaders();
        const response = await this.sendGet(url, params, headers);
        if (response && response.ok)
        {
            const data: LiveRoomInitDetail = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 获取主播信息
     * @param uid 
     * @returns 
     */
    public async getLiveUserDetail(uid: number)
    {
        const url = 'https://api.live.bilibili.com/live_user/v1/Master/info';
        const params = new URLSearchParams({
            uid: uid.toString()
        });
        const headers = this.returnBilibiliHeaders();
        const response = await this.sendGet(url, params, headers);
        if (response && response.ok)
        {
            const data: LiveUserDetail = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    /**
     * 获取直播间信息
     * @param room_id 
     * @param protocol 
     * @param format 
     * @param codec 
     * @param qn 
     * @param platform 
     * @param ptype 
     * @param dolby 
     * @param panorama 
     * @returns 
     */
    public async getLiveRoomPlayInfo
        (
            room_id: number,
            protocol: string,
            format: string,
            codec: string,
            qn: number,
            platform: string = 'web',
            ptype: number = 8,
            dolby: number = 5,
            panorama: number = 1,
        )
    {
        const url = 'https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo';
        const params = new URLSearchParams({
            room_id: room_id.toString(),
            protocol: protocol,
            format: format,
            codec: codec,
            qn: qn.toString(),
            platform: platform,
            ptype: ptype.toString(),
            dolby: dolby.toString(),
            panorama: panorama.toString(),
        });
        const headers = this.returnBilibiliHeaders();
        const response = await this.sendGet(url, params, headers);
        if (response && response.ok)
        {
            const data: LiveRoomPlayInfoDetail = await response.json();
            return data;
        } else
        {
            return null;
        }
    }

    public async getLiveStream
        (
            cid: number,
            platform: string | null = null,
            quality: number | null = null,
            qn: number | null = null,
        )
    {
        const url = `${this.bcors}https://api.live.bilibili.com/room/v1/Room/playUrl`;
        const params = new URLSearchParams({
            cid: cid.toString()
        });
        platform && params.append('platform', platform);
        quality && params.append('quality', quality.toString());
        qn && params.append('qn', qn.toString());

        const headers = this.returnBilibiliHeaders();

        const response = await this.sendGet(url, params, headers);

        if (response && response.ok)
        {
            const data: LiveStream = await response.json();
            return data;
        } else
        {
            return null;
        }
    }
}