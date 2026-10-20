export class IIROSEUtils {
  /**
   * 开启输入框
   * @param e 模式, 0,1,2,3,4
   * @param t t[0] 为标题，t[1] 如果是数字，那就是字数限制，如果是'number'，那么开启的输入框会是数字输入框，t[2] 为字数限制
   * @param o 回调函数
   * @returns
   */
  public static sync(
    e: number,
    t: (number | string)[],
    o: (userInput: string | null) => void,
  ) {
    if (!window.Utils) return;
    window.Utils.sync(e, t, o);

    const syncHolder = document.getElementById("syncHolder");

    if (syncHolder) {
      let syncHolderOutside = document.getElementById("syncHolderOutside");
      if (!syncHolderOutside) {
        syncHolderOutside = document.createElement("div");
        syncHolderOutside.id = "syncHolderOutside";
        syncHolderOutside.onclick = () => {
          const syncPromptHolder = syncHolder.childNodes[0];
          const contentItemBtn = syncPromptHolder.childNodes[3];
          const cancelBtn = contentItemBtn.childNodes[0] as HTMLButtonElement;
          if (cancelBtn) cancelBtn.click();
        };
        syncHolder.appendChild(syncHolderOutside);
      }
    }
  }

  /**
   * 创建一个选择框
   * @param i 触发元素
   * @param a 2D数组，结构为类似 [[0, "选项1", "HTML字符串"], [1, "选项2", "HTML字符串"]]
   * @param s 回调函数
   * @param e 是否禁止清空选项 (禁止点空白的地方返回)
   * @param t 是否显示图标
   * @param o 自定义HTML字符串，出现在顶端
   * @param r 是否启用多选功能
   * @param l 自定义HTML字符串，出现在底端
   * @param n 返回（点击空白处）的回调函数
   */
  public static buildSelect2(
    i: HTMLElement | undefined | null,
    a: (string | number)[][],
    s: (t: HTMLElement, s: any) => void,
    e: boolean,
    t: boolean,
    o: string | undefined | null,
    r: boolean,
    l: string | undefined | null,
    n: () => void,
  ) {
    if (!window.Utils) return;
    window.Utils.buildSelect2(i, a, s, e, t, o, r, l, n);

    if (r) {
      setTimeout(() => {
        try {
          const selectHolderBox =
            (window as any).Objs?.selectHolder?.selectHolderBox?.[0] ||
            document.getElementById("selectHolderBox");
          if (!selectHolderBox) return;

          const items = Array.from(
            selectHolderBox.querySelectorAll(".selectHolderBoxItem"),
          ) as HTMLElement[];
          if (items.length <= 1) return;

          const optionCount = a.length;
          const confirmBtn = items[optionCount] || items[items.length - 1];

          // 确定按钮在最下方吸底固定显示：
          // 当内容超出视口时保持悬停在弹窗底部随时可点，滚到底部时平滑停靠在最后一项下方
          if (confirmBtn) {
            confirmBtn.style.position = "sticky";
            confirmBtn.style.bottom = "0";
            confirmBtn.style.zIndex = "10";
            confirmBtn.style.backdropFilter = "blur(10px)";
            const boxBg =
              window.getComputedStyle(selectHolderBox).backgroundColor;
            confirmBtn.style.backgroundColor =
              boxBg && boxBg !== "rgba(0, 0, 0, 0)" && boxBg !== "transparent"
                ? boxBg
                : "rgba(32, 32, 32, 0.95)";
            confirmBtn.style.borderTop = "1px solid rgba(128, 128, 128, 0.25)";
          }

          // 初始进入滚动到顶部方便用户从前选起
          selectHolderBox.scrollTop = 0;

          // 维护用户选取的顺序队列 (保存选项索引 0 <= idx < optionCount)
          const selectedQueue: number[] = [];

          // 刷新全部选项的选中状态与序号徽章 (1, 2, 3, 4, 5...)
          const updateVisuals = () => {
            for (let idx = 0; idx < optionCount; idx++) {
              const itemEl = items[idx];
              if (!itemEl) continue;

              const touchBox =
                itemEl.querySelector(".fullBox.whoisTouch3") ||
                itemEl.lastElementChild;
              const iconEl = touchBox?.firstElementChild as HTMLElement;

              const orderIdx = selectedQueue.indexOf(idx);
              if (orderIdx !== -1) {
                // 选中状态：显示选取序号 (1, 2, 3...)，整行高亮
                const orderNum = orderIdx + 1;
                itemEl.style.backgroundColor = "rgba(30, 136, 229, 0.12)";
                if (iconEl) {
                  iconEl.className = "";
                  iconEl.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#1e88e5;color:#fff;font-size:15px;font-weight:bold;box-shadow:0 2px 5px rgba(0,0,0,0.3);font-family:sans-serif;vertical-align:middle;">${orderNum}</span>`;
                  iconEl.style.lineHeight = "100px";
                  iconEl.style.textAlign = "center";
                }
              } else {
                // 未选中状态：恢复原生空心复选框，清除行高亮
                itemEl.style.backgroundColor = "";
                if (iconEl) {
                  iconEl.className = "mdi-checkbox-blank-outline";
                  iconEl.innerHTML = "";
                  iconEl.style.fontFamily = "md";
                  iconEl.style.fontSize = "28px";
                  iconEl.style.lineHeight = "100px";
                  iconEl.style.textAlign = "center";
                }
              }
            }
          };

          // 接管选项点击事件，记录并实时更新选取顺序
          for (let idx = 0; idx < optionCount; idx++) {
            const itemEl = items[idx];
            if (!itemEl) continue;

            itemEl.onclick = (ev: MouseEvent) => {
              ev.stopPropagation();

              const pos = selectedQueue.indexOf(idx);
              if (pos !== -1) {
                // 再次点击已选中的项：取消选中，其余已选项目的序号自动前移重排
                selectedQueue.splice(pos, 1);
              } else {
                // 点击未选中项：追加到队列末尾，分配最新序号
                selectedQueue.push(idx);
              }

              updateVisuals();
            };
          }

          // 接管最下方的确定按钮点击事件，严格按用户选取顺序返回选中的值
          if (confirmBtn) {
            confirmBtn.onclick = (ev: MouseEvent) => {
              ev.stopPropagation();

              const touchBox = confirmBtn.lastElementChild as HTMLElement;
              if (touchBox) touchBox.className = "fullBox bgColorActive";

              // 按照用户点击的先后顺序映射出选中的值
              const orderedResult = selectedQueue.map((idx) => a[idx][0]);

              if (s) {
                s(i as any, orderedResult);
              }

              const d = (window as any).Objs?.selectHolder;
              if (d && !(window as any).Probe?.keepSelectOpen) {
                d.This.stop().fadeOut(250, function () {
                  d.selectHolderBox.empty();
                });
                d.selectHolderBox.css("transform", "scale(0.9)");
              }
            };
          }
        } catch (err) {
          console.error(
            "[IIROSEUtils] Sequential multi-select setup failed:",
            err,
          );
        }
      }, 0);
    }
  }

  /**
   * 生成带封面的图标 HTML（带圆角和优雅降级）
   * @param src 封面图片地址
   * @param fallbackIcon 兜底图标的 class，如 'mdi-music-note' 或 'mdi-video'
   */
  public static generatePicHtml(
    src?: string,
    fallbackIcon: string = "mdi-music-note",
  ): string {
    const safeSrc = src ? src.replace(/^http:\/\//, "https://").trim() : "";
    const fallbackHtml = `<div class="${fallbackIcon}" style="font-family:md;font-size:28px;text-align:center;line-height:100px;height:100px;width:100px;position:absolute;top:0;opacity:.7;left:0;"></div>`;

    if (!safeSrc) {
      return fallbackHtml;
    }

    return (
      `<div style="height:100px;width:100px;position:absolute;top:0;left:0;">` +
      `<div class="bgImgBox" style="border-radius:8px !important;overflow:hidden;margin:12px;width:76px;height:76px;background:rgba(0,0,0,0.2);">` +
      `<img class="bgImg" loading="lazy" decoding="async" src="${safeSrc}" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='block';" style="width:100%;height:100%;object-fit:cover;">` +
      `<div class="${fallbackIcon}" style="display:none;font-family:md;font-size:26px;text-align:center;line-height:76px;height:76px;width:76px;position:absolute;top:0;left:0;opacity:.7;"></div>` +
      `<div class="fullBox"></div>` +
      `</div></div>`
    );
  }

  public static getUserCard(uid: string) {
    if (!window.Utils) return;
    const a = document.createElement("span");
    a.innerHTML = uid;
    a.className = `followName2`;
    window.Utils.service.getUserCard.call(a, uid, 1);
  }
}
