import { describe, expect, it } from "vitest";
import {
  constrainPosition,
  coverUrl,
  finiteTime,
  mediaPermission,
  mediaPermissionReason,
  formatTime,
  isSeekCommand,
  seekCommand,
} from "./model";

describe("媒体权限规则", () => {
  it("只接受明确的身份数值或全局角色首字符", () => {
    expect(mediaPermission(0, "4")).toBe("denied");
    for (const rank of [undefined, null, 4, ""])
      expect(mediaPermission(0, rank)).toBe("unknown");
    expect(mediaPermission(1, "4")).toBe("allowed");
    expect(mediaPermission(2, "4")).toBe("allowed");
    expect(mediaPermission(3, "4")).toBe("allowed");
    for (const rank of ["1", "5", "3", "6", "7", "a", "1-admin"])
      expect(mediaPermission(0, rank)).toBe("allowed");
    expect(mediaPermission("1", "4")).toBe("unknown");
    expect(mediaPermission(undefined, undefined)).toBe("unknown");
    expect(mediaPermissionReason("denied")).toBe("当前房间无媒体管理权限");
    expect(mediaPermissionReason("unknown")).toBe(
      "权限信息未就绪，暂时无法调整",
    );
  });
});

describe("进度时间与指令边界", () => {
  it.each([
    [80, 120, 300, '!15[">","40s"]'],
    [120, 80, 300, '!15["<","40s"]'],
    [80, 81, 300, '!15[">","1s"]'],
    [80, 79, 300, '!15["<","1s"]'],
    [80, 140, 300, '!15[">","1m"]'],
    [80, 20, 300, '!15["<","1m"]'],
    [10, -50, 300, '!15["<","10s"]'],
    [280, 340, 300, '!15[">","20s"]'],
    [0, -1, 300, null],
    [80, 80.4, 300, null],
    [80, 200, 300, '!15[">","2m"]'],
    [0, Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 1, null],
  ])("%s → %s / %s = %s", (current, target, duration, expected) => {
    expect(seekCommand(current, target, duration)).toBe(expected);
  });
  it("协议允许正安全整数秒或分钟", () => {
    for (const direction of [">", "<"])
      for (const unit of ["s", "m"])
        for (const amount of [1, 60, Number.MAX_SAFE_INTEGER])
          expect(
            isSeekCommand(
              `!15${JSON.stringify([direction, `${amount}${unit}`])}`,
            ),
          ).toBe(true);
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
