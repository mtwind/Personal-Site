/**
 * The set of pages a visit has open, per team-matching page.
 *
 * This genuinely is external state rather than React state: it outlives
 * every route the strip is rendered under, it is shared by the tab strip
 * and by whatever navigation just happened, and it is backed by
 * `sessionStorage` so a reload doesn't quietly close everything the
 * reader had lined up. So it lives in a store React subscribes to, not
 * in a `useState` that effects keep pushing at.
 *
 * Snapshots are cached and only ever replaced, never mutated, so
 * `useSyncExternalStore` can compare them by identity.
 */
import { HOME_KEY } from "@/lib/match-tabs";

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();
const snapshots = new Map<string, readonly string[]>();

/**
 * What the server renders from. Home is the only tab it can know about;
 * the page actually being viewed is folded in by the caller, so the
 * markup still shows the right two tabs before hydration.
 */
const SERVER_SNAPSHOT: readonly string[] = [HOME_KEY];

function storageKey(base: string): string {
  return `match-tabs:${base}`;
}

function load(base: string): readonly string[] {
  try {
    const raw = window.sessionStorage.getItem(storageKey(base));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return SERVER_SNAPSHOT;
    const keys = parsed.filter((key): key is string => typeof key === "string");
    return keys.includes(HOME_KEY) ? keys : [HOME_KEY, ...keys];
  } catch {
    // Private browsing, or something else wrote nonsense there.
    return SERVER_SNAPSHOT;
  }
}

function commit(base: string, next: readonly string[]): void {
  snapshots.set(base, next);
  try {
    window.sessionStorage.setItem(storageKey(base), JSON.stringify(next));
  } catch {
    // Storage is unavailable or full — tabs just won't survive a reload.
  }
  for (const listener of listeners.get(base) ?? []) listener();
}

export function subscribeTabs(base: string, listener: Listener): () => void {
  const forBase = listeners.get(base) ?? new Set<Listener>();
  forBase.add(listener);
  listeners.set(base, forBase);
  return () => {
    forBase.delete(listener);
  };
}

export function getTabs(base: string): readonly string[] {
  const cached = snapshots.get(base);
  if (cached) return cached;
  const loaded = load(base);
  snapshots.set(base, loaded);
  return loaded;
}

export function getServerTabs(): readonly string[] {
  return SERVER_SNAPSHOT;
}

/** Add a page to the strip, at the end, if it isn't already open. */
export function openTab(base: string, key: string): void {
  const current = getTabs(base);
  if (current.includes(key)) return;
  commit(base, [...current, key]);
}

/**
 * Close a page. Home is never closable, so it is always still there to
 * fall back to — which is what the caller does with the active tab.
 */
export function closeTab(base: string, key: string): void {
  const current = getTabs(base);
  if (key === HOME_KEY || !current.includes(key)) return;
  commit(
    base,
    current.filter((candidate) => candidate !== key),
  );
}

/**
 * Drop keys that no longer resolve.
 *
 * Renaming a project changes its slug, and the tab pointing at the old
 * one becomes a path that 404s. Those tabs are already filtered out of
 * the strip, but leaving them in storage means they accumulate across a
 * visit — and, before this was hoisted out of the close path, meant
 * closing a tab could navigate to one of them.
 */
export function pruneTabs(
  base: string,
  isLive: (key: string) => boolean,
): void {
  // Tested against the store's own keys rather than a rendered list:
  // during hydration React hands components the *server* snapshot, so a
  // caller comparing against what's on screen would prune every tab the
  // visit had open and hadn't been re-read yet.
  const current = getTabs(base);
  const keep = current.filter((key) => key === HOME_KEY || isLive(key));
  if (keep.length !== current.length) commit(base, keep);
}
