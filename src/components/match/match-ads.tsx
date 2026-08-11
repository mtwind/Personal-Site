"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  adIconUrl,
  DEFAULT_AD_INFO,
  planAds,
  RAIL_LIMIT,
  type Ad,
  type AdPlan,
  type AdSlot,
} from "@/lib/ad-targeting";
import { useMatch } from "./match-shell";

/** The viewport the rail needs; shared by the layout and the reporter. */
export const RAIL_QUERY = "(min-width: 1100px)";

/* ────────────────────────────── reporting ───────────────────────────── */

/** Events waiting to be sent, and what has already been counted. */
const queue: { adId: string; kind: string; slot: AdSlot }[] = [];
const counted = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Send what's queued.
 *
 * `sendBeacon` first: a click leaves the page, and a beacon is the only
 * request the browser promises to finish after that. Where it isn't
 * available, a keepalive fetch does the same job.
 */
function flush(): void {
  flushTimer = null;
  if (queue.length === 0) return;

  const body = JSON.stringify({ events: queue.splice(0, queue.length) });
  const url = "/api/ads/events";

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(url, blob)) return;
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Nothing to do about a statistic that didn't arrive.
  });
}

/**
 * Queue one event.
 *
 * Batched rather than sent per ad, so a page showing four ads makes one
 * request instead of four. `dedupe` collapses the repeats a re-render
 * produces — an ad that stayed on screen through three renders was seen
 * once.
 */
function report(
  kind: "impression" | "click",
  ad: Ad,
  slot: AdSlot,
  dedupe: string,
): void {
  const key = `${kind}:${ad.id}:${slot}:${dedupe}`;
  if (counted.has(key)) return;
  counted.add(key);

  queue.push({ adId: ad.id, kind, slot });
  if (flushTimer === null) flushTimer = setTimeout(flush, 600);
}

/** True when this slot is actually on screen at this viewport. */
function slotIsVisible(slot: AdSlot): boolean {
  if (typeof window === "undefined") return false;
  // The rail is hidden by CSS on narrow screens. It still mounts there,
  // so without this check every phone would report seeing it.
  if (slot === "rail") return window.matchMedia(RAIL_QUERY).matches;
  return true;
}

/**
 * Count an impression once the ad is on the reader's screen.
 *
 * `view` is what makes a second visit a second impression: it changes
 * with the path and the query, so re-renders within one view are free
 * while navigating somewhere new is counted afresh.
 */
function useImpression(ad: Ad | null, slot: AdSlot, view: string): void {
  const { reportAds } = useMatch();

  useEffect(() => {
    if (!ad || !reportAds || !slotIsVisible(slot)) return;
    report("impression", ad, slot, view);
  }, [ad, slot, view, reportAds]);
}

/* ─────────────────────────────── selection ──────────────────────────── */

/**
 * This view's whole ad plan.
 *
 * Everything a reader can see is in one shipped list, so a slot works
 * out its own ad rather than asking the server for one — and because
 * the plan is a pure function of the path, the query and the pool, the
 * three placements reach the same answer independently without any of
 * them having to talk to the others.
 */
function useAdPlan(bannerTerms = ""): AdPlan {
  const { ads } = useMatch();
  const pathname = usePathname();
  const query = useSearchParams().get("q")?.trim() ?? "";

  return useMemo(
    () => planAds(ads, { pathname, query, bannerTerms }),
    [ads, pathname, query, bannerTerms],
  );
}

/* ────────────────────────────── creatives ───────────────────────────── */

/**
 * The brand's mark. Simple Icons covers most of them; a brand it doesn't
 * carry gets a tile of its own colour with its initial, which is close
 * enough to a favicon to read as one.
 */
