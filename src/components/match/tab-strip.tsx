"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { HOME_KEY, type MatchTab } from "@/lib/match-tabs";

interface TabStripProps {
  tabs: MatchTab[];
  /** Path of the page in front; always one of the tabs. */
  activeKey: string;
  onClose: (key: string) => void;
}

/**
 * Chrome's tab row, under the page header: a grey shelf whose active
 * member is the colour of the page below it and joins onto it.
 *
 * Each tab is a real link to a real route, so middle-click and cmd-click
 * do what they do in a browser — open a genuine new browser tab — while
 * a plain click switches pages in place. Tabs hold a workable width
 * rather than shrinking to nothing, so a crowded strip scrolls instead.
 */
export function TabStrip({ tabs, activeKey, onClose }: TabStripProps) {
  const activeRef = useRef<HTMLAnchorElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ left: 0, scroll: 0, client: 0 });

  // Keep the front tab in view as the strip fills up.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeKey]);

  // Track scroll geometry so the strip can draw its own scrollbar.
  useEffect(() => {
    const element = stripRef.current;
    if (!element) return;

    const update = () =>
      setMetrics({
        left: element.scrollLeft,
        scroll: element.scrollWidth,
        client: element.clientWidth,
      });

    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [tabs.length]);

  const overflowing = metrics.scroll > metrics.client + 1;

  const onThumbDown = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const thumb = event.currentTarget as HTMLElement;
    thumb.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startLeft = stripRef.current?.scrollLeft ?? 0;
    // Track travel maps to content travel by the overflow ratio.
    const ratio = metrics.scroll / Math.max(metrics.client, 1);

    const onMove = (move: PointerEvent) => {
      if (!stripRef.current) return;
      stripRef.current.scrollLeft = startLeft + (move.clientX - startX) * ratio;
    };
    const onUp = () => {
      thumb.removeEventListener("pointermove", onMove);
      thumb.removeEventListener("pointerup", onUp);
      thumb.removeEventListener("pointercancel", onUp);
    };
    thumb.addEventListener("pointermove", onMove);
    thumb.addEventListener("pointerup", onUp);
    thumb.addEventListener("pointercancel", onUp);
  };

  /** Clicking the bare track pages toward the click. */
  const onTrackDown = (event: React.PointerEvent) => {
    const strip = stripRef.current;
    if (!strip) return;
    const track = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientX - track.left) / track.width;
    strip.scrollTo({
      left: fraction * metrics.scroll - metrics.client / 2,
      behavior: "smooth",
    });
  };

  const thumbWidth = overflowing
    ? Math.max(12, (metrics.client / metrics.scroll) * 100)
    : 100;
  const thumbLeft = overflowing ? (metrics.left / metrics.scroll) * 100 : 0;

  return (
    // No bottom border: the active tab shares the page's colour and
    // merges into the content below it, the way a browser tab joins its
    // page.
    <div className="border-b border-[#c6cad0] bg-[#dee1e6] pt-2">
      <div className="mx-auto flex max-w-3xl items-end gap-1 px-4">
        <div
          ref={stripRef}
          role="tablist"
          aria-label="Open pages"
          className="match-tabstrip flex min-w-0 flex-1 items-end gap-1 overflow-x-auto"
        >
          {tabs.map((tab) => {
            const isActive = tab.key === activeKey;
            const closable = tab.key !== HOME_KEY;

            return (
              <span
                key={tab.key}
                className={`match-tab group flex items-center gap-1 rounded-t-lg pr-1 pl-2 transition-colors ${
                  isActive
                    ? "bg-[#f8f9fa]"
                    : "bg-[#cfd3d8] hover:bg-[#dfe2e6] active:bg-[#e8eaed]"
                }`}
              >
                <Link
                  ref={isActive ? activeRef : undefined}
                  href={tab.href}
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? "page" : undefined}
                  title={tab.title}
                  className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left"
                >
                  {tab.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tab.iconUrl}
                      alt=""
                      aria-hidden
                      className="h-3.5 w-3.5 shrink-0"
                    />
                  ) : (
                    <TabGlyph kind={tab.kind} />
                  )}
                  <span
                    className={`truncate text-[12px] ${
                      isActive
                        ? "font-medium text-[#202124]"
                        : "text-[#3c4043] group-hover:text-[#202124]"
                    }`}
                  >
                    {tab.title}
                  </span>
                </Link>
                {closable ? (
                  <button
                    type="button"
                    onClick={() => onClose(tab.key)}
                    aria-label={`Close ${tab.title}`}
                    title="Close tab"
                    className="shrink-0 cursor-pointer rounded-full p-0.5 text-[#5f6368] transition-colors hover:bg-black/10 hover:text-[#202124]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="h-3 w-3"
                      aria-hidden
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                ) : (
                  // Keeps the home tab the same height as its neighbours.
                  <span className="w-1 shrink-0" aria-hidden />
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Only present once the tabs outgrow the strip. */}
      {overflowing ? (
        <div className="mx-auto max-w-3xl px-4 pt-1 pb-1">
          <div
            onPointerDown={onTrackDown}
            className="group h-1.5 w-full cursor-pointer rounded-full bg-black/10"
          >
            <div
              onPointerDown={onThumbDown}
              style={{
                width: `${thumbWidth}%`,
                marginLeft: `${thumbLeft}%`,
              }}
              className="h-full cursor-grab rounded-full bg-[#80868b] transition-colors hover:bg-[#5f6368] active:cursor-grabbing"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Stand-in favicon for tabs without an icon of their own. */
function TabGlyph({ kind }: { kind: MatchTab["kind"] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#5f6368"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden
    >
      {kind === "home" ? (
        <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      ) : kind === "section" ? (
        <>
          <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          <path d="M9 12h7M9 16h5" />
        </>
      ) : kind === "project" ? (
        <>
          <path d="M4 7h6l2 2h8v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
          <path d="M4 7V6a1 1 0 0 1 1-1h4" />
        </>
      ) : kind === "experience" ? (
        <>
          <rect x="3" y="7" width="18" height="13" rx="1.5" />
          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </>
      ) : kind === "note" ? (
        <>
          <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
          <path d="M8 11h8M8 15h5" />
        </>
      ) : kind === "course" ? (
        <>
          <path d="M12 4 2 9l10 5 10-5z" />
          <path d="M6 11.5V17c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-5.5" />
        </>
      ) : (
        <path d="m8 6-5 6 5 6M16 6l5 6-5 6" />
      )}
    </svg>
  );
}
