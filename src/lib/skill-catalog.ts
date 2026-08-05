import "server-only";

import catalogJson from "@/data/skill-catalog.json";

export interface CatalogEntry {
  name: string;
  slug: string;
  source: "devicon" | "simple-icons";
  color: string | null;
  variant: string | null;
  terms: string[];
}

const catalog = catalogJson as CatalogEntry[];

/** Lower score sorts first. Returns null when the entry doesn't match. */
function scoreEntry(entry: CatalogEntry, query: string): number | null {
  const name = entry.name.toLowerCase();
  if (name === query || entry.slug === query) return 0;
  if (name.startsWith(query) || entry.slug.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  if (entry.terms.some((term) => term.startsWith(query))) return 3;
  return null;
}

/**
 * Rank matches: exact > prefix > substring > tag; Devicon before Simple
 * Icons at equal score (colored icons first), shorter names first.
 */
export function searchCatalog(rawQuery: string, limit = 12): CatalogEntry[] {
  const query = rawQuery.trim().toLowerCase();
  if (query.length < 2) return [];

  const scored: { entry: CatalogEntry; score: number }[] = [];
  for (const entry of catalog) {
    const score = scoreEntry(entry, query);
    if (score !== null) scored.push({ entry, score });
  }

  return scored
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.entry.source !== b.entry.source) {
        return a.entry.source === "devicon" ? -1 : 1;
      }
      return a.entry.name.length - b.entry.name.length;
    })
    .slice(0, limit)
    .map(({ entry }) => entry);
}
