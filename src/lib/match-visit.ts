/**
 * Whether this browser has been to the team-matching page.
 *
 * The page is hidden behind a slug nobody can guess, and the public site
 * says nothing about it — which is right for every other reader, and
 * wrong for the one person who was just on it: they follow a link out to
 * the site, or open it from the tab that frames it, and the way back is
 * gone.
 *
 * So the visit is remembered. Anyone this cookie belongs to arrived at a
 * URL they already knew, so handing them the slug back tells them
 * nothing they didn't come in with — and it is checked against the real
 * slug before it is rendered, so a made-up cookie gets a made-up nothing.
 *
 * Pure and runtime-agnostic: middleware sets it, a server page reads it.
 */

export const MATCH_VISIT_COOKIE = "match-visit";

/**
 * How long the way back stays in the header — long enough to survive
 * the browser being closed between one look and the next.
 */
export const MATCH_VISIT_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * The team-matching slug a path belongs to, if it belongs to one.
 *
 * Anything but a plain slug is treated as no match rather than trusted
 * into a cookie: this reads a URL a stranger controls, and the value it
 * returns is written back out on the next response.
 */
export function matchSlugFromPath(pathname: string): string | null {
  const [root, slug] = pathname.split("/").filter(Boolean);
  if (root !== "match" || !slug) return null;
  return /^[A-Za-z0-9_-]{1,128}$/.test(slug) ? slug : null;
}
