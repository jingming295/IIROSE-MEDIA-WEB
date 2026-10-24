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

function initMediaProgress() {
  disposeProgress?.();
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
  );
  const unsubscribePlayback = bridge.subscribe((snapshot) =>
    playback.applySnapshot(snapshot),
  );
  const onPageHide = (event: PageTransitionEvent) => {
    saveMediaProgressPosition(lastPosition);
    if (!event.persisted) dispose();
  };
  const dispose = () => {
    close(false);
    lastPosition = undefined;
    unsubscribePlayback();
    playback.dispose();
    sidebar.dispose();
    playbackRow.dispose();
    bridge.dispose();
    root.remove();
    window.removeEventListener("pagehide", onPageHide);
  };
  window.addEventListener("pagehide", onPageHide);
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
