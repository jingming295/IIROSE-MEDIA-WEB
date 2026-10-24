import { render } from "preact";
import { MainAppControlLayer } from "./MainAppControlLayer";
import { MediaProgress } from "./components/media-progress/MediaProgress";
import { HostMediaBridge } from "../media-progress/HostMediaBridge";
import { SidebarMediaEntry } from "../media-progress/SidebarMediaEntry";
import { PlaybackMode } from "../playback/PlaybackMode";
import { SidebarPlaybackRow } from "../playback/SidebarPlaybackRow";
import {
  readMediaProgressPosition,
  saveMediaProgressPosition,
} from "../media-progress/PositionStorage";

let disposeProgress: (() => void) | undefined;

// 页面级单例键：模块级 disposeProgress 只在同一份 bundle 内有效，重复注入（另一份
// 模块实例、热更新残留）感知不到它。后注入者先释放前一份控制器再接管。
const CONTROLLER_KEY = "__imwMediaProgressController";
type ControllerWindow = Window & { [CONTROLLER_KEY]?: () => void };

// 释放旧实例并清掉它可能残留的节点：即使旧 dispose 抛错也不允许出现双行。
function releasePlaybackController(page: ControllerWindow) {
  const previous = page[CONTROLLER_KEY];
  delete page[CONTROLLER_KEY];
  try {
    previous?.();
  } catch {
    /* 旧实例已不可用；残留节点由下面按 id 清除 */
  }
  for (const id of [
    "imw-playback-controls",
    "imw-media-progress-entry",
    "imw-media-progress-root",
  ])
    document.getElementById(id)?.remove();
}

function initMediaProgress() {
  disposeProgress?.();
  disposeProgress = undefined;
  const page = window as ControllerWindow;
  releasePlaybackController(page);
  const root = document.createElement("div");
  root.id = "imw-media-progress-root";
  // 宿站 mainContainer 和插件主面板都会平移；独立挂到 body。
  document.body.appendChild(root);
  const bridge = new HostMediaBridge();
  const playback = new PlaybackMode();
  const playbackRow = new SidebarPlaybackRow(playback);
  let visible = false;
  let lastPosition = readMediaProgressPosition();
  const close = (restoreFocus = true) => {
    saveMediaProgressPosition(lastPosition);
    visible = false;
    render(null, root);
    const entry = document.getElementById("imw-media-progress-entry");
    if (
      restoreFocus &&
      entry?.getClientRects().length &&
      getComputedStyle(entry).visibility === "visible"
    )
      entry.focus({ preventScroll: true });
  };
  const sidebar = new SidebarMediaEntry(
    () => {
      if (!visible) {
        visible = true;
        render(
          <MediaProgress
            bridge={bridge}
            close={close}
            initialPosition={lastPosition}
            onPositionChange={(position) => {
              lastPosition = position;
              saveMediaProgressPosition(position);
            }}
          />,
          root,
        );
      }
      root.querySelector<HTMLElement>("#imw-media-progress")?.focus();
    },
    document,
    playbackRow.element,
    (present) => playback.setMediaPresent(present),
  );
  const unsubscribePlayback = bridge.subscribe((snapshot) =>
    playback.applySnapshot(snapshot),
  );
  const onPageHide = (event: PageTransitionEvent) => {
    saveMediaProgressPosition(lastPosition);
    if (!event.persisted) dispose();
  };
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    close(false);
    lastPosition = undefined;
    // 释放顺序：先断订阅，再让状态机与适配器、行、桥接依次停摆。
    // 行元素由 SidebarPlaybackRow 自己移除，SidebarMediaEntry 只解除适配。
    unsubscribePlayback();
    playback.dispose();
    sidebar.dispose();
    playbackRow.dispose();
    bridge.dispose();
    root.remove();
    window.removeEventListener("pagehide", onPageHide);
    // 只摘掉属于自己的标记：后注入者接管后这里不能清掉新实例。
    if (page[CONTROLLER_KEY] === dispose) delete page[CONTROLLER_KEY];
  };
  window.addEventListener("pagehide", onPageHide);
  page[CONTROLLER_KEY] = dispose;
  disposeProgress = dispose;
}

export class IMCInit {
  public static init(mc: HTMLDivElement) {
    const container = document.createElement("div");
    mc.appendChild(container);
    render(<MainAppControlLayer />, container);
    initMediaProgress();
  }
}
