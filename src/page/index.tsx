import { render } from "preact";
import { MainAppControlLayer } from "./MainAppControlLayer";
import { MediaProgress } from "./components/media-progress/MediaProgress";
import { HostMediaBridge } from "../media-progress/HostMediaBridge";
import { SidebarMediaEntry } from "../media-progress/SidebarMediaEntry";

let disposeProgress: (() => void) | undefined;

function initMediaProgress() {
  disposeProgress?.();
  const root = document.createElement("div");
  root.id = "imw-media-progress-root";
  // 宿站 mainContainer 和插件主面板都会平移；独立挂到 body。
  document.body.appendChild(root);
  const bridge = new HostMediaBridge();
  let visible = false;
  const close = () => {
    visible = false;
    render(null, root);
  };
  const sidebar = new SidebarMediaEntry(() => {
    if (!visible) {
      visible = true;
      render(<MediaProgress bridge={bridge} close={close} />, root);
    }
    root.querySelector<HTMLElement>("#imw-media-progress")?.focus();
  });
  const dispose = () => {
    close();
    sidebar.dispose();
    bridge.dispose();
    root.remove();
    window.removeEventListener("pagehide", dispose);
  };
  window.addEventListener("pagehide", dispose);
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
