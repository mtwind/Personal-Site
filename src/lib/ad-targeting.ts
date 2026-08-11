/**
 * Which ad runs where.
 *
 * Deliberately dependency-free and pure: the shell, the results view and
 * the entry pages all pick their own ads on the client from one list
 * shipped with the page, so this has to run in the browser as happily as
 * it does on the server.
 */

/** The three placements. An ad names the ones it may run in. */
export type AdSlot = "sponsored" | "rail" | "banner";

export const AD_SLOTS: AdSlot[] = ["sponsored", "rail", "banner"];

export function isAdSlot(value: string): value is AdSlot {
  return (AD_SLOTS as string[]).includes(value);
}

/**
 * What the ⓘ says when an ad doesn't say anything of its own.
 *
 * Lives here rather than in the component because it is the *content* of
 * the disclosure, not its presentation — the admin form shows it as the
 * placeholder, so what an editor sees in the box is what a reader gets.
 */
export const DEFAULT_AD_INFO =
  "Why this ad? Because I actually like this stuff. Nobody paid for it — these are placed by me, for the joke, on a page pretending to be Google.";

/** An ad as the page renders it — no admin-only columns. */
export interface Ad {
  id: string;
  brand: string;
  headline: string;
  description: string;
  displayUrl: string;
  targetUrl: string;
  iconSlug: string | null;
  color: string | null;
  iconUrl: string | null;
  /** Empty falls back to `DEFAULT_AD_INFO`. */
  infoText: string;
  keywords: string[];
  slots: string[];
}

/** Words too common to say anything about what a reader is interested in. */
const STOPWORDS = new Set([
  "a", "an", "and", "any", "are", "as", "at", "be", "but", "by", "did", "do",
  "does", "for", "from", "had", "has", "have", "he", "her", "his", "how", "i",
  "in", "is", "it", "its", "me", "my", "of", "on", "or", "she", "so", "that",
  "the", "their", "them", "they", "this", "to", "was", "were", "what", "when",
  "where", "which", "who", "why", "will", "with", "you", "your",
]);

/** Free text → the terms worth matching an ad against. */
export function adTerms(...sources: (string | null | undefined)[]): string[] {
  const words = sources
    .filter((source): source is string => Boolean(source))
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
  return [...new Set(words)];
}

/**
 * How well one ad answers a set of terms.
 *
 * Exact keyword hits count for more than prefix hits, and the brand name
 * counts for most of all — someone who typed "strava" wants Strava, not
 * whatever else happens to be tagged "running". Prefix matching is what
 * makes "skiing" reach a "ski" keyword without a stemmer.
 */
function score(ad: Ad, terms: string[]): number {
  if (terms.length === 0) return 0;

  const brand = ad.brand.toLowerCase();
  let total = 0;

  for (const term of terms) {
    if (brand === term || brand.split(/\s+/).includes(term)) {
      total += 5;
      continue;
    }
    for (const keyword of ad.keywords) {
      const key = keyword.toLowerCase();
      if (key === term) {
        total += 3;
      } else if (
        (key.startsWith(term) || term.startsWith(key)) &&
        Math.min(key.length, term.length) >= 4
      ) {
        total += 1;
      }
    }
  }

  return total;
}

