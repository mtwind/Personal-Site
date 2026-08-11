"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useSyncExternalStore } from "react";

import {
  noVisits,
  rememberVisit,
  subscribeHistory,
  visitedEntries,
} from "@/lib/match-history";
import { resolveTab, type MatchTab } from "@/lib/match-tabs";
import { useMatch } from "./match-shell";

/** How many tiles the row shows. */
const TILE_LIMIT = 8;

/**
 * Chrome's frequently-visited tiles, for this page.
 *
 * The pages a reader keeps coming back to are the ones they are actually
 * working through, and after two or three visits those are more useful
 * to them than anything chosen in advance. Which is why this is the one
 * part of the home page nobody authors: it is a record of what *this*
 * visit did, held for as long as the visit lasts.
 */
export function ShortcutTiles() {
  const { base, resolver } = useMatch();

  // Storage is a browser thing, so the row appears once the browser has
  // taken over — which is also the first moment it could have anything
  // in it.
  const visits = useSyncExternalStore(
    subscribeHistory,
    () => visitedEntries(base),
    noVisits,
  );

  const tabs = useMemo(
    () =>
      visits
        .map((visit) => resolveTab(base, visit.key, resolver, ""))
        // An entry renamed or deleted since the visit resolves to
        // nothing and drops out, rather than becoming a tile that 404s.
        .filter((tab): tab is MatchTab => tab !== null)
        .slice(0, TILE_LIMIT),
    [visits, base, resolver],
  );

  if (tabs.length === 0) return null;

  return (
    <nav aria-label="Frequently visited" className="mt-8">
      <ul className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <li key={tab.key}>
            <Link
              href={tab.href}
              className="flex w-[104px] flex-col items-center gap-2 rounded-xl px-2 py-3 transition-colors hover:bg-white"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dadce0] bg-white">
                {tab.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tab.iconUrl}
                    alt=""
                    className="h-5 w-5 object-contain"
                  />
                ) : (
                  <span className="text-[15px] font-medium text-[#5f6368]">
                    {tab.title.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="line-clamp-2 text-center text-[12px] leading-4 text-[#3c4043]">
                {tab.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Count the entry being viewed.
 *
 * Mounted by the shell rather than by each entry page, so every route
 * that isn't home is counted the same way and no page can forget to.
 */
export function VisitRecorder() {
  const { base } = useMatch();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith(base)) return;
    rememberVisit(base, pathname.slice(base.length).replace(/\/$/, ""));
  }, [base, pathname]);

  return null;
}
