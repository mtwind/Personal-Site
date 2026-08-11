import "server-only";

import { and, count, desc, gte, sql } from "drizzle-orm";

import { db } from "@/db";
import { searchQueries } from "@/db/schema";
import { SEARCH_OUTCOME } from "@/lib/search-log";

/**
 * What visitors looked for, read back.
 *
 * Two kinds of row live in `search_queries`: searches the browser logged
 * (outcome `search`, with a result count) and questions the AI overview
 * answered (every other outcome). They are reported apart because they
 * mean different things — one is what people wanted, the other is what
 * it cost to answer them.
 *
 * All reads go over the direct Drizzle connection, which bypasses RLS,
 * so callers must gate on editor status themselves.
 */

/** How many rows each list shows. */
const TOP_LIMIT = 25;

export interface QueryCount {
  query: string;
  /** Times the browser's own search ran this. */
  searches: number;
  /** Times it was put to the AI overview instead. */
  asked: number;
  /**
   * Most results this query ever returned, or null when it was only
   * ever asked of the overview — which never counted any. Null and zero
   * mean opposite things here, so they stay apart: one is "we don't
   * know", the other is "we looked and there was nothing".
   */
  bestResults: number | null;
  lastAt: Date;
}

export interface DayCount {
  day: string;
  searches: number;
}

export interface SearchConsoleData {
  totalSearches: number;
  searchesThisWeek: number;
  /** Distinct queries that returned nothing, in the same window. */
  emptyQueries: number;
  aiAnswers: number;
  aiFailures: number;
  topQueries: QueryCount[];
  zeroResultQueries: QueryCount[];
  byDay: DayCount[];
  /** Model spend, which only the ask rows carry. */
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

/** Case-folded, so "Rust" and "rust" are one question asked twice. */
const normalized = sql<string>`lower(trim(${searchQueries.query}))`;

export async function getSearchConsoleData(
  days: number = 30,
): Promise<SearchConsoleData> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const isSearch = sql`${searchQueries.outcome} = ${SEARCH_OUTCOME}`;

  const [totals, week, top, empty, daily] = await Promise.all([
    db
      .select({
        searches: sql<number>`count(*) filter (where ${isSearch})::int`,
        answers: sql<number>`count(*) filter (where ${searchQueries.outcome} = 'ok')::int`,
        failures: sql<number>`count(*) filter (where ${searchQueries.outcome} in ('error','unavailable','empty'))::int`,
        inputTokens: sql<number>`coalesce(sum(${searchQueries.inputTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${searchQueries.outputTokens}), 0)::int`,
        cachedTokens: sql<number>`coalesce(sum(${searchQueries.cachedTokens}), 0)::int`,
      })
      .from(searchQueries)
      .where(gte(searchQueries.createdAt, since)),

    db
      .select({
        searches: sql<number>`count(*) filter (where ${isSearch})::int`,
        empty: sql<number>`count(distinct ${normalized}) filter (where ${isSearch} and ${searchQueries.resultCount} = 0)::int`,
      })
      .from(searchQueries)
      .where(gte(searchQueries.createdAt, weekAgo)),

    db
      .select({
        query: normalized,
        searches: sql<number>`count(*) filter (where ${isSearch})::int`,
        asked: sql<number>`count(*) filter (where not ${isSearch})::int`,
        bestResults: sql<number | null>`max(${searchQueries.resultCount})::int`,
        lastAt: sql<Date>`max(${searchQueries.createdAt})`,
      })
      .from(searchQueries)
      .where(gte(searchQueries.createdAt, since))
      .groupBy(normalized)
      .orderBy(desc(count()))
      .limit(TOP_LIMIT),

    db
      .select({
        query: normalized,
        searches: count(),
        asked: sql<number>`0::int`,
        bestResults: sql<number | null>`max(${searchQueries.resultCount})::int`,
        lastAt: sql<Date>`max(${searchQueries.createdAt})`,
      })
      .from(searchQueries)
      .where(and(gte(searchQueries.createdAt, since), isSearch))
      .groupBy(normalized)
      // A query whose *best* attempt still found nothing is one this
      // profile genuinely doesn't answer — not one that raced a typo.
      .having(sql`coalesce(max(${searchQueries.resultCount}), 0) = 0`)
      .orderBy(desc(count()))
      .limit(TOP_LIMIT),

    db
      .select({
        day: sql<string>`to_char(${searchQueries.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`,
        searches: count(),
      })
      .from(searchQueries)
      .where(and(gte(searchQueries.createdAt, since), isSearch))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
  ]);

  return {
    totalSearches: totals[0]?.searches ?? 0,
    searchesThisWeek: week[0]?.searches ?? 0,
    emptyQueries: week[0]?.empty ?? 0,
    aiAnswers: totals[0]?.answers ?? 0,
    aiFailures: totals[0]?.failures ?? 0,
    inputTokens: totals[0]?.inputTokens ?? 0,
    outputTokens: totals[0]?.outputTokens ?? 0,
    cachedTokens: totals[0]?.cachedTokens ?? 0,
    topQueries: top.map(toQueryCount),
    zeroResultQueries: empty.map(toQueryCount),
    byDay: daily.map((row) => ({ day: row.day, searches: row.searches })),
  };
}

function toQueryCount(row: {
  query: string;
  searches: number;
  asked: number;
  bestResults: number | null;
  lastAt: Date | string;
}): QueryCount {
  return {
    query: row.query,
    searches: row.searches,
    asked: row.asked,
    bestResults: row.bestResults,
    lastAt: row.lastAt instanceof Date ? row.lastAt : new Date(row.lastAt),
  };
}