/** FNV-1a. Any stable string → a stable number, for the rotation offset. */
function hash(seed: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

export interface SelectAdsOptions {
  slot: AdSlot;
  /** What the reader is looking at — a query, a title, a headline. */
  terms?: string[];
  limit?: number;
  /**
   * Anything stable about this view, usually its path. Rotation is
   * derived from it rather than from a random draw so the server and the
   * browser choose the same ad and hydration stays quiet — and so a
   * reader who returns to a page finds the ad they saw last time.
   */
  seed: string;
  /** Ads already placed elsewhere on this view. */
  exclude?: string[];
}

/**
 * Pick the ads for one placement.
 *
 * Relevance wins where there is any; where there isn't — the home page,
 * a search with no overlap — the list rotates by seed, so an untargeted
 * slot still shows something different from the slot beside it rather
 * than the same first row everywhere.
 */
export function selectAds(pool: Ad[], options: SelectAdsOptions): Ad[] {
  const { slot, terms = [], limit = 1, seed, exclude = [] } = options;

  const inSlot = pool.filter((ad) => ad.slots.includes(slot));
  // Repeating an advertiser reads better than an empty slot, so the
  // exclusion is dropped rather than honoured when it leaves nothing.
  const unplaced = inSlot.filter((ad) => !exclude.includes(ad.id));
  const eligible = unplaced.length > 0 ? unplaced : inSlot;

  if (eligible.length === 0 || limit <= 0) return [];

  const offset = hash(`${seed}:${slot}`) % eligible.length;

  return eligible
    .map((ad, index) => ({
      ad,
      score: score(ad, terms),
      // Distance from this view's starting point, so an untargeted
      // ranking is a rotation of the list rather than its natural order.
      rotation: (index - offset + eligible.length) % eligible.length,
    }))
    .sort((a, b) => b.score - a.score || a.rotation - b.rotation)
    .slice(0, limit)
    .map((entry) => entry.ad);
}

/** How many sponsored results run above the search results. */
export const SPONSORED_LIMIT = 2;

/**
 * How many rail ads are *certain* to be on screen.
 *
 * The rail itself runs as many as the page has room for, which only the
 * browser can know. This is the number the other placements assume when
 * they avoid repeating an advertiser: guaranteed to be visible, so the
 * ad beside the content is never also the ad under it, while a rail that
 * grows on a tall screen can still reach for the rest of the pool.
 */
export const RAIL_LIMIT = 2;

export interface AdPlanInput {
  /** The view's path — every placement's rotation starts from it. */
  pathname: string;
  /** The committed search, when there is one. */
  query?: string;
  /** Text describing the page a banner sits in. */
  bannerTerms?: string;
}

export interface AdPlan {
  sponsored: Ad[];
  /** Every eligible rail ad, best first — not a final count. */
  rail: Ad[];
  banner: Ad | null;
}

/**
 * Every placement on one view, decided together.
 *
 * The slots are filled in order of how much relevance they can act on:
 * the search results first, because they are the only slot that knows
 * what was asked; then the rail; then the banner. Each one passes what
 * it took to the next, so a single view doesn't run the same advertiser
 * twice — which is the tell that the ads are decoration rather than an
 * auction.
 *
 * Filling them in one pure pass rather than one component at a time is
 * what lets each placement work this out for itself. `bannerTerms` only
 * affects the last slot, so a component that doesn't know them still
 * computes the same first two.
 */
export function planAds(pool: Ad[], input: AdPlanInput): AdPlan {
  const { pathname, query = "", bannerTerms = "" } = input;

  const sponsored = query
    ? selectAds(pool, {
        slot: "sponsored",
        terms: adTerms(query),
        limit: SPONSORED_LIMIT,
        seed: `${pathname}?q=${query}`,
      })
    : [];
  const taken = sponsored.map((ad) => ad.id);

  // Ranked in full: the rail component decides how many of these it can
  // actually show once it has measured the page.
  const rail = selectAds(pool, {
    slot: "rail",
    limit: pool.length,
    seed: pathname,
    exclude: taken,
  });
  taken.push(...rail.slice(0, RAIL_LIMIT).map((ad) => ad.id));

  const [banner = null] = selectAds(pool, {
    slot: "banner",
    terms: adTerms(bannerTerms),
    limit: 1,
    seed: pathname,
    exclude: taken,
  });

  return { sponsored, rail, banner };
}

/**
 * Logo URL for an ad. Simple Icons serves a tinted SVG per brand slug;
 * a brand it doesn't carry can name its own image, and one that does
 * neither falls back to an initial tile in the component.
 */
export function adIconUrl(ad: Ad): string | null {
  if (ad.iconUrl) return ad.iconUrl;
  if (!ad.iconSlug) return null;
  const tint = ad.color ? `/${ad.color.replace("#", "")}` : "";
  return `https://cdn.simpleicons.org/${ad.iconSlug}${tint}`;
}
