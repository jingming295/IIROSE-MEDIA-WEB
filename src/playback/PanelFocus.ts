/** 面板当前看到的位置；侧栏在 Preact 树之外，只能经这个模块级 store 读取。 */
export interface PanelFocus {
  category: number;
  platform: number;
}

export type FocusPlatform = "netease" | "bilibili" | null;

let focus: PanelFocus | null = null;

export function setPanelFocus(next: PanelFocus | null): void {
  focus = next ? { category: next.category, platform: next.platform } : null;
}

export function readPanelFocus(): PanelFocus | null {
  return focus ? { ...focus } : null;
}

export function resetPanelFocus(): void {
  focus = null;
}

/**
 * 焦点平台映射：音乐分类第 1 个平台是网易云，视频分类第 1 个是 B 站；
 * 无线电广播、多源剧集、设置与关于页没有收藏。
 */
export function platformOf(
  current: PanelFocus | null,
  defaultPage: number,
): FocusPlatform {
  const category = current?.category ?? defaultPage;
  const platform = current?.platform ?? 0;
  if (category === 0 && platform === 0) return "netease";
  if (category === 1 && platform === 0) return "bilibili";
  return null;
}
