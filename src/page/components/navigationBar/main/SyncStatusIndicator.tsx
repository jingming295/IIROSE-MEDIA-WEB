import { Component } from "preact";
import { SyncManager } from "../../../../sync/SyncManager";
import type { SyncStatus } from "../../../../sync/SyncRuntime";

interface SyncStatusIndicatorProps {
  /** 点击后跳到设置里的「云端同步」卡片 */
  onOpenSync: () => void;
}

interface SyncStatusIndicatorState {
  enabled: boolean;
  phase: SyncStatus["phase"];
  message: string | null;
  lastSyncAt: number | null;
}

/**
 * Row 1 的同步状态灯：不翻设置就能回答「同步现在正不正常」。
 *
 * - 未启用同步时整块不渲染（没有云同步的人不该看到一朵云）；
 * - 空闲 = 半透明图标，同步中 = 图标自转，待重试 = 图标 + 红点；
 * - 状态来源只有 `SyncManager.getStatus()` / `onStateChange`，不在本地维护第二份。
 */
export class SyncStatusIndicator extends Component<
  SyncStatusIndicatorProps,
  SyncStatusIndicatorState
> {
  state: SyncStatusIndicatorState = {
    enabled: false,
    phase: "idle",
    message: null,
    lastSyncAt: null,
  };

  private unsubscribe: (() => void) | null = null;

  componentDidMount(): void {
    this.refresh();
    this.unsubscribe = SyncManager.onStateChange(() => this.refresh());
  }

  componentWillUnmount(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private refresh(): void {
    const state = SyncManager.getState();
    this.setState({
      enabled: state.enabled,
      phase: state.status.phase,
      message: state.status.message,
      lastSyncAt: state.lastSyncAt,
    });
  }

  private title(): string {
    const { phase, message, lastSyncAt } = this.state;
    if (phase === "syncing") return "同步中…";
    if (phase === "error") return `待重试：${message ?? "上次同步失败"}`;
    const last = lastSyncAt
      ? SyncManager.formatLastSyncAt(lastSyncAt)
      : "从未同步";
    return `同步正常 · 上次同步 ${last}`;
  }

  render() {
    if (!this.state.enabled) return null;
    const { phase } = this.state;
    const iconClass =
      "syncCloudIcon text-2xl max-[768px]:text-[24px] transition-opacity duration-150";

    return (
      <div
        className="relative min-w-[40px] min-h-[40px] max-[768px]:min-w-[44px] max-[768px]:min-h-[44px] max-[768px]:w-[44px] max-[768px]:h-[44px] flex items-center justify-center cursor-pointer text-white bg-[#fff3] transition-all duration-100! hov:hover:opacity-70 active:scale-95"
        title={this.title()}
        aria-label={this.title()}
        onClick={this.props.onOpenSync}
      >
        <div
          className={`${iconClass} ${
            phase === "syncing" ? "animate-spin opacity-100" : ""
          } ${phase === "idle" ? "opacity-70" : ""}`}
        ></div>
        {phase === "error" ? (
          <div className="absolute top-[6px] right-[6px] w-[6px] h-[6px] rounded-full bg-[#e5484d] max-[768px]:top-[8px] max-[768px]:right-[8px]"></div>
        ) : null}
      </div>
    );
  }
}
