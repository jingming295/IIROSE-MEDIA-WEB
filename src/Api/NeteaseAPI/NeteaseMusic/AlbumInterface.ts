import { SongsFromBinaryify } from "./SongDetailInterface";

export interface AlbumData
{
    code: number;
    resourceState: boolean;
    album: {
        alias: string[];
        artist: {
            albumSize: number;
            alias: string[];
            briefDesc: string;
            followed: boolean;
            id: number;
            img1v1Id: number;
            img1v1Id_str: string;
            img1v1Url: string;
            musicSize: number;
            name: string;
            picId: number;
            picId_str: string;
            picUrl: string;
            topicPerson: number
            trans: string;
        }
        artists: {
            albumSize: number;
            alias: string[];
            briefDesc: string;
            followed: boolean;
            id: number;
            img1v1Id: number;
            img1v1Id_str: string;
            img1v1Url: string;
            musicSize: number;
            name: string;
            picId: number;
            picId_str: string;
            picUrl: string;
            topicPerson: number
            trans: string;
        }[]
        awardTags: null
        blurPicUrl: string;
        briefDesc: string;
        commentThreadId: string;
        company: string;
        companyId: number;
        copyrightId: number;
        description: string;
        id: number;
        info: {
            commentCount: number;
            commentThread: {
                commentCount: number;
                hotCount: number;
                id: string;
                latestLikedUsers: null
                likedCount: number;
                resourceId: number;
                resourceInfo: {
                    creator: null
                    encodedId: null;
                    id: number;
                    imgUrl: string;
                    name: string;
                    subTitle: string
                    userId: number;
                    webUrl: string;
                }
                resourceOwnerId: number;
                resourceTitle: string;
                resourceType: number;
                shareCount: number;
            }
            comments: null;
            latestLikedUsers: null;
            liked: boolean;
            likedCount: number;
            resourceId: number;
            resourceType: number;
            shareCount: number;
            threadId: string;
        }
        mark: number;
        name: string;
        onSale: boolean;
        paid: boolean;
        pic: number;
        picId: number;
        picId_str: string;
        picUrl: string;
        publishTime: number;
        size: number;
        songs: []
        status: number;
        subType: string;
        tags: string;
        type: string;
    }
    songs: SongsFromBinaryify[]
}