"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

import { RAIL_LIMIT } from "@/lib/ad-targeting";
import {
  RAIL_CARD_HEIGHT,
  RAIL_GAP,
  RAIL_QUERY,
  RailCard,
  useRailPool,
} from "./match-ads";
import { KnowledgePanel } from "./knowledge-panel";

/**
 * The right-hand column: a knowledge panel about whatever the reader is
 * looking at, and beneath it as many display ads as the page has room
 * for. Hidden outright below the rail breakpoint rather than stacked
 * underneath — a column of ads is the first thing a phone should lose.
 *
 * One sticky column rather than two stacked ones, because the ads have
 * to know how much space the panel took: the whole column is bounded,
 * and whatever the panel doesn't use is what the ads get.
 */
export function MatchRail() {
  const pathname = usePathname();
  const pool = useRailPool();
  const railRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const capacity = useRailCapacity(railRef, panelRef, pool.length);
  const picks = pool.slice(0, capacity);

  return (
    <aside
      ref={railRef}
      aria-label="About this profile"
      className="sticky top-[7.5rem] hidden w-[300px] shrink-0 space-y-4 min-[1100px]:block"
    >
      <div ref={panelRef}>
        <KnowledgePanel />
      </div>
      {picks.map((ad) => (
        <RailCard key={ad.id} ad={ad} view={pathname} />
      ))}
    </aside>
  );
}

/** Breathing room under the column when the viewport is what bounds it. */
const RAIL_FOOT = 24;

/**
 * How many ads the column has room for.
 *
 * Three things bound it, and the smallest wins. The viewport, because
 * the rail is sticky: an ad below the fold of a pinned column is an ad
 * nobody scrolls to. The content beside it, because a rail taller than
 * the page it accompanies makes the page longer — a profile that ends in
 * five ads reads as an ad break, not a profile. And the knowledge panel
 * above them, which is the part of this column that was worth reading.
 *
 * Measured rather than assumed: `top` comes from the sticky offset the
 * class actually applied, the card height from the card actually
 * rendered, and the panel's height from the panel, so this stays right
 * when any of the three is restyled.
 */
function useRailCapacity(
  railRef: React.RefObject<HTMLElement | null>,
  panelRef: React.RefObject<HTMLDivElement | null>,
  poolSize: number,
): number {
  // Starts at the number every screen can show, so the server and the
  // first client render agree; measuring only ever adjusts from there.
  const [capacity, setCapacity] = useState(RAIL_LIMIT);

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail || poolSize === 0) return;

    const measure = () => {
      // Below the breakpoint the rail is display:none and measures zero.
      if (!window.matchMedia(RAIL_QUERY).matches) return;

      const card = rail.querySelector("[data-rail-card]");
      const cardHeight = card?.getBoundingClientRect().height;
      const unit =
        (cardHeight && cardHeight > 0 ? cardHeight : RAIL_CARD_HEIGHT) +
        RAIL_GAP;

      const top = parseFloat(window.getComputedStyle(rail).top) || 0;
      const panel = panelRef.current?.getBoundingClientRect().height ?? 0;

      const content =
        rail.previousElementSibling?.getBoundingClientRect().height ??
        Number.POSITIVE_INFINITY;
      const viewport = window.innerHeight - top - RAIL_FOOT;

      // The last card needs no gap after it, hence the extra one here;
      // the panel takes its own height plus the gap below it.
      const room =
        Math.min(content, viewport) - (panel > 0 ? panel + RAIL_GAP : 0) +
        RAIL_GAP;
      const fits = Math.floor(room / unit);

      setCapacity(Math.max(0, Math.min(fits, poolSize)));
    };

    measure();

    // The content column grows as an AI overview streams in, and the
    // panel changes height between an entity and the owner — so this
    // watches both neighbours rather than only the window.
    const observer = new ResizeObserver(measure);
    if (rail.previousElementSibling) observer.observe(rail.previousElementSibling);
    if (panelRef.current) observer.observe(panelRef.current);
    // The document element stands in for the viewport, which some
    // browsers resize without firing an event a listener would see.
    observer.observe(document.documentElement);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [railRef, panelRef, poolSize]);

  return capacity;
}
