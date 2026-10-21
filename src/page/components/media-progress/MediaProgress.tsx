import { useEffect, useRef, useState } from "preact/hooks";
import { HostMediaBridge } from "../../../media-progress/HostMediaBridge";
import {
  ProgressSession,
  ProgressState,
} from "../../../media-progress/ProgressSession";
import {
  constrainPosition,
  formatTime,
  unavailableReason,
} from "../../../media-progress/model";

const controlClass =
  "min-h-[44px] min-w-[44px] cursor-pointer rounded-xl border-0 bg-black/5 px-2 font-[inherit] text-[13px] text-inherit hov:bg-black/10 focus-visible:outline-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-35";

export function MediaProgress({
  bridge,
  close,
}: {
  bridge: HostMediaBridge;
  close: () => void;
}) {
  const [state, setState] = useState<ProgressState>({
    media: bridge.read(),
    preview: null,
    waiting: false,
    message: "",
  });
  const [position, setPosition] = useState({ x: 12, y: 80 });
  const [dragging, setDragging] = useState(false);
  const [failedCover, setFailedCover] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const session = useRef<ProgressSession>();
  const move = useRef<{
    pointer: number;
    x: number;
    y: number;
    left: number;
    top: number;
  }>();
  const seekPointer = useRef<number>();
  const inputSource = useRef<"pointer" | "keyboard" | "native" | null>(null);
  const media = state.media;
  const unavailable = unavailableReason(media);
  const disabled = !!unavailable || state.waiting;
  const time = state.preview ?? media.current;

  useEffect(() => {
    const active = new ProgressSession(bridge, setState);
    session.current = active;
    panel.current?.focus();
    const cancel = () => {
      active.cancel();
      seekPointer.current = undefined;
      move.current = undefined;
      setDragging(false);
    };
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("blur", cancel);
      active.dispose();
      session.current = undefined;
    };
  }, [bridge]);

  useEffect(() => {
    const constrain = () => {
      const element = panel.current;
      if (!element) return;
      // 宿站通过 zoom 缩放 iframe 文档；offset 尺寸与 client 坐标转换用实测比例。
      const rect = element.getBoundingClientRect();
      const scale = rect.width / element.offsetWidth || 1;
      const viewport = window.visualViewport;
      const width = (viewport?.width || window.innerWidth) / scale;
      const height = (viewport?.height || window.innerHeight) / scale;
      element.style.maxWidth = `${Math.max(0, width - 24)}px`;
      element.style.maxHeight = `${Math.max(0, height - 24)}px`;
      setPosition((previous) =>
        constrainPosition(
          previous.x,
          previous.y,
          element.offsetWidth,
          element.offsetHeight,
          width,
          height,
        ),
      );
    };
    constrain();
    window.addEventListener("resize", constrain);
    window.visualViewport?.addEventListener("resize", constrain);
    const observer = new ResizeObserver(constrain);
    if (panel.current) observer.observe(panel.current);
    return () => {
      window.removeEventListener("resize", constrain);
      window.visualViewport?.removeEventListener("resize", constrain);
      observer.disconnect();
    };
  }, []);

  const pointerTarget = (element: HTMLInputElement, clientX: number) => {
    const rect = element.getBoundingClientRect();
    session.current?.preview(
      ((clientX - rect.left) / rect.width) * (media.duration || 0),
    );
  };

  return (
    <div
      ref={panel}
      id="imw-media-progress"
      role="dialog"
      aria-label="播放进度"
      tabIndex={-1}
      className={`fixed z-[90001] w-[320px] overflow-auto rounded-2xl border border-solid p-3 font-sans text-[14px] shadow-[0_12px_40px_rgba(0,0,0,0.25)] outline-none max-[768px]:w-[320px] ${media.dark ? "border-white/15 bg-[#242a34] text-[#f4f6fa]" : "border-black/10 bg-[#fafbfe] text-[#253047]"}`}
      style={{ left: position.x, top: position.y }}
      onKeyDown={(event) => {
        if (
          event.key !== "Escape" ||
          event.isComposing ||
          event.defaultPrevented
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        if (session.current?.state.preview !== null && session.current) {
          session.current.cancel();
          seekPointer.current = undefined;
        } else if (!event.repeat) close();
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <div
          className={`flex min-h-[44px] min-w-0 flex-1 touch-none select-none items-center gap-2 rounded-lg px-1 ${dragging ? "cursor-grabbing bg-sky-500/15" : "cursor-grab"}`}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            const scale =
              panel.current!.getBoundingClientRect().width /
                panel.current!.offsetWidth || 1;
            move.current = {
              pointer: event.pointerId,
              x: event.clientX / scale,
              y: event.clientY / scale,
              left: position.x,
              top: position.y,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
          }}
          onPointerMove={(event) => {
            const start = move.current;
            const element = panel.current;
            if (!start || start.pointer !== event.pointerId || !element) return;
            const scale =
              element.getBoundingClientRect().width / element.offsetWidth || 1;
            setPosition(
              constrainPosition(
                start.left + event.clientX / scale - start.x,
                start.top + event.clientY / scale - start.y,
                element.offsetWidth,
                element.offsetHeight,
                (window.visualViewport?.width || window.innerWidth) / scale,
                (window.visualViewport?.height || window.innerHeight) / scale,
              ),
            );
          }}
          onPointerUp={() => {
            move.current = undefined;
            setDragging(false);
          }}
          onPointerCancel={() => {
            move.current = undefined;
            setDragging(false);
          }}
          onLostPointerCapture={() => {
            move.current = undefined;
            setDragging(false);
          }}
        >
          <span
            id="imw-progress-icon"
            className="text-[22px] text-sky-500"
            aria-hidden="true"
          />
          <span className="font-semibold">播放进度</span>
          <span className="ml-auto text-[16px] opacity-40" aria-hidden="true">
            ⠿
          </span>
        </div>
        <button
          type="button"
          className={controlClass}
          aria-label="关闭播放进度"
          onClick={close}
        >
          ×
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sky-500/15">
          {media.playing && media.cover && failedCover !== media.cover ? (
            <img
              className="h-full w-full object-cover"
              src={media.cover}
              alt=""
              onError={() => setFailedCover(media.cover)}
            />
          ) : (
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <path d="M9 18V5l11-2v13M9 8l11-2" />
              <ellipse cx="6" cy="18" rx="3" ry="2.5" />
              <ellipse cx="17" cy="16" rx="3" ry="2.5" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="truncate font-semibold"
            title={media.playing ? media.title : "暂无播放内容"}
          >
            {media.playing ? media.title : "暂无播放内容"}
          </div>
          <div className="mt-1 text-[12px] tabular-nums opacity-65">
            {formatTime(media.playing ? time : null)} /{" "}
            {formatTime(media.playing ? media.duration : null)}
            {state.preview !== null ? " · 预览" : ""}
          </div>
        </div>
      </div>
      <input
        type="range"
        aria-label="媒体播放位置"
        aria-valuetext={`${formatTime(time)} / ${formatTime(media.duration)}`}
        min={0}
        max={media.duration || 1}
        step={1}
        value={time ?? 0}
        disabled={disabled}
        className="m-0 mt-2 h-[44px] w-full touch-none cursor-pointer accent-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
        onInput={(event) => {
          if (
            seekPointer.current !== undefined ||
            (inputSource.current === "keyboard" &&
              session.current?.state.preview !== null)
          )
            return;
          const active = session.current;
          if (!active || active.state.waiting) return;
          const target = event.currentTarget.valueAsNumber;
          if (active.state.preview === null && !active.begin()) return;
          inputSource.current = "native";
          active.preview(target);
        }}
        onChange={(event) => {
          if (
            inputSource.current === "pointer" ||
            inputSource.current === "keyboard"
          )
            return;
          const active = session.current;
          if (!active || active.state.waiting) return;
          const target = event.currentTarget.valueAsNumber;
          if (inputSource.current === "native" && active.state.preview === null)
            return;
          if (inputSource.current !== "native") {
            if (
              active.state.preview !== null ||
              target === active.state.media.current ||
              !active.begin()
            )
              return;
          }
          active.preview(target);
          active.commit();
          inputSource.current = null;
        }}
        onPointerDown={(event) => {
          if (
            !event.isPrimary ||
            event.button !== 0 ||
            !session.current?.begin()
          )
            return;
          event.preventDefault();
          event.currentTarget.focus();
          inputSource.current = "pointer";
          seekPointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          pointerTarget(event.currentTarget, event.clientX);
        }}
        onPointerMove={(event) => {
          if (seekPointer.current === event.pointerId)
            pointerTarget(event.currentTarget, event.clientX);
        }}
        onPointerUp={(event) => {
          if (seekPointer.current !== event.pointerId) return;
          pointerTarget(event.currentTarget, event.clientX);
          seekPointer.current = undefined;
          session.current?.commit();
        }}
        onPointerCancel={() => {
          seekPointer.current = undefined;
          session.current?.cancel();
        }}
        onLostPointerCapture={() => {
          if (seekPointer.current !== undefined) {
            seekPointer.current = undefined;
            session.current?.cancel();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            session.current?.commit();
            return;
          }
          const changes: Record<string, number> = {
            ArrowRight: 1,
            ArrowUp: 1,
            ArrowLeft: -1,
            ArrowDown: -1,
            PageUp: 60,
            PageDown: -60,
          };
          if (
            !(event.key in changes) &&
            event.key !== "Home" &&
            event.key !== "End"
          )
            return;
          event.preventDefault();
          if (
            session.current?.state.preview === null &&
            !session.current.begin()
          )
            return;
          inputSource.current = "keyboard";
          const current = session.current?.state.preview ?? media.current ?? 0;
          session.current?.preview(
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? media.duration!
                : current + changes[event.key],
          );
        }}
        onBlur={() => session.current?.cancel()}
      />
      <div className="grid grid-cols-4 gap-2">
        {([-60, -1, 1, 60] as const).map((seconds) => (
          <button
            key={seconds}
            type="button"
            disabled={disabled}
            className={controlClass}
            aria-label={`${seconds > 0 ? "快进" : "快退"}${Math.abs(seconds) === 60 ? "1分钟" : "1秒"}`}
            onClick={() => session.current?.step(seconds)}
          >
            {seconds > 0 ? "+" : "−"}
            {Math.abs(seconds) === 60 ? "1m" : "1s"}
          </button>
        ))}
      </div>
      {media.controlNotice && (
        <div className="mt-2 text-[11px] leading-4 opacity-65">
          {media.controlNotice}
        </div>
      )}
      <div
        className="mt-2 min-h-8 text-[11px] leading-4 opacity-65"
        role="status"
      >
        {unavailable ||
          state.message ||
          "拖动预览 · 松手提交；键盘调整后按 Enter。房间权限以宿站结果为准。"}
      </div>
    </div>
  );
}
