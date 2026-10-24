import { ShowMessage } from "../iirose_func/ShowMessage";
import {
  PlaybackMode,
  PlaybackModeKind,
  PlaybackModeState,
} from "./PlaybackMode";

interface PlaybackControl {
  mode: PlaybackModeKind;
  id: string;
  label: string;
  // MDI repeat / shuffle 路径，图标随按钮自包含，不借用宿站 mdi-* 类。
  icon: string;
}

// 注册表驱动：新增按钮只追加一条，不改布局代码。
const CONTROLS: PlaybackControl[] = [
  {
    mode: "loop",
    id: "imw-toggle-loop",
    label: "单曲循环",
    icon: "M17,17H7V14L3,18L7,22V19H19V13H17M7,7H17V10L21,6L17,2V5H5V11H7V7Z",
  },
  {
    mode: "shuffle",
    id: "imw-toggle-shuffle",
    label: "收藏随机",
    icon: "M14.83,13.41L13.42,14.82L16.55,17.95L14.5,20H20V14.5L17.96,16.54L14.83,13.41M14.5,4L16.54,6.04L4,18.59L5.41,20L17.96,7.46L20,9.5V4M10.59,9.17L5.41,4L4,5.41L9.17,10.58L10.59,9.17Z",
  },
];

// 纯 DOM 行：宿主侧栏布局不进 Preact，只把状态映射到 aria 属性。
export class SidebarPlaybackRow {
  readonly element: HTMLDivElement;
  private buttons = new Map<PlaybackModeKind, HTMLButtonElement>();
  private unsubscribe: () => void;

  constructor(
    private mode: PlaybackMode,
    private doc: Document = document,
  ) {
    this.element = doc.createElement("div");
    this.element.id = "imw-playback-controls";
    this.element.setAttribute("role", "group");
    this.element.setAttribute("aria-label", "播放模式");
    for (const control of CONTROLS) this.element.append(this.create(control));
    this.element.addEventListener("click", this.onClick);
    this.unsubscribe = mode.subscribe((state) => this.render(state));
  }

  private onClick = (event: Event) => {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>("button[data-imw-mode]")
        : null;
    if (!target || !this.element.contains(target)) return;
    const kind = target.dataset.imwMode as PlaybackModeKind | undefined;
    if (!kind) return;
    const availability = this.mode.state[kind];
    if (!availability.enabled) {
      ShowMessage.show(availability.reason || "暂时无法调整播放模式");
      return;
    }
    this.mode.toggle(kind);
  };

  private create(control: PlaybackControl): HTMLButtonElement {
    const button = this.doc.createElement("button");
    button.type = "button";
    button.id = control.id;
    button.dataset.imwMode = control.mode;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-disabled", "false");
    const icon = this.doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "currentColor");
    const path = this.doc.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", control.icon);
    icon.append(path);
    const label = this.doc.createElement("span");
    label.textContent = control.label;
    button.append(icon, label);
    this.buttons.set(control.mode, button);
    return button;
  }

  private render(state: PlaybackModeState) {
    for (const control of CONTROLS) {
      const button = this.buttons.get(control.mode);
      if (!button) continue;
      const availability = state[control.mode];
      button.setAttribute(
        "aria-pressed",
        state.mode === control.mode ? "true" : "false",
      );
      button.setAttribute(
        "aria-disabled",
        availability.enabled ? "false" : "true",
      );
      // 待命（可用但暂时不动作）也通过 title 说明原因。
      button.title = availability.reason || control.label;
    }
  }

  dispose() {
    this.unsubscribe();
    this.element.removeEventListener("click", this.onClick);
    this.element.remove();
  }
}
