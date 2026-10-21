export class SidebarMediaEntry {
  private observer: MutationObserver;
  private queued = false;
  private disposed = false;
  private entry?: HTMLButtonElement;
  private renamed = new Map<Element, string>();
  private hidden = new Set<HTMLElement>();

  constructor(
    private open: () => void,
    private doc: Document = document,
  ) {
    this.observer = new MutationObserver((records) => {
      // 只响应侧栏或承载侧栏节点的增删，不跟踪聊天消息和媒体时钟文本。
      if (
        records.some((record) => {
          const target =
            record.target instanceof Element
              ? record.target
              : record.target.parentElement;
          if (
            target?.closest("#shareMediaBox") &&
            [...record.addedNodes, ...record.removedNodes].every(
              (node) => node.nodeType === Node.TEXT_NODE,
            )
          )
            return false;
          if (
            target?.closest(
              "#functionHolder, #functionHolderBox, #functionHolderExtBox",
            )
          )
            return true;
          return [...record.addedNodes].some(
            (node) =>
              node instanceof Element &&
              (node.matches("#functionHolderBox, #functionHolderExtBox") ||
                node.querySelector("#functionHolderExtBox")),
          );
        })
      )
        this.schedule();
    });
    this.observer.observe(doc.body, { childList: true, subtree: true });
    doc.addEventListener("play", this.onRadioPlay, true);
    this.adapt();
  }

  private onRadioPlay = (event: Event) => {
    if (event.target === this.doc.getElementById("radioPlayer"))
      this.stopRadio();
  };

  private stopRadio() {
    const button = this.doc.getElementById("radioPlayButton");
    // 宿站原 onclick 同时 pause 电台、移除 mp 并 muteSound(1,1) 恢复音量。
    if (button?.className === "mdi-pause") button.click();
  }

  private isDarkSidebar(element: Element): boolean {
    const sidebar = element.closest<HTMLElement>("#functionHolder") || element;
    const color =
      this.doc.defaultView?.getComputedStyle(sidebar).backgroundColor;
    const match = color?.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);
    if (!match) return false;
    const [, red, green, blue] = match.map(Number);
    return red * 299 + green * 587 + blue * 114 < 128000;
  }

  private schedule() {
    if (this.queued || this.disposed) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      if (!this.disposed) this.adapt();
    });
  }

  private adapt() {
    const box = this.doc.getElementById("functionHolderExtBox");
    if (!box) return;
    const scope = box.closest("#functionHolderBox") || box.parentElement;
    scope?.querySelectorAll(".functionButtonGroup").forEach((group) => {
      const title = group.querySelector(".functionBtnFont");
      if (
        group.querySelector(".mdi-inbox") &&
        title?.textContent?.trim() === "盒子"
      ) {
        this.renamed.set(title, title.textContent);
        title.textContent = "IIROSE-MEDIA-WEB";
      }
    });
    const radio = box
      .querySelector("#radioHolder")
      ?.closest<HTMLElement>(".functionButtonExt");
    if (radio) {
      this.stopRadio();
      radio.classList.add("imw-hidden-radio");
      this.hidden.add(radio);
    }
    const media = box
      .querySelector("#shareMediaBox")
      ?.closest(".functionButtonExt");
    if (!media) {
      this.entry?.removeEventListener("click", this.open);
      this.entry?.remove();
      this.entry = undefined;
      return;
    }
    if (!this.entry) {
      this.entry = this.doc.createElement("button");
      this.entry.type = "button";
      this.entry.id = "imw-media-progress-entry";
      this.entry.setAttribute("aria-haspopup", "dialog");
      const icon = this.doc.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      icon.id = "imw-progress-entry-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("fill", "none");
      icon.setAttribute("stroke", "currentColor");
      icon.setAttribute("stroke-width", "1.6");
      icon.setAttribute("stroke-linecap", "round");
      const track = this.doc.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      track.setAttribute("d", "M3 8h10m4 0h4M3 16h4m4 0h10M13 5v6M7 13v6");
      icon.append(track);
      const label = this.doc.createElement("span");
      label.textContent = "播放进度";
      this.entry.append(icon, label);
      this.entry.addEventListener("click", this.open);
    }
    this.entry.dataset.imwTheme = this.isDarkSidebar(box) ? "dark" : "light";
    if (media.nextElementSibling !== this.entry) media.after(this.entry);
  }

  dispose() {
    this.disposed = true;
    this.observer.disconnect();
    this.doc.removeEventListener("play", this.onRadioPlay, true);
    this.entry?.removeEventListener("click", this.open);
    this.entry?.remove();
    this.renamed.forEach((text, element) => {
      if (element.textContent === "IIROSE-MEDIA-WEB")
        element.textContent = text;
    });
    this.hidden.forEach((element) =>
      element.classList.remove("imw-hidden-radio"),
    );
    this.renamed.clear();
    this.hidden.clear();
  }
}
