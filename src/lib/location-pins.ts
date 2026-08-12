/**
 * Location preferences: what a pin is, and what its ranking means.
 *
 * Dependency-free and pure, like `ad-targeting`: the map draws in the
 * browser, the admin form runs there too, and the server validates
 * against the same levels — so this has to run everywhere.
 */

/** A pin as the map renders it — no admin-only columns. */
export interface LocationPin {
  id: string;
  /** What the place is called, e.g. "Mountain View, CA". */
  label: string;
  /** Why it's wanted. The text of the box that opens on hover. */
  note: string;
  lat: number;
  lng: number;
  /** 1 = strongest; null is an unranked pin. */
  priority: number | null;
}

/** One rung of the ranking: what it is called and how it is coloured. */
export interface PinTier {
  priority: number;
  label: string;
  /** What the map's pin, the legend swatch and the list dot are filled with. */
  color: string;
  /** The rank number drawn on the pin — dark on the colours light enough. */
  ink: string;
}

/**
 * The ranking, in Google's four colours.
 *
 * Four rungs rather than an open-ended number: a rank is only useful if
 * a reader can tell two pins apart at a glance, and past four fills the
 * map with colours nobody can hold in their head. Blue reads as the
 * strongest here because the whole page is built around it.
 */
export const PIN_TIERS: PinTier[] = [
  { priority: 1, label: "First choice", color: "#1a73e8", ink: "#ffffff" },
  { priority: 2, label: "Strong contender", color: "#34A853", ink: "#ffffff" },
  { priority: 3, label: "Happy to be there", color: "#FBBC04", ink: "#202124" },
  { priority: 4, label: "Open to it", color: "#EA4335", ink: "#ffffff" },
];

/** How an unranked pin is drawn and described. */
export const UNRANKED_TIER: PinTier = {
  priority: 0,
  label: "Unranked",
  color: "#9AA0A6",
  ink: "#ffffff",
};

export const MAX_PRIORITY = PIN_TIERS.length;

/** The tier a pin belongs to; unranked pins fall to the grey one. */
export function tierFor(priority: number | null): PinTier {
  return (
    PIN_TIERS.find((tier) => tier.priority === priority) ?? UNRANKED_TIER
  );
}

/**
 * Pins in reading order: ranked before unranked, strongest first, ties
 * in whatever order the editor arranged them.
 *
 * The map doesn't care, but every list of pins beside it does — the
 * legend groups, the admin table, the text fallback — and they should
 * all agree on what "first" means.
 */
export function sortPins<T extends { priority: number | null }>(
  pins: T[],
): T[] {
  return [...pins].sort(
    (a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity),
  );
}

/**
 * The country the map is of.
 *
 * A box rather than a centre and a zoom, because the frame it has to
 * fill isn't a fixed size: the same section is a full-width card on a
 * laptop and a narrow one on a phone, and a zoom that suits one shows
 * the Pacific in the other. The map fits these corners instead.
 */
export const US_BOUNDS = {
  north: 49.4,
  south: 24.4,
  west: -125.0,
  east: -66.9,
};

/** Where the map opens before it has measured itself. */
export const US_VIEW = {
  center: { lat: 39.5, lng: -96.5 },
  zoom: 4,
};

/**
 * How far the reader may wander: North America and a wide margin, so a
 * stray drag can't leave them looking at the empty Pacific — but not so
 * tight that panning fights back at the edges.
 */
export const MAP_RESTRICTION = {
  north: 72,
  south: 5,
  west: -172,
  east: -50,
};
