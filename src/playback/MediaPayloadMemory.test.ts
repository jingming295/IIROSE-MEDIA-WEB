import { describe, expect, it } from "vitest";
import { MediaPayloadMemory } from "./MediaPayloadMemory";

const payload = (title: string) =>
  `&1${JSON.stringify({
    s: "https://a/b.mp3",
    d: 200,
    c: "https://a/c.jpg",
    n: title,
    r: "歌手",
    b: "@0",
    o: "https://music.163.com/#/song?id=1",
    l: "",
  })}`;
const card = (title: string) =>
  JSON.stringify({
    m: `m__4@0>${title}>歌手>https://a/c.jpg>000000>320`,
    mc: "000000",
    i: "1",
  });

describe("播放报文缓存", () => {
  it("报文先到才绑定卡片，命中同时返回两者", () => {
    let room: string | null = "room-a";
    const memory = new MediaPayloadMemory(() => room);
    memory.record(card("甲"));
    memory.record(payload("甲"));
    expect(memory.hit("room-a", "甲")).toEqual({
      card: null,
      payload: payload("甲"),
    });
    memory.record(card("甲"));
    expect(memory.hit("room-a", "甲")).toEqual({
      card: card("甲"),
      payload: payload("甲"),
    });
  });

  it("卡片标题与报文不一致时不返回卡片，避免发错曲目卡片", () => {
    const memory = new MediaPayloadMemory(() => "room-a");
    memory.record(payload("甲"));
    memory.record(card("甲"));
    memory.record(payload("乙"));
    expect(memory.hit("room-a", "乙")).toEqual({
      card: null,
      payload: payload("乙"),
    });
  });

  it("换房间清空缓存，之后重新记录才可命中", () => {
    let room: string | null = "room-a";
    const memory = new MediaPayloadMemory(() => room);
    memory.record(payload("甲"));
    room = "room-b";
    expect(memory.hit("room-a", "甲")).toBeNull();
    memory.record(payload("乙"));
    expect(memory.hit("room-b", "乙")?.payload).toBe(payload("乙"));
  });

  it("房间标识瞬时缺失时既不写入也不清空", () => {
    let room: string | null = "room-a";
    const memory = new MediaPayloadMemory(() => room);
    memory.record(payload("甲"));
    room = null;
    memory.record(payload("乙"));
    // 房间未知时不做判定；缓存也没被清掉，房间恢复后仍可命中。
    expect(memory.hit("room-a", "甲")).toBeNull();
    room = "room-a";
    expect(memory.hit("room-a", "甲")?.payload).toBe(payload("甲"));
  });

  it("忽略非点播报文与缺标题的报文", () => {
    const memory = new MediaPayloadMemory(() => "room-a");
    memory.record('!15["<","1s"]');
    memory.record('{"m":"普通消息","mc":"008000","i":"1"}');
    memory.record("&1不是JSON");
    memory.record(`&1${JSON.stringify({ s: "x" })}`);
    expect(memory.hit("room-a", "任意")).toBeNull();
  });

  it("卡片解析不依赖 JSON 键序", () => {
    const memory = new MediaPayloadMemory(() => "room-a");
    memory.record(payload("甲"));
    memory.record(
      JSON.stringify({ mc: "000000", i: "1", m: "m__4@0>甲>歌手" }),
    );
    expect(memory.hit("room-a", "甲")?.card).toContain("m__4");
  });

  it("超过有效期的报文不再命中", () => {
    let clock = 1_000_000;
    const memory = new MediaPayloadMemory(
      () => "room-a",
      () => clock,
    );
    memory.record(payload("甲"));
    expect(memory.hit("room-a", "甲")).not.toBeNull();
    clock += 6 * 60 * 60 * 1000 + 1;
    expect(memory.hit("room-a", "甲")).toBeNull();
  });

  it("标题比较忽略首尾空白，clear 后不再命中", () => {
    const memory = new MediaPayloadMemory(() => "room-a");
    memory.record(payload("甲"));
    expect(memory.hit("room-a", " 甲 ")?.payload).toBe(payload("甲"));
    memory.clear();
    expect(memory.hit("room-a", "甲")).toBeNull();
  });
});
