"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

export type ClampedDescriptionProps = {
  /** Full text to display (GitHub description, summary, etc.). */
  text: string | null | undefined;
  /** Tooltip body; defaults to `text`. Use for extended text (e.g. RU + original). */
  tooltipText?: string | null;
  /** Visible lines before clamping (default 4). */
  maxLines?: 3 | 4;
  className?: string;
  textClassName?: string;
  emptyLabel?: string;
};

const LINE_CLAMP: Record<3 | 4, string> = {
  3: "line-clamp-3",
  4: "line-clamp-4",
};

/**
 * Multi-line clamped text with optional hover tooltip for overflow.
 * Structured for future expand / drawer / detail panel integrations.
 */
export function ClampedDescription({
  text,
  tooltipText,
  maxLines = 4,
  className = "",
  textClassName = "text-slate-600",
  emptyLabel = "—",
}: ClampedDescriptionProps) {
  const content = text?.trim() ?? "";
  const tooltipContent = (tooltipText ?? text)?.trim() ?? "";
  const textRef = useRef<HTMLParagraphElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [truncated, setTruncated] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const tooltipId = useId();

  useEffect(() => setMounted(true), []);

  const measureTruncation = useCallback(() => {
    const el = textRef.current;
    if (!el || !content) {
      setTruncated(false);
      return;
    }
    setTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [content]);

  useLayoutEffect(() => {
    measureTruncation();
    const el = textRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measureTruncation);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureTruncation, maxLines]);

  const positionTooltip = useCallback(() => {
    const anchor = textRef.current;
    const tip = tooltipRef.current;
    if (!anchor || !tip) return;

    const rect = anchor.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const gap = 8;
    const pad = 12;
    const maxW = Math.min(360, window.innerWidth - pad * 2);

    let left = rect.left;
    if (left + maxW > window.innerWidth - pad) {
      left = window.innerWidth - maxW - pad;
    }
    left = Math.max(pad, left);

    let top = rect.bottom + gap;
    let transform = "";

    if (top + tipRect.height > window.innerHeight - pad) {
      top = rect.top - gap;
      transform = "translateY(-100%)";
    }
    if (top < pad && transform) {
      top = pad;
      transform = "";
    }

    setTooltipStyle({
      position: "fixed",
      top,
      left,
      maxWidth: maxW,
      transform: transform || undefined,
      zIndex: 9999,
    });
  }, []);

  useLayoutEffect(() => {
    if (!tooltipOpen) return;
    const frame = requestAnimationFrame(() => positionTooltip());
    const onScrollOrResize = () => positionTooltip();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [tooltipOpen, positionTooltip, tooltipContent]);

  if (!content) {
    return <span className={`text-slate-400 ${className}`}>{emptyLabel}</span>;
  }

  const hasExtendedTooltip =
    Boolean(tooltipContent) && tooltipContent !== content;
  const tooltipEnabled = truncated || hasExtendedTooltip;

  const showTooltipHandlers = tooltipEnabled
    ? {
        onMouseEnter: () => setTooltipOpen(true),
        onMouseLeave: () => setTooltipOpen(false),
        onFocus: () => setTooltipOpen(true),
        onBlur: () => setTooltipOpen(false),
      }
    : {};

  const tooltip =
    tooltipEnabled && tooltipOpen && mounted
      ? createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none max-h-[min(40vh,320px)] overflow-y-auto whitespace-pre-line rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-slate-700 shadow-lg"
            style={tooltipStyle}
          >
            {tooltipContent}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        className={`relative max-w-md ${className}`}
        data-clamped-description
        data-truncated={truncated ? "true" : "false"}
      >
        <p
          ref={textRef}
          className={[
            LINE_CLAMP[maxLines],
            textClassName,
            tooltipEnabled
              ? "cursor-help [@media(hover:none)]:cursor-default"
              : "",
          ].join(" ")}
          tabIndex={tooltipEnabled ? 0 : undefined}
          aria-describedby={tooltipEnabled && tooltipOpen ? tooltipId : undefined}
          {...showTooltipHandlers}
        >
          {content}
        </p>
        {truncated && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white via-white/90 to-transparent group-hover:from-slate-50 group-hover:via-slate-50/90"
            aria-hidden
          />
        )}
      </div>
      {tooltip}
    </>
  );
}
