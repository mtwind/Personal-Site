/**
 * Routing and tab identity for the team-matching page.
 *
 * The page behaves like a browser: every entry has a real URL, following
 * a link *navigates*, and the strip under the header is the set of pages
 * this visit has opened. A tab's identity is simply its path relative to
 * the page root, so the strip needs no state beyond a list of paths —
 * titles are re-resolved from the index on every render, and a reload
 * restores the same tabs from `sessionStorage`.
 *
 * Pure and client-safe: no data access, no DOM.
 */
import {
  KIND_SEGMENT,
  type ReferenceKind,
  type ReferenceResolver,
  type ReferenceTarget,
} from "@/lib/match-references";

/** Root path of the whole page, e.g. `/match/ab12…`. */
export function matchBase(pageSlug: string): string {
  return `/match/${pageSlug}`;
}

/** Path of an entry's page, relative to the root. */
export function entryPath(kind: ReferenceKind, slug: string): string {
  return `/${KIND_SEGMENT[kind]}/${slug}`;
}

/** Absolute href for a target, or null when it no longer resolves. */
export function targetHref(
  base: string,
  resolver: ReferenceResolver,
  target: ReferenceTarget,
): string | null {
  const entry = resolver.entry(target);
  return entry ? base + entryPath(entry.kind, entry.slug) : null;
}

/** A tab in the strip: a path, and how to draw it. */
export interface MatchTab {
  /** Path relative to the page root — `""` is home. Also its identity. */
  key: string;
  href: string;
  title: string;
  iconUrl: string | null;
  kind: "home" | "site" | ReferenceKind;
}

/** Home is always open and never closes; it is where the search lives. */
export const HOME_KEY = "";

/**
 * The public site, open in a tab of its own.
 *
 * This page is a deep dive written for one audience, and it is reached
 * by a slug nobody can guess — which leaves the ordinary website, the
 * one with everything else on it, unreachable from here unless something
 * says where it is. So it is a tab: already open when the page loads,
 * and never closable, because a reader who shut it would have no way
 * back to it.
 */
export const SITE_KEY = "/site";

/** What that tab is called, in the strip and in its own heading. */
export const SITE_TITLE = "Personal site";

/**
 * Turn a path into the tab that represents it.
 *
 * Unknown paths resolve to null rather than to a placeholder tab: a
 * mistyped URL 404s, and the strip should not carry a tab for a page
 * that does not exist. Every real page is `/<kind>/<slug>` — the home
 * page is the only thing living at the root.
 */
export function resolveTab(
  base: string,
  key: string,
  resolver: ReferenceResolver,
  homeTitle: string,
): MatchTab | null {
  const href = base + key;

  if (key === HOME_KEY) {
    return { key, href, title: homeTitle, iconUrl: null, kind: "home" };
  }

  if (key === SITE_KEY) {
    return { key, href, title: SITE_TITLE, iconUrl: null, kind: "site" };
  }

  const parts = key.split("/").filter(Boolean);
  if (parts.length !== 2) return null;

  const kind = (Object.keys(KIND_SEGMENT) as ReferenceKind[]).find(
    (candidate) => KIND_SEGMENT[candidate] === parts[0],
  );
  if (!kind) return null;

  const target = resolver.fromSlug(kind, parts[1]);
  const entry = target ? resolver.entry(target) : null;
  return entry
    ? {
        key,
        href,
        title: entry.title,
        iconUrl: entry.iconUrl,
        kind: entry.kind,
      }
    : null;
}
