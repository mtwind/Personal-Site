"use client";

import { useEffect, useState } from "react";

import { SITE_TITLE } from "@/lib/match-tabs";

/**
 * How long the home page gets to itself before the site starts loading
 * behind it, when nothing has asked for it sooner.
 */
const IDLE_DELAY_MS = 3000;

interface SiteFrameProps {
  /** Whether the site tab is the one in front. */
  active: boolean;
  /** Whether the reader has shown intent — hovered the tab, say. */
  wanted: boolean;
  ownerName: string;
}

/**
 * The public site, framed, kept alive across tab switches.
 *
 * A browser doesn't reload a tab every time you look at it, and neither
 * does this: the frame is mounted once by the shell and hidden while
 * another tab is in front, so it keeps its document, its theme and its
 * scroll position, and coming back to it is instant. It starts loading
 * as soon as the reader shows interest in it, or after the home page has
 * had a moment to itself, so by the time the tab is clicked the site is
 * usually already there — and when it isn't yet, the tab says so rather
 * than showing a blank box.
 *
 * Same origin, same app, so this is the live site rather than a copy of
 * it: anything published on it is what shows up in here.
 */
export function SiteFrame({ active, wanted, ownerName }: SiteFrameProps) {
  // Latched: once the frame has been asked for it stays mounted, so a
  // reader who glances at the tab and leaves doesn't restart the load.
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (ready) return;
    const delay = active || wanted ? 0 : IDLE_DELAY_MS;
    const timer = window.setTimeout(() => setReady(true), delay);
    return () => window.clearTimeout(timer);
  }, [active, wanted, ready]);

  // Everything the viewport has left under the header, the strip and
  // this tab's own heading — measured, so the frame reaches the bottom
  // of the window and the page around it never grows a second
  // scrollbar. The floor is for the short windows where that arithmetic
  // would leave a letterbox.
  const frameSize = "block h-[calc(100vh-14rem)] min-h-[440px] w-full";

  return (
    <section aria-label={SITE_TITLE} hidden={!active}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-[0.12em] text-[#5f6368] uppercase">
            {SITE_TITLE}
          </p>
          <h1 className="mt-1 text-[22px] leading-tight font-normal text-[#202124]">
            Everything else about {ownerName}
          </h1>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-[#dadce0] bg-white px-4 py-2 text-[13px] font-medium text-[#1a73e8] transition-colors hover:bg-[#f1f6fe]"
        >
          Open in a new tab ↗
        </a>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-2xl border border-[#dadce0] bg-white">
        {ready ? (
          <iframe
            // `embed` drops the site's own link back to this page: in
            // here that link would load the team-matching page inside
            // the tab that is already showing it.
            src="/?embed=1"
            title={`${ownerName}'s personal site`}
            onLoad={() => setLoaded(true)}
            className={frameSize}
          />
        ) : (
          <div className={frameSize} aria-hidden />
        )}

        {loaded ? null : (
          <div
            role="status"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white text-[13px] text-[#5f6368]"
          >
            <span
              aria-hidden
              className="h-6 w-6 animate-spin rounded-full border-2 border-[#dadce0] border-t-[#1a73e8] motion-reduce:animate-none"
            />
            Loading {ownerName}&apos;s site…
          </div>
        )}
      </div>
    </section>
  );
}
