/** 自动播放共用的时间口径：两个控制器原本各写一份，收敛到这里。 */

/** 到达末尾前的触发窗口基数（秒）。 */
export const END_WINDOW_SECONDS = 5;
/** 窗口占时长的比例上限。 */
export const END_WINDOW_RATIO = 0.25;
/** 极短曲目的窗口下限（秒）。 */
export const END_WINDOW_MIN_SECONDS = 1;

/** 有限数字守卫：NaN/Infinity 会让后续比较静默失效。 */
export function finiteNumber(
  value: number | null | undefined,
): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** 触发窗口：剩余 5 秒，且不超过时长 25%（最短 1 秒）。 */
export function endWindow(duration: number): number {
  if (!finiteNumber(duration) || duration <= 0) return END_WINDOW_MIN_SECONDS;
  return Math.min(
    END_WINDOW_SECONDS,
    Math.max(END_WINDOW_MIN_SECONDS, duration * END_WINDOW_RATIO),
  );
}