function AdLogo({ ad, size = 28 }: { ad: Ad; size?: number }) {
  const url = adIconUrl(ad);
  const style = { width: size, height: size };

  if (!url) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full text-[13px] font-medium text-white"
        style={{ ...style, background: ad.color ?? "#5f6368" }}
        aria-hidden
      >
        {ad.brand.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border border-[#dadce0] bg-white"
      style={style}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="object-contain"
        style={{ width: size * 0.55, height: size * 0.55 }}
      />
    </span>
  );
}

/**
 * The "Sponsored" label and the ⓘ behind it.
 *
 * These are real brands with real outbound links and no money behind
 * them, so the disclosure says so plainly rather than leaving the label
 * to imply a relationship that doesn't exist. Each ad may word that its
 * own way; one that doesn't falls back to the shared line, so the
 * disclosure can never go missing by being left blank.
 */
function AdLabel({ ad, compact = false }: { ad: Ad; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const noteId = useId();

  return (
    <span className="relative inline-flex items-center gap-1">
      <span
        className={
          compact
            ? "text-[11px] font-medium tracking-wide text-[#5f6368] uppercase"
            : "text-[13px] font-bold text-[#202124]"
        }
      >
        Sponsored
      </span>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={noteId}
        aria-label="Why this ad?"
        className="cursor-pointer rounded-full p-0.5 text-[#5f6368] transition-colors hover:bg-[#f1f3f4] hover:text-[#202124]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-3.5 w-3.5"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" strokeLinecap="round" />
          <circle cx="12" cy="7.6" r="1" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {open ? (
        <span
          id={noteId}
          role="note"
          className="absolute top-full left-0 z-20 mt-1.5 w-60 rounded-lg border border-[#dadce0] bg-white p-3 text-[12px] leading-5 font-normal whitespace-pre-line text-[#5f6368] normal-case shadow-[0_1px_3px_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]"
        >
          {ad.infoText || DEFAULT_AD_INFO}
        </span>
      ) : null}
    </span>
  );
}

/** Everything an ad links out with, in one place. */
function adLinkProps(ad: Ad, slot: AdSlot, view: string, reportAds: boolean) {
  return {
    href: ad.targetUrl,
    target: "_blank",
    rel: "noopener noreferrer sponsored",
    onClick: () => {
      if (reportAds) report("click", ad, slot, view);
    },
  };
}

/* ───────────────────────────── placements ───────────────────────────── */

/**
 * Ads above the search results, styled the way Google styles a text ad:
 * the label first, then the advertiser, then the blue link. They sit
 * above the AI overview because that is where the real thing puts them.
 */
export function SponsoredResults({ query }: { query: string }) {
  const { reportAds } = useMatch();
  const picks = useAdPlan().sponsored;
  const view = `q:${query}`;

  useImpression(picks[0] ?? null, "sponsored", view);
  useImpression(picks[1] ?? null, "sponsored", view);

  if (picks.length === 0) return null;

  return (
    <div className="mt-4 space-y-4">
      {picks.map((ad) => (
        <div key={ad.id} className="rounded-xl px-3.5 py-2">
          <AdLabel ad={ad} />
          <div className="mt-1.5 flex items-center gap-2.5">
            <AdLogo ad={ad} />
            <span className="leading-tight">
              <span className="block text-[14px] text-[#202124]">
                {ad.brand}
              </span>
              <span className="block text-[12px] text-[#5f6368]">
                {ad.displayUrl}
              </span>
            </span>
          </div>
          <a
            {...adLinkProps(ad, "sponsored", view, reportAds)}
            className="mt-1.5 block text-[18px] leading-snug text-[#1a0dab] hover:underline"
          >
            {ad.headline}
          </a>
          {ad.description ? (
            <p className="mt-1 max-w-[62ch] text-[14px] leading-6 text-[#4d5156]">
              {ad.description}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * The right-hand column: display ads beside the page, as Google runs
 * them on a wide screen. Hidden outright below the rail breakpoint
 * rather than stacked underneath — a column of ads is the first thing a
 * phone should lose.
 */
export function AdRail() {
  const pathname = usePathname();
  const pool = useAdPlan().rail;
  const railRef = useRef<HTMLElement>(null);
  const capacity = useRailCapacity(railRef, pool.length);
  const picks = pool.slice(0, capacity);

  if (picks.length === 0) return null;

  return (
    <aside
      ref={railRef}
      aria-label="Sponsored"
      className="sticky top-[7.5rem] hidden w-[300px] shrink-0 space-y-4 min-[1100px]:block"
    >
      {picks.map((ad) => (
        <RailCard key={ad.id} ad={ad} view={pathname} />
      ))}
    </aside>
  );
}

/**
 * One rail ad, at a fixed height.
 *
 * Uniform cards are what let the column be counted rather than measured
 * card by card: one height, one gap, and the number that fits is
 * arithmetic. Long copy is clamped instead of pushing its neighbours
 * down — which is also how a real display column behaves, since an
 * advertiser doesn't get more space for writing more.
 */
function RailCard({ ad, view }: { ad: Ad; view: string }) {
  const { reportAds } = useMatch();

  // Reported per card rather than per rail: the rail's length depends on
  // the reader's screen, and an ad that didn't fit was never seen.
  useImpression(ad, "rail", view);

  return (
    <div
      style={{ height: RAIL_CARD_HEIGHT }}
      className="flex flex-col overflow-hidden rounded-2xl border border-[#dadce0] bg-white p-4 transition-shadow duration-300 hover:shadow-[0_1px_3px_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]"
    >
      <AdLabel ad={ad} compact />
      <div className="mt-3 flex items-center gap-2.5">
        <AdLogo ad={ad} size={36} />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[14px] font-medium text-[#202124]">
            {ad.brand}
          </span>
          <span className="block truncate text-[12px] text-[#5f6368]">
            {ad.displayUrl}
          </span>
        </span>
      </div>
      <a
        {...adLinkProps(ad, "rail", view, reportAds)}
        className="mt-3 line-clamp-2 block text-[15px] leading-snug text-[#1a0dab] hover:underline"
      >
        {ad.headline}
      </a>
      {ad.description ? (
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-[#5f6368]">
          {ad.description}
        </p>
      ) : null}
      <a
        {...adLinkProps(ad, "rail", view, reportAds)}
        className="mt-auto inline-block self-start rounded-full border border-[#dadce0] px-4 py-1.5 text-[13px] font-medium text-[#1a73e8] transition-colors hover:bg-[#f1f6fe]"
      >
        Visit site
      </a>
    </div>
  );
}

/** One rail card's height, and the gap between them (`space-y-4`). */
const RAIL_CARD_HEIGHT = 232;
const RAIL_GAP = 16;

/** Breathing room under the column when the viewport is what bounds it. */
const RAIL_FOOT = 24;

/**
 * How many ads the column has room for.
 *
 * Two things bound it, and the smaller wins. The viewport, because the
 * rail is sticky: an ad below the fold of a pinned column is an ad
 * nobody scrolls to. And the content beside it, because a rail taller
 * than the page it accompanies makes the page longer — a profile that
 * ends in five ads reads as an ad break, not a profile.
 *
 * Measured rather than assumed: `top` comes from the sticky offset the
 * class actually applied, and the card height from the card actually
 * rendered, so this stays right if either is restyled.
 */
function useRailCapacity(
  railRef: React.RefObject<HTMLElement | null>,
  poolSize: number,
): number {
  // Starts at the number every screen can show, so the server and the
  // first client render agree; measuring only ever adds to it.
  const [capacity, setCapacity] = useState(RAIL_LIMIT);

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail || poolSize === 0) return;

    const measure = () => {
      // Below the breakpoint the rail is display:none and measures zero.
      if (!window.matchMedia(RAIL_QUERY).matches) return;

      const card = rail.firstElementChild?.getBoundingClientRect().height;
      const unit = (card && card > 0 ? card : RAIL_CARD_HEIGHT) + RAIL_GAP;
      const top = parseFloat(window.getComputedStyle(rail).top) || 0;

      const content =
        rail.previousElementSibling?.getBoundingClientRect().height ??
        Number.POSITIVE_INFINITY;
      const viewport = window.innerHeight - top - RAIL_FOOT;

      // The last card needs no gap after it, hence the extra one here.
      const room = Math.min(content, viewport) + RAIL_GAP;
      const fits = Math.floor(room / unit);

      setCapacity(Math.max(1, Math.min(fits, poolSize)));
    };

    measure();

    // The content column grows as an AI overview streams in, so this
    // watches the neighbour rather than only the window.
    const observer = new ResizeObserver(measure);
    if (rail.previousElementSibling) {
      observer.observe(rail.previousElementSibling);
    }
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [railRef, poolSize]);

  return capacity;
}

/**
 * A single strip inside a section or entry page, targeted at what that
 * page is about — the skiing ad turns up under the skiing story rather
 * than only under a search for one.
 */
export function AdBanner({ terms }: { terms: string }) {
  const { reportAds } = useMatch();
  const pathname = usePathname();
  const ad = useAdPlan(terms).banner;

  useImpression(ad ?? null, "banner", pathname);

  if (!ad) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-[#dadce0] bg-white px-5 py-4">
      <AdLogo ad={ad} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <AdLabel ad={ad} compact />
          <span className="text-[12px] text-[#5f6368]">{ad.displayUrl}</span>
        </div>
        <a
          {...adLinkProps(ad, "banner", pathname, reportAds)}
          className="mt-0.5 block text-[16px] leading-snug text-[#1a0dab] hover:underline"
        >
          {ad.headline}
        </a>
        {ad.description ? (
          <p className="mt-0.5 text-[13px] leading-5 text-[#5f6368]">
            {ad.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
