import { describe, expect, it } from "vitest";
import {
  constrainPosition,
  coverUrl,
  finiteTime,
  mediaPermission,
  mediaPermissionReason,
  formatTime,
  isAbsoluteSeekCommand,
  isSeekCommand,
  absoluteSeekCommand,
  absoluteSeekTarget,
  ownMediaOf,
  roomIdentifier,
  seekCommand,
} from "./model";

describe("点播归属与房间标识", () => {
  it.each([
    ["测试账号", "测试账号", true],
    ["  测试账号  ", " 测试账号 ", true],
    ["测试账号", "测试账号2", false],
    ["测试帐号", "测试账号", false],
    ["", "", false],
    ["   ", "   ", false],
    ["测试账号", "", false],
    ["", "测试账号", false],
    ["测试账号", undefined, false],
    ["测试账号", null, false],
    ["测试账号", 42, false],
    [undefined, "测试账号", false],
    [null, "测试账号", false],
    [42, "测试账号", false],
  ])("ownMediaOf(%j, %j) = %s", (owner, myself, expected) => {
    expect(ownMediaOf(owner, myself)).toBe(expected);
  });

  it.each([
    ["room-a", "room-a"],
    ["  room-a  ", "room-a"],
    ["", null],
    ["   ", null],
    [1024, "1024"],
    [0, "0"],
    [-3, "-3"],
    [NaN, null],
    [Infinity, null],
    [true, null],
    [{ id: 1 }, null],
    [undefined, null],
    [null, null],
  ])("roomIdentifier(%j) = %j", (value, expected) => {
    expect(roomIdentifier(value)).toBe(expected);
  });
});

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
  it("绝对定位允许零秒与正安全整数秒，并限制目标范围", () => {
    expect(absoluteSeekCommand(0, 300)).toBe('!16["0s"]');
    expect(absoluteSeekCommand(120, 300)).toBe('!16["120s"]');
    expect(absoluteSeekCommand(-10, 300)).toBe('!16["0s"]');
    expect(absoluteSeekCommand(400, 300)).toBe('!16["300s"]');
    expect(absoluteSeekCommand(0.4, 300)).toBe('!16["0s"]');
    expect(absoluteSeekCommand(Infinity, 300)).toBeNull();
    expect(absoluteSeekCommand(0, Infinity)).toBeNull();
    for (const target of [0, 1, 60, Number.MAX_SAFE_INTEGER])
      expect(
        isAbsoluteSeekCommand(`!16${JSON.stringify([`${target}s`])}`),
      ).toBe(true);
  });
  it.each([
    [300.8, 300.8, 300],
    [301, 300.8, 300],
    [0.8, 0.8, 0],
    [0, 0.8, 0],
    [10.6, 300.8, 11],
  ])("绝对目标 %s / %s 归一化为合法整数 %s", (target, duration, expected) => {
    expect(absoluteSeekTarget(target, duration)).toBe(expected);
    expect(absoluteSeekCommand(target, duration)).toBe(`!16["${expected}s"]`);
  });
  it.each([
    [NaN, 300],
    [Infinity, 300],
    [0, NaN],
    [0, Infinity],
    [0, 0],
    [0, -1],
    [Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 1],
  ])("拒绝非法绝对目标或时长 %s / %s", (target, duration) => {
    expect(absoluteSeekTarget(target, duration)).toBeNull();
    expect(absoluteSeekCommand(target, duration)).toBeNull();
  });
  it("绝对定位拒绝相对协议、前导零和非法值", () => {
    for (const command of [
      '!15[">","1s"]',
      '!16["01s"]',
      '!16["1.5s"]',
      '!16["-1s"]',
      '!16["Infinitys"]',
      '!16["1m"]',
      '!16["1s","extra"]',
      '!16["1s"]\n',
    ])
      expect(isAbsoluteSeekCommand(command)).toBe(false);
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
    expect(constrainPosition(0, 0, 100, 100, 400, 300, 40, 20)).toEqual({
      x: 52,
      y: 32,
    });
  });
});
