import "server-only";

import { and, count, eq, gte } from "drizzle-orm";

import { db } from "@/db";
import { searchQueries } from "@/db/schema";
import { MAX_QUERY_LENGTH } from "@/lib/ask-limits";

/**
 * The record of what visitors searched for.
 *
 * The keyword search runs in the browser, so unless it says so the query
 * log only ever contains searches that also reached the AI overview —
 * which is to say, none of the ones that found nothing. Those are the
 * rows worth having: a search returning zero results is a visitor asking
 * this profile for something it doesn't answer.
 */

/** Searches one caller may log per hour. */
export const PER_IP_HOURLY = 60;

/** The outcome value a browser-logged search is written under. */
export const SEARCH_OUTCOME = "search";

export interface SearchLogEntry {
  query: string;
  /** How many results the browser's own search returned. */
  results: number;
}

/**
 * Read a beacon's body, or null if it isn't one.
 *
 * The count arrives from the browser, so it is a claim rather than a
 * fact — clamped to something a profile could plausibly return, because
 * a forged "9e99 results" would poison every average computed later.
 */
export function parseSearchLog(body: unknown): SearchLogEntry | null {
  if (typeof body !== "object" || body === null) return null;
  const { query, results } = body as Record<string, unknown>;

  if (typeof query !== "string") return null;
  const trimmed = query.trim();
  if (trimmed === "") return null;

  return {
    query: trimmed.slice(0, MAX_QUERY_LENGTH),
    results:
      typeof results === "number" && Number.isFinite(results)
        ? Math.max(0, Math.min(Math.round(results), 1000))
        : 0,
  };
}

/**
 * Whether this caller has room to log another search.
 *
 * Looser than the ask ceiling because it guards a row rather than a
 * model call: a visitor reading carefully can easily run twenty
 * searches, and the only cost of one is a few bytes.
 */
export async function withinSearchLimit(ipHash: string): Promise<boolean> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [mine] = await db
    .select({ n: count() })
    .from(searchQueries)
    .where(
      and(
        eq(searchQueries.ipHash, ipHash),
        gte(searchQueries.createdAt, hourAgo),
      ),
    );

  return (mine?.n ?? 0) < PER_IP_HOURLY;
}

/** Append one search. Best effort: a lost statistic breaks nothing. */
export async function logSearch(
  entry: SearchLogEntry,
  ipHash: string,
): Promise<void> {
  try {
    await db.insert(searchQueries).values({
      query: entry.query,
      ipHash,
      outcome: SEARCH_OUTCOME,
      resultCount: entry.results,
    });
  } catch (error: unknown) {
    console.error("search_queries insert failed:", error);
  }
}
