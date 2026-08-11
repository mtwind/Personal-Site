/**
 * What this browser has done on the team-matching page: what it has
 * searched for, and which entries it keeps coming back to.
 *
 * Kept in `sessionStorage`, like the open tabs are. The page is reached
 * by an unguessable link and may well be opened on a borrowed laptop, so
 * the trail lasting exactly as long as the visit is the right default —
 * a persistent record of "pages this machine read about me" is not
 * something a visitor asked for.
 *
 * Every read and write is wrapped: storage throws in private modes and
 * when a quota is full, and neither is worth taking a page down over.
 *
 * Reads are cached and writes notify, so components can subscribe to
 * this the way they subscribe to any store outside React. The cache is
 * doing a second job there: a snapshot has to be comparable by identity,
 * and re-parsing the JSON on every read would hand back a new array
 * every time and never settle.
 */

/** Most recent searches kept per page. */
const SEARCH_LIMIT = 8;

/** Entries tracked for the shortcut tiles. */
const VISIT_LIMIT = 24;

function searchKey(base: string): string {
  return `match-searches:${base}`;
}

function visitKey(base: string): string {
  return `match-visits:${base}`;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A visitor with storage disabled simply gets no history.
  }
  cache.delete(key);
  for (const listener of listeners) listener();
}

/* ────────────────────────── store plumbing ──────────────────────────── */

const listeners = new Set<() => void>();
const cache = new Map<string, unknown>();

/** Shared empties, so a server render and an empty history agree. */
const NO_SEARCHES: string[] = [];
const NO_VISITS: VisitRecord[] = [];

export const noSearches = (): string[] => NO_SEARCHES;
export const noVisits = (): VisitRecord[] => NO_VISITS;

export function subscribeHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Read through the cache, so repeat reads return the same array. */
function cached<T>(key: string, build: () => T): T {
  if (!cache.has(key)) cache.set(key, build());
  return cache.get(key) as T;
}

/* ─────────────────────────── recent searches ────────────────────────── */

/** Newest first. */
export function recentSearches(base: string): string[] {
  const key = searchKey(base);
  return cached(key, () => {
    const found = read<string[]>(key, NO_SEARCHES).filter(
      (entry): entry is string => typeof entry === "string",
    );
    return found.length === 0 ? NO_SEARCHES : found;
  });
}

/**
 * Record a search, moving a repeat to the front rather than duplicating
 * it — "what did I search for" is a set of distinct questions, and a
 * question asked twice is still one question.
 */
export function rememberSearch(base: string, query: string): void {
  const trimmed = query.trim();
  if (trimmed === "") return;

  const existing = recentSearches(base).filter(
    (entry) => entry.toLowerCase() !== trimmed.toLowerCase(),
  );
  write(searchKey(base), [trimmed, ...existing].slice(0, SEARCH_LIMIT));
}

/** Drop one search, for the × on a suggestion row. */
export function forgetSearch(base: string, query: string): void {
  const remaining = recentSearches(base).filter(
    (entry) => entry.toLowerCase() !== query.trim().toLowerCase(),
  );
  write(searchKey(base), remaining);
}

/* ──────────────────────────── visited entries ───────────────────────── */

/** One entry this visit has opened, and how often. */
export interface VisitRecord {
  /** Path relative to the page root — the same key a tab uses. */
  key: string;
  count: number;
  /** Epoch millis of the most recent visit. */
  at: number;
}

function isVisit(value: unknown): value is VisitRecord {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.key === "string" &&
    typeof row.count === "number" &&
    typeof row.at === "number"
  );
}

/** Most visited first, ties broken by which was seen most recently. */
export function visitedEntries(base: string): VisitRecord[] {
  const key = visitKey(base);
  return cached(key, () => {
    const found = read<unknown[]>(key, [])
      .filter(isVisit)
      .sort((a, b) => b.count - a.count || b.at - a.at);
    return found.length === 0 ? NO_VISITS : found;
  });
}

/** Count one visit to an entry path. */
export function rememberVisit(base: string, key: string): void {
  if (key === "") return; // home isn't a destination worth a tile

  const existing = visitedEntries(base);
  const found = existing.find((entry) => entry.key === key);
  const next = found
    ? existing.map((entry) =>
        entry.key === key
          ? { ...entry, count: entry.count + 1, at: Date.now() }
          : entry,
      )
    : [...existing, { key, count: 1, at: Date.now() }];

  // Trim by usefulness, not by age: the least-visited row is the one
  // worth losing when the list is full.
  write(
    visitKey(base),
    next.sort((a, b) => b.count - a.count || b.at - a.at).slice(0, VISIT_LIMIT),
  );
}
