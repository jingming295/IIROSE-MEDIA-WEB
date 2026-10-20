import { afterEach, describe, expect, it, vi } from "vitest";
import { SidebarMediaEntry } from "./SidebarMediaEntry";

const markup = `<div id="functionHolderBox"><div class="functionButtonGroup"><span class="mdi-inbox"></span><span class="functionBtnFont">盒子</span></div><div id="functionHolderExtBox"><div class="functionButtonExt"><div id="radioHolder"><button id="radioPlayButton" class="mdi-pause"></button></div></div><div class="functionButtonExt"><div id="shareMediaBox"><a href="#media">当前媒体</a></div></div></div></div>`;
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};
afterEach(() => {
  document.body.innerHTML = "";
});

describe("侧栏媒体入口", () => {
  it("延迟出现后定向更名，停止电台并保留原媒体事件，重复重建只一个入口", async () => {
    document.body.innerHTML = '<div class="functionBtnFont">盒子</div>';
    const open = vi.fn();
    const adapter = new SidebarMediaEntry(open);
    document.body.insertAdjacentHTML("beforeend", markup);
    const media = document.getElementById("shareMediaBox")!;
    const mediaClick = vi.fn();
    media.addEventListener("click", mediaClick);
    const stop = vi.fn(() => {
      document.getElementById("radioPlayButton")!.className = "mdi-play";
    });
    document.getElementById("radioPlayButton")!.onclick = stop;
    await flush();
    expect(
      document.querySelector("#functionHolderBox .functionBtnFont")!
        .textContent,
    ).toBe("IIROSE-MEDIA-WEB");
    expect(document.querySelector("body > .functionBtnFont")!.textContent).toBe(
      "盒子",
    );
    expect(
      document
        .querySelector("#radioHolder")!
        .parentElement!.classList.contains("imw-hidden-radio"),
    ).toBe(true);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(document.getElementById("shareMediaBox")).toBe(media);
    (media as HTMLElement).click();
    expect(mediaClick).toHaveBeenCalledOnce();
    const entry = document.getElementById("imw-media-progress-entry")!;
    expect(entry.textContent).toBe("播放进度");
    expect(entry.getAttribute("aria-haspopup")).toBe("dialog");
    expect(
      entry
        .querySelector("#imw-progress-entry-icon")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
    entry.click();
    expect(open).toHaveBeenCalledOnce();
    document.querySelector("#functionHolderBox")!.outerHTML = markup;
    await flush();
    expect(document.querySelectorAll("#imw-media-progress-entry")).toHaveLength(
      1,
    );
    document.getElementById("imw-media-progress-entry")!.click();
    expect(open).toHaveBeenCalledTimes(2);
    adapter.dispose();
    expect(document.querySelector("#imw-media-progress-entry")).toBeNull();
    expect(document.querySelector(".imw-hidden-radio")).toBeNull();
    expect(
      document.querySelector("#functionHolderBox .functionBtnFont")!
        .textContent,
    ).toBe("盒子");
  });
  it("真实宿站 functionHolder 中电台延迟展开后隐藏", async () => {
    document.body.innerHTML =
      '<div id="functionHolder"><div id="functionHolderExtBox"><div class="functionButtonExt"><div id="shareMediaBox"></div></div></div></div>';
    const adapter = new SidebarMediaEntry(vi.fn());
    document
      .getElementById("functionHolderExtBox")!
      .insertAdjacentHTML(
        "afterbegin",
        '<div class="functionButtonExt"><div id="radioHolder"></div></div>',
      );
    await flush();
    expect(
      document
        .getElementById("radioHolder")!
        .parentElement!.classList.contains("imw-hidden-radio"),
    ).toBe(true);
    adapter.dispose();
  });
  it("媒体移除清理入口，再插入媒体重新创建；时钟纯文本不触发扫描", async () => {
    document.body.innerHTML = markup;
    const open = vi.fn();
    const adapter = new SidebarMediaEntry(open);
    await flush();
    const box = document.getElementById("functionHolderExtBox")!;
    const scan = vi.spyOn(box, "querySelector");
    const media = document.getElementById("shareMediaBox")!;
    media.innerHTML = '<span id="shareMediaTime">0:01</span>';
    await flush();
    scan.mockClear();
    document.getElementById("shareMediaTime")!.textContent = "0:02";
    await flush();
    expect(scan).not.toHaveBeenCalled();
    const oldEntry = document.getElementById("imw-media-progress-entry")!;
    const card = media.parentElement!;
    media.remove();
    await flush();
    expect(document.getElementById("imw-media-progress-entry")).toBeNull();
    oldEntry.click();
    expect(open).not.toHaveBeenCalled();
    card.appendChild(media);
    await flush();
    expect(document.querySelectorAll("#imw-media-progress-entry")).toHaveLength(
      1,
    );
    expect(document.getElementById("imw-media-progress-entry")).not.toBe(
      oldEntry,
    );
    document.getElementById("imw-media-progress-entry")!.click();
    expect(open).toHaveBeenCalledOnce();
    adapter.dispose();
  });
  it("dispose 取消已排队的适配", async () => {
    const adapter = new SidebarMediaEntry(vi.fn());
    document.body.innerHTML = markup;
    adapter.dispose();
    await flush();
    expect(document.querySelector("#imw-media-progress-entry")).toBeNull();
  });
});
