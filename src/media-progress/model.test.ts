import { describe, expect, it } from "vitest";
import {
  constrainPosition,
  coverUrl,
  finiteTime,
  formatTime,
  seekCommand,
} from "./model";

describe("进度时间与指令边界", () => {
  it.each([
    [80, 120, 300, "快进40s"],
    [120, 80, 300, "快退40s"],
    [80, 81, 300, "快进1s"],
    [80, 79, 300, "快退1s"],
    [80, 140, 300, "快进1m"],
    [80, 20, 300, "快退1m"],
    [10, -50, 300, "快退10s"],
    [280, 340, 300, "快进20s"],
    [0, -1, 300, null],
    [80, 80.4, 300, null],
    [80, 200, 300, "快进2m"],
  ])("%s → %s / %s = %s", (current, target, duration, expected) => {
    expect(seekCommand(current, target, duration)).toBe(expected);
  });
  it("不猜测未知和无效时间", () => {
    for (const value of [undefined, null, "", "直播", Infinity, -1, NaN])
      expect(finiteTime(value)).toBeNull();
    expect(finiteTime("123.5")).toBe(123.5);
    expect(formatTime(3661)).toBe("1:01:01");
    expect(formatTime(null)).toBe("--:--");
    expect(seekCommand(0, 1, Infinity)).toBeNull();
  });
  it("封面升级与视口边界", () => {
    expect(coverUrl("http://example.com/cover.jpg")).toBe(
      "https://example.com/cover.jpg",
    );
    expect(coverUrl("javascript:alert(1)")).toBe("");
    expect(constrainPosition(900, -5, 320, 250, 400, 800)).toEqual({
      x: 68,
      y: 12,
    });
    expect(constrainPosition(900, 900, 320, 250, 400, 300)).toEqual({
      x: 68,
      y: 38,
    });
  });
});
