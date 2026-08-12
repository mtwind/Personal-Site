/**
 * What this visit has already said about itself.
 *
 * The prompt is at the foot of every page, so without this it would be
 * at the foot of every page *again* after being answered — which is the
 * quickest way to turn one polite question into a nag. It lives in
 * `sessionStorage` for the same reason the tab strip does: it belongs to
 * this visit, and a reader who comes back next week is someone worth
 * asking again.
 *
 * A store rather than state, for the same reason as the tabs: two
 * components read it — the strip and the dialog the "leave" button opens
 * — and an answer given to one has to be known to the other without
 * either owning the other.
 *
 * Nothing here is trusted by the server: the id is a handle to a row the
 * visitor themselves created, and the server checks its own conditions
 * before letting a second answer near it.
 */

const KEY = "match-feedback";

export interface FeedbackVisit {
  /** The row this visit started, once a role has been tapped. */
  id: string | null;
  /**
   * The role that was tapped. Remembered as well as stored, because it
   * decides which questions come next — and the dialog on the way out
   * has to reach the same answer as the strip that asked first.
   */
  role: string | null;
  /** True once the note-and-call half has been answered or waved off. */
  done: boolean;
  /** True when the reader closed the prompt instead of answering. */
  dismissed: boolean;
}

/** What the server renders from: a visit that hasn't said anything yet. */
const NOTHING_YET: FeedbackVisit = {
  id: null,
  role: null,
  done: false,
  dismissed: false,
};

const listeners = new Set<() => void>();
let snapshot: FeedbackVisit | null = null;

function load(): FeedbackVisit {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return NOTHING_YET;
    const visit = parsed as Partial<FeedbackVisit>;
    return {
      id: typeof visit.id === "string" ? visit.id : null,
      role: typeof visit.role === "string" ? visit.role : null,
      done: visit.done === true,
      dismissed: visit.dismissed === true,
    };
  } catch {
    // Private browsing, or something else wrote nonsense there.
    return NOTHING_YET;
  }
}

export function subscribeFeedbackVisit(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Cached and only ever replaced, so it can be compared by identity. */
export function getFeedbackVisit(): FeedbackVisit {
  snapshot ??= load();
  return snapshot;
}

export function getServerFeedbackVisit(): FeedbackVisit {
  return NOTHING_YET;
}

/** Merge into what's remembered, and tell everyone reading it. */
export function writeFeedbackVisit(change: Partial<FeedbackVisit>): void {
  const next = { ...getFeedbackVisit(), ...change };
  snapshot = next;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage is unavailable or full — the prompt just asks again.
  }
  for (const listener of listeners) listener();
}
