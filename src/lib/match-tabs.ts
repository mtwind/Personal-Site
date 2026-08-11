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
  uniqueSlugger,
  type ReferenceKind,
  type ReferenceResolver,
  type ReferenceTarget,
} from "@/lib/match-references";

/** One of the page's authored content pages, from `page.sections`. */
export interface MatchSection {
  slug: string;
  title: string;
  body: string;
}

/**
 * The section whose page also lists skills automatically.
 *
 * Ranking skills by hand goes stale the moment a project is added, so
 * this one page renders the authored prose *and* the ranking derived
 * from what the profile is actually tagged with. Slug of the "My
 * Strongest Skills" title seeded by `DEFAULT_SECTIONS`.
 */
export const SKILLS_SECTION_SLUG = "my-strongest-skills";

/** First path segments that belong to entry routes, never to a section. */
const RESERVED_SEGMENTS = new Set<string>(Object.values(KIND_SEGMENT));

/**
 * Give every authored section a stable URL segment. Titles are the only
 * thing the editor controls, so the slug follows the title — renaming a
 * section changes its URL, which is the same bargain any CMS makes.
 */
export function buildSections(
  sections: { title: string; body: string }[],
): MatchSection[] {
  const slug = uniqueSlugger();
  return sections.map((section, index) => {
    const candidate = slug(section.title || `section-${index + 1}`);
    // A section titled "Projects" must not shadow /project/<slug>.
    return {
      slug: RESERVED_SEGMENTS.has(candidate) ? `${candidate}-page` : candidate,
      title: section.title,
      body: section.body,
    };
  });
}

/** Root path of the whole page, e.g. `/match/ab12…`. */
export function matchBase(pageSlug: string): string {
  return `/match/${pageSlug}`;
}

/** Path of an entry's page, relative to the root. */
export function entryPath(kind: ReferenceKind, slug: string): string {
  return `/${KIND_SEGMENT[kind]}/${slug}`;
}

/** Path of a section's page, relative to the root. */
export function sectionPath(slug: string): string {
  return `/${slug}`;
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
  kind: "home" | "section" | ReferenceKind;
}

/** Home is always open and never closes; it is where the search lives. */
export const HOME_KEY = "";

/**
 * Turn a path into the tab that represents it.
 *
 * Unknown paths resolve to null rather than to a placeholder tab: a
 * mistyped URL 404s, and the strip should not carry a tab for a page
 * that does not exist.
 */
export function resolveTab(
  base: string,
  key: string,
  resolver: ReferenceResolver,
  sections: MatchSection[],
  homeTitle: string,
): MatchTab | null {
  const href = base + key;

  if (key === HOME_KEY) {
    return { key, href, title: homeTitle, iconUrl: null, kind: "home" };
  }

  const parts = key.split("/").filter(Boolean);

  if (parts.length === 1) {
    const section = sections.find((candidate) => candidate.slug === parts[0]);
    return section
      ? {
          key,
          href,
          title: section.title || "Untitled",
          iconUrl: null,
          kind: "section",
        }
      : null;
  }

  if (parts.length === 2) {
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

  return null;
}
