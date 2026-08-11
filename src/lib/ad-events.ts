import "server-only";

import { and, count, eq, gte } from "drizzle-orm";

import { db } from "@/db";
import { adEvents } from "@/db/schema";
import { isAdSlot, type AdSlot } from "@/lib/ad-targeting";

/**
 * Per-caller ceiling on logged events per hour.
 *
 * A page view reports at most a handful of impressions, so a reader
 * working through the whole site stays far below this. It exists so a
 * leaked link can't be turned into an unbounded stream of inserts.
 */
export const EVENTS_PER_IP_HOURLY = 500;

/** Most events one request may carry — a page view's worth, with slack. */
export const MAX_EVENTS_PER_REQUEST = 12;

export type AdEventKind = "impression" | "click";

export interface AdEventInput {
  adId: string;
  kind: AdEventKind;
  slot: AdSlot;
}

function isKind(value: string): value is AdEventKind {
  return value === "impression" || value === "click";
}

/**
 * Parse a reported batch. The body comes from the browser, so nothing in
 * it is trusted: unknown kinds and slots are dropped rather than stored,
 * and the batch is capped before anything reaches the database. A bad id
 * needs no check of its own — the foreign key refuses it.
 */
export function parseAdEvents(raw: unknown): AdEventInput[] {
  if (!Array.isArray(raw)) return [];

  const events: AdEventInput[] = [];
  const seen = new Set<string>();

  for (const item of raw.slice(0, MAX_EVENTS_PER_REQUEST)) {
    if (!item || typeof item !== "object") continue;
    const entry = item as { adId?: unknown; kind?: unknown; slot?: unknown };

    const adId = typeof entry.adId === "string" ? entry.adId : "";
    const kind = typeof entry.kind === "string" ? entry.kind : "";
    const slot = typeof entry.slot === "string" ? entry.slot : "";
    if (!adId || !isKind(kind) || !isAdSlot(slot)) continue;

    // One ad in one slot is one impression, however many times a
    // re-render reported it.
    const key = `${adId}:${kind}:${slot}`;
    if (seen.has(key)) continue;
    seen.add(key);

    events.push({ adId, kind, slot });
  }

  return events;
}

/** True when this caller has room left in the hour. */
export async function withinEventLimit(ipHash: string): Promise<boolean> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const rows = await db
    .select({ n: count() })
    .from(adEvents)
    .where(and(eq(adEvents.ipHash, ipHash), gte(adEvents.createdAt, hourAgo)));
  return (rows[0]?.n ?? 0) < EVENTS_PER_IP_HOURLY;
}

/**
 * Append a batch. Best-effort by design — an ad that rendered fine but
 * failed to record is a gap in a vanity statistic, not an error worth
 * surfacing to the reader.
 */
export async function logAdEvents(
  events: AdEventInput[],
  ipHash: string,
): Promise<void> {
  if (events.length === 0) return;
  try {
    await db
      .insert(adEvents)
      .values(events.map((event) => ({ ...event, ipHash })));
  } catch (error: unknown) {
    console.error("ad event logging failed:", error);
  }
}
