import "server-only";

import { createHash } from "node:crypto";

import { and, count, eq, gte, ne } from "drizzle-orm";

import { db } from "@/db";
import { searchQueries } from "@/db/schema";
import { getServerEnv } from "@/lib/env";

/**
 * Caps for the public ask endpoint. The page is unauthenticated, so these
 * are the only thing standing between a leaked link and an unbounded bill.
 */
export const PER_IP_HOURLY = 20;
export const GLOBAL_DAILY = 300;

/** Longest question worth spending a model call on. */
export const MAX_QUERY_LENGTH = 300;

export type AskOutcome = "ok" | "rate_limited" | "unavailable" | "error";

/**
 * Salted hash of the caller's IP. Rate limiting needs to recognise a
 * repeat caller, not to identify one, so the raw address is never stored.
 * The salt keeps the hash from being reversible by trying every IPv4.
 */
export function hashIp(ip: string): string {
  const salt = getServerEnv().IP_HASH_SALT ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Best-effort client IP. Vercel sets `x-forwarded-for`; the leftmost
 * entry is the original client. Unknown callers share one bucket, which
 * errs toward limiting too much rather than too little.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export interface LimitVerdict {
  allowed: boolean;
  /** Which ceiling was hit, for the message shown to the visitor. */
  reason?: "per_ip" | "global";
}

/**
 * Check both ceilings before spending anything.
 *
 * The two counts deliberately differ:
 *
 * - Per IP counts *every* logged attempt, refusals included. A caller who
 *   keeps hammering after being told no stays throttled until they stop
 *   for an hour, which is the point.
 * - Globally, refusals are excluded. That ceiling exists to cap spend, and
 *   a refused request spends nothing. Counting refusals would let one
 *   abusive caller burn the day's budget for every other visitor without
 *   costing themselves anything.
 */
export async function checkAskLimits(ipHash: string): Promise<LimitVerdict> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [perIp, global] = await Promise.all([
    db
      .select({ n: count() })
      .from(searchQueries)
      .where(
        and(
          eq(searchQueries.ipHash, ipHash),
          gte(searchQueries.createdAt, hourAgo),
        ),
      ),
    db
      .select({ n: count() })
      .from(searchQueries)
      .where(
        and(
          gte(searchQueries.createdAt, dayAgo),
          ne(searchQueries.outcome, "rate_limited"),
        ),
      ),
  ]);

  if ((perIp[0]?.n ?? 0) >= PER_IP_HOURLY) {
    return { allowed: false, reason: "per_ip" };
  }
  if ((global[0]?.n ?? 0) >= GLOBAL_DAILY) {
    return { allowed: false, reason: "global" };
  }
  return { allowed: true };
}

export interface AskLogEntry {
  query: string;
  ipHash: string;
  outcome: AskOutcome;
  answer?: string | null;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cachedTokens?: number | null;
}

/**
 * Record an attempt. Logging is best-effort: a failed insert must never
 * take down an answer the visitor already received.
 */
export async function logAsk(entry: AskLogEntry): Promise<void> {
  try {
    await db.insert(searchQueries).values({
      query: entry.query.slice(0, MAX_QUERY_LENGTH),
      ipHash: entry.ipHash,
      outcome: entry.outcome,
      answer: entry.answer ?? null,
      model: entry.model ?? null,
      inputTokens: entry.inputTokens ?? null,
      outputTokens: entry.outputTokens ?? null,
      cachedTokens: entry.cachedTokens ?? null,
    });
  } catch (error: unknown) {
    console.error("search_queries insert failed:", error);
  }
}
