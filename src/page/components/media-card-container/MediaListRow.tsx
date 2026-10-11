import { Component } from "preact";
import { MediaCardImg, getMediaInfoArea } from "./MediaCardImg";
import { MediaCardButton } from "./MediaCardButton";

interface MediaListRowProps {
  platformData: PlatformData;
}

/**
 * 搜索结果列表视图的单行：
 * 72px 方形缩略图 + 标题/作者/类型时长文字块 + 内联播放/选集按钮
 * 行高由内容撑开（max-content），禁止被 overflow:hidden 裁掉按钮
 */
export class MediaListRow extends Component<MediaListRowProps> {
  render() {
    const { platformData } = this.props;
    const info = getMediaInfoArea(platformData);

    return (
      <div className="flex items-center gap-3 w-full shrink-0 box-border bg-white/50 rounded-xl overflow-hidden backdrop-blur-[10px] px-3 py-[10px] max-[490px]:py-[8px] max-[490px]:gap-[10px] animate-[fadeIn_.25s_ease-out]">
        <MediaCardImg
          src={platformData.coverImg}
          platformData={platformData}
          compact
        />

        <div className="flex flex-col justify-center min-w-0 grow shrink text-[rgba(0,0,0,0.75)]">
          <div className="font-bold text-[15px] leading-[20px] overflow-hidden text-ellipsis whitespace-pre">
            {platformData.title}
          </div>
          <div className="text-[12px] leading-[16px] mt-[2px] overflow-hidden text-ellipsis whitespace-pre text-[rgba(0,0,0,0.6)]">
            {platformData.author || ""}
          </div>
          {/* 元信息右对齐到按钮组左侧，做右侧视觉锚点（桌面端消除中段大空白）；无内容不渲染空行 */}
          {info && (
            <div className="flex justify-end mt-[2px] overflow-hidden">
              <div className="text-[12px] leading-[16px] overflow-hidden text-ellipsis whitespace-pre min-w-0 max-w-full text-[rgba(0,0,0,0.6)]">
                {info}
              </div>
            </div>
          )}
        </div>

        <MediaCardButton platformData={platformData} variant="compact" />
      </div>
    );
  }
}
