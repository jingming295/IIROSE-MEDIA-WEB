import { Component } from "preact";

interface MediaCardInfoProps {
  platformData: PlatformData;
}

export class MediaCardInfo extends Component<MediaCardInfoProps> {
  render() {
    const { platformData } = this.props;
    return (
      <div className="p-6 text-[rgba(0,0,0,0.75)] relative shrink-0">
        {platformData.title && (
          <div className="relative font-bold leading-[25px]">
            <div className="overflow-hidden text-ellipsis whitespace-pre text-[17px] mb-6">
              {platformData.title}
            </div>
            {platformData.subtitle && (
              <div className="absolute top-full left-0 text-[11px] max-w-[80%] overflow-hidden whitespace-pre text-ellipsis text-[rgba(0,0,0,0.5)]">
                {platformData.subtitle}
              </div>
            )}
          </div>
        )}

        <div className="overflow-hidden font-bold text-ellipsis whitespace-pre">
          {platformData.author || ""}
        </div>
      </div>
    );
  }

  state = {
    collected: false,
  };
}
