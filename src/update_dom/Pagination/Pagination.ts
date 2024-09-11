// import { MediaContainerItem, MediaItem } from "../../IIROSE-MEDIA/interfaces/MediaContainerInterface";
// import { MediaContainerUtils } from "../../IIROSE-MEDIA/MediaContainer";
// import { Music } from "../../Platform/Music";
// import { Video } from "../../Platform/Video";

// export class Pagination
// {
//     mcu: MediaContainerUtils;
//     constructor(mcu: MediaContainerUtils)
//     {
//         this.mcu = mcu;
//     }

//     public updatePaginationNeteasePlayList(currentPage: number, mediaItems: MediaItem[])
//     {
//         const music = new Music(this.mcu);
//         this.PaginationAction(currentPage, mediaItems, music.NeteaseRecommendSongListMediaContainerItemByIDs.bind(music));
//     }

//     public updatePaginationNeteaseMusic(currentPage: number, mediaItems: MediaItem[])
//     {
//         const music = new Music(this.mcu);
//         this.PaginationAction(currentPage, mediaItems, music.NeteaseSearchMediaContainerByIDs.bind(music));
//     }

//     public updatePaginationNeteasFavorite(currentPage: number, mediaItems: MediaItem[])
//     {
//         const music = new Music(this.mcu);
//         // this.PaginationAction(currentPage, mediaItems, music.IMW_NeteaseCollect_SongList.bind(music))
//     }

//     public updatePaginationBilibiliRCMDVideo(currentPage: number, mediaItems: MediaItem[])
//     {
//         const video = new Video(this.mcu);
//         this.PaginationAction(currentPage, mediaItems, video.bilibiliVideoMediaContainerItemByIDs.bind(video));
//     }

//     public updatePaginationBilibiliSearchVideo(currentPage: number, mediaItems: MediaItem[])
//     {
//         const video = new Video(this.mcu);
//         this.PaginationAction(currentPage, mediaItems, video.bilibiliSearchMediaContainerItemByKeyword.bind(video));
//     }

//     public updatePaginationBilibiliMultiPageVideo(currentPage: number, mediaItems: MediaItem[])
//     {
//         const video = new Video(this.mcu);
//         this.PaginationAction(currentPage, mediaItems, video.bilibiliVideoMediaContainerItemByCids.bind(video));
//     }

//     public updatePaginationBilibiliLive(currentPage: number, mediaItems: MediaItem[])
//     {
//         const video = new Video(this.mcu);
//         this.PaginationAction(currentPage, mediaItems, video.bilibiliLiveMediaContainerItemByIDs.bind(video));
//     }

//     public updatePaginationNotings()
//     {
//         this.PaginationAction();
//     }

//     private PaginationAction(
//         currentPage?: number,
//         mediaItems?: MediaItem[],
//         func?: (
//             currentPage: number,
//             mediaItem: MediaItem[]
//         ) => Promise<Promise<MediaContainerItem[] | null>[]>
//     )
//     {
//         let pagination: HTMLDivElement | undefined = undefined;
//         let prevButton: HTMLDivElement | undefined = undefined;
//         let nextButton: HTMLDivElement | undefined = undefined;

//         const paginationList = Array.from(document.querySelectorAll('.pagination')) as HTMLDivElement[];
//         const prevButtonList = Array.from(document.querySelectorAll('.prevButtonWrapper')) as HTMLDivElement[];
//         const nextButtonList = Array.from(document.querySelectorAll('.nextButtonWrapper')) as HTMLDivElement[];
//         if (paginationList.length > 1)
//         {
//             // 使用 for...of 循环遍历 NodeListOf
//             for (const item of paginationList)
//             {
//                 if (item.parentElement?.parentElement?.parentElement?.style.opacity === '1')
//                 {
//                     pagination = item;
//                     break; // 找到符合条件的元素后立即退出循环
//                 }
//             }

//             for (const item of prevButtonList)
//             {
//                 if (item.parentElement?.parentElement?.parentElement?.style.opacity === '1')
//                 {
//                     prevButton = item;
//                     break; // 找到符合条件的元素后立即退出循环
//                 }
//             }

//             for (const item of nextButtonList)
//             {
//                 if (item.parentElement?.parentElement?.parentElement?.style.opacity === '1')
//                 {
//                     nextButton = item;
//                     break; // 找到符合条件的元素后立即退出循环
//                 }
//             }
//         } else
//         {
//             pagination = paginationList[0];

//             // 这里判断如果有一个以上，就是进入分集了
//             if (prevButtonList.length > 1 && nextButtonList.length > 1)
//             {
//                 prevButton = prevButtonList[1];
//                 nextButton = nextButtonList[1];
//             } else
//             {
//                 prevButton = prevButtonList[0];
//                 nextButton = nextButtonList[0];
//             }
//         }

//         if (!pagination || !prevButton || !nextButton) return;

//         if (func && currentPage && mediaItems)
//         {
//             const totalPage = Math.ceil(mediaItems.length / 10);
//             pagination.innerText = `${currentPage}/${totalPage}`;
//             prevButton.onclick = () =>
//             {
//                 if (!currentPage) return;
//                 const MediaContainerContentCollection = Array.from(document.querySelectorAll('.MediaContainerContent')) as HTMLDivElement[];
//                 let MediaContainerContent: HTMLDivElement | undefined = undefined;
//                 // 这里判断如果有一个以上，就是进入分集了
//                 if (MediaContainerContentCollection.length > 1)
//                 {
//                     MediaContainerContent = MediaContainerContentCollection[1];
//                 } else
//                 {
//                     MediaContainerContent = MediaContainerContentCollection[0];
//                 }
//                 if (!MediaContainerContent) return;
//                 if (currentPage === 1) return;
//                 currentPage--;
//                 const parent = MediaContainerContent.parentElement;
//                 if (!parent) return;
//                 const NeteaseSearchMediaContainerByIDs = func(currentPage, mediaItems);
//                 pagination.innerText = `${currentPage}/${totalPage}`;
//                 this.mcu.createMediaContainerContent(NeteaseSearchMediaContainerByIDs, 'rgb(221, 28, 4)', parent);
//             };
//             nextButton.onclick = () =>
//             {
//                 if (!currentPage) return;
//                 const MediaContainerContentCollection = Array.from(document.querySelectorAll('.MediaContainerContent')) as HTMLDivElement[];
//                 let MediaContainerContent: HTMLDivElement | undefined = undefined;
//                 // 这里判断如果有一个以上，就是进入分集了
//                 if (MediaContainerContentCollection.length > 1)
//                 {
//                     MediaContainerContent = MediaContainerContentCollection[1];
//                 } else
//                 {
//                     MediaContainerContent = MediaContainerContentCollection[0];
//                 }
//                 if (!MediaContainerContent) return;
//                 if (currentPage === totalPage) return;
//                 currentPage++;
//                 const parent = MediaContainerContent.parentElement;
//                 if (!parent) return;
//                 const NeteaseSearchMediaContainerByIDs = func(currentPage, mediaItems);
//                 pagination.innerText = `${currentPage}/${totalPage}`;
//                 this.mcu.createMediaContainerContent(NeteaseSearchMediaContainerByIDs, 'rgb(221, 28, 4)', parent);
//             };
//         } else
//         {
//             pagination.innerText = `-/-`;
//             prevButton.onclick = () => { return; };
//             nextButton.onclick = () => { return; };
//         }
//     }

// }