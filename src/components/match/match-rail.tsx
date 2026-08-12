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
 *
 * It scrolls with the page rather than staying pinned. A sticky column
 * can only ever be one screen tall — anything past the fold of a pinned
 * element is never scrolled to, because the element doesn't move — so
 * pinning it capped the rail at whatever the viewport happened to fit,
 * usually two cards, no matter how much page ran alongside it.
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
      className="hidden w-[300px] shrink-0 space-y-4 min-[1100px]:block"
    >
      {picks.map((ad) => (
        <RailCard key={ad.id} ad={ad} view={pathname} />
      ))}
    </aside>
  );
}

/**
 * How many ads the column has room for.
 *
 * The content beside it is what bounds it: the rail runs as long as the
 * page it accompanies and stops there. A rail that outran its page
 * would make the page longer, and a profile that ends in five ads reads
 * as an ad break rather than a profile — so the ads fill the space
 * beside the writing without ever inventing space of their own.
 *
 * Measured rather than assumed. The card height comes from the card
 * actually rendered, so this stays right if the card is restyled, and
 * the content height is re-read whenever the neighbour changes size.
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

      // Without a neighbour there is nothing to measure against, and
      // guessing would mean guessing upwards — every ad in the pool.
      // The starting capacity is the safer answer.
      const content = rail.previousElementSibling?.getBoundingClientRect();
      if (!content) return;

      // The last card needs no gap after it, hence the extra one here.
      const room = content.height + RAIL_GAP;
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
