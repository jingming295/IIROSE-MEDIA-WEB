import { roomIdentifier } from "../media-progress/model";

/** 插件自己发出的点播报文与卡片；只有缓存命中才允许重播。 */
export interface MediaPayloadHit {
  card: string | null;
  payload: string;
}

const PAYLOAD_PREFIX = "&1";
/** 老报文有效期：超过后不再用于重播（流地址可能已失效）。 */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

function payloadTitle(text: string): string {
  try {
    const name = (
      JSON.parse(text.slice(PAYLOAD_PREFIX.length)) as { n?: unknown }
    ).n;
    return typeof name === "string" ? name.trim() : "";
  } catch {
    return "";
  }
}

/** 卡片标题取自 `m` 字段第二段（`m__4@0>曲名>歌手>...`）。 */
function cardTitle(text: string): string {
  try {
    const parsed = JSON.parse(text) as { m?: unknown };
    const media = typeof parsed.m === "string" ? parsed.m : "";
    if (!media.startsWith("m__4")) return "";
    return (media.split(">")[1] || "").trim();
  } catch {
    return "";
  }
}

/**
 * 按房间缓存最近一次点播报文与卡片（卡片绑定到同一标题）。
 * 只由 `Socket.send` 的观察钩子写入，不做任何网络行为。
 */
export class MediaPayloadMemory {
  private roomKey: string | null = null;
  private payload: { text: string; title: string; at: number } | null = null;
  private card: { text: string; title: string } | null = null;
  // 卡片先于报文到达（各平台都是先发卡片再发 mediaEvent）：先缓存，等报文到再绑定。
  private pendingCard: { text: string; title: string } | null = null;

  constructor(
    private roomOf: () => string | null = () =>
      roomIdentifier(typeof window === "undefined" ? null : window.roomnFull),
    private now: () => number = () => Date.now(),
  ) {}

  record(text: string): void {
    const room = this.roomOf();
    // 房间标识瞬时缺失时既不写入也不清空（与 PlaybackMode 的「null 视为未变化」一致）。
    if (room === null) return;
    if (room !== this.roomKey) {
      this.roomKey = room;
      this.payload = null;
      this.card = null;
      this.pendingCard = null;
    }
    if (text.startsWith(PAYLOAD_PREFIX)) {
      const title = payloadTitle(text);
      if (!title) return;
      this.payload = { text, title, at: this.now() };
      // 上一首的卡片不能配给这一首；同曲的「先到卡片」在这里绑定。
      if (this.card && this.card.title !== title) this.card = null;
      if (!this.card && this.pendingCard?.title === title)
        this.card = this.pendingCard;
      this.pendingCard = null;
      return;
    }
    if (text.startsWith("{")) {
      const title = cardTitle(text);
      if (!title) return;
      // 卡片只在与当前报文同曲时才有用（summary 档会抑制逐曲卡片）。
      if (this.payload && this.payload.title === title)
        this.card = { text, title };
      else if (!this.payload) this.pendingCard = { text, title };
    }
  }

  hit(roomKey: string | null, title: string): MediaPayloadHit | null {
    if (!this.payload || roomKey === null) return null;
    // 房间在记录之后变过即视为过期：旧房间的报文不能在新房间重播。
    if (roomKey !== this.roomKey || this.roomOf() !== this.roomKey) return null;
    if (this.now() - this.payload.at > MAX_AGE_MS) return null;
    if (!title || title.trim() !== this.payload.title) return null;
    const card =
      this.card && this.card.title === this.payload.title
        ? this.card.text
        : null;
    return { card, payload: this.payload.text };
  }

  clear(): void {
    this.roomKey = null;
    this.payload = null;
    this.card = null;
    this.pendingCard = null;
  }
}
