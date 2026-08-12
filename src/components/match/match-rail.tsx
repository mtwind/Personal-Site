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

/**
 * The right-hand column: display ads beside the page, as Google runs
 * them on a wide screen. Hidden outright below the rail breakpoint
 * rather than stacked underneath — a column of ads is the first thing a
 * phone should lose.
 */
export function MatchRail() {
  const pathname = usePathname();
  const pool = useRailPool();
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

      const content =
        rail.previousElementSibling?.getBoundingClientRect().height ??
        Number.POSITIVE_INFINITY;
      const viewport = window.innerHeight - top - RAIL_FOOT;

      // The last card needs no gap after it, hence the extra one here.
      const room = Math.min(content, viewport) + RAIL_GAP;
      const fits = Math.floor(room / unit);

      setCapacity(Math.max(0, Math.min(fits, poolSize)));
    };

    measure();

    // The content column grows as an AI overview streams in, so this
    // watches the neighbour rather than only the window.
    const observer = new ResizeObserver(measure);
    if (rail.previousElementSibling) {
      observer.observe(rail.previousElementSibling);
    }
    // The document element stands in for the viewport, which some
    // browsers resize without firing an event a listener would see.
    observer.observe(document.documentElement);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [railRef, poolSize]);

  return capacity;
}
