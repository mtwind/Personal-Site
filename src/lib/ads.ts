import "server-only";

import { cache } from "react";

import { asc, count, desc, eq, sql } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

import { db } from "@/db";
import { adEvents, ads } from "@/db/schema";
import type { Ad } from "@/lib/ad-targeting";

export type AdRow = InferSelectModel<typeof ads>;

export type { Ad };

/** Impressions and clicks for one ad, for the admin list. */
export interface AdStats {
  impressions: number;
  clicks: number;
}

export interface AdWithStats extends AdRow {
  stats: AdStats;
}

function toAd(row: AdRow): Ad {
  return {
    id: row.id,
    brand: row.brand,
    headline: row.headline,
    description: row.description,
    displayUrl: row.displayUrl,
    targetUrl: row.targetUrl,
    iconSlug: row.iconSlug,
    color: row.color,
    iconUrl: row.iconUrl,
    keywords: row.keywords,
    slots: row.slots,
  };
}

/**
 * The ads eligible to run, trimmed to what the client needs.
 *
 * A switched-off ad is not sent to the browser at all — filtering in the
 * component would ship the row to every visitor and rely on render order
 * to keep it hidden.
 *
 * The whole list goes down with the page rather than one ad per slot:
 * six rows of text is nothing next to the round trip a per-slot request
 * would cost, and it lets a client-side view pick an ad for a query it
 * resolved itself without asking the server again.
 */
export const getActiveAds = cache(async (): Promise<Ad[]> => {
  try {
    const rows = await db
      .select()
      .from(ads)
      .where(eq(ads.active, true))
      .orderBy(asc(ads.sortOrder), asc(ads.createdAt));
    return rows.map(toAd);
  } catch (error: unknown) {
    // An unmigrated database shouldn't take the whole page down over a
    // decorative feature — run without ads instead.
    console.error("ads unavailable:", error);
    return [];
  }
});

/** Every ad, switched off ones included, with its counts. Admin only. */
export const getAdsWithStats = cache(async (): Promise<AdWithStats[]> => {
  const [rows, counts] = await Promise.all([
    db.select().from(ads).orderBy(asc(ads.sortOrder), asc(ads.createdAt)),
    db
      .select({
        adId: adEvents.adId,
        kind: adEvents.kind,
        total: count(),
      })
      .from(adEvents)
      .groupBy(adEvents.adId, adEvents.kind),
  ]);

  return rows.map((row) => {
    const mine = counts.filter((entry) => entry.adId === row.id);
    return {
      ...row,
      stats: {
        impressions: mine.find((e) => e.kind === "impression")?.total ?? 0,
        clicks: mine.find((e) => e.kind === "click")?.total ?? 0,
      },
    };
  });
});

/** The most recent events, so the admin page can show live activity. */
export const getRecentAdEvents = cache(
  async (
    limit = 20,
  ): Promise<
    { id: string; brand: string; kind: string; slot: string; at: Date }[]
  > => {
    const rows = await db
      .select({
        id: adEvents.id,
        brand: ads.brand,
        kind: adEvents.kind,
        slot: adEvents.slot,
        at: adEvents.createdAt,
      })
      .from(adEvents)
      .innerJoin(ads, eq(adEvents.adId, ads.id))
      .orderBy(desc(adEvents.createdAt))
      .limit(limit);
    return rows;
  },
);

/** Events in the last 24h, for the "today" line above the admin table. */
export const getAdEventsToday = cache(async (): Promise<AdStats> => {
  const rows = await db
    .select({ kind: adEvents.kind, total: count() })
    .from(adEvents)
    .where(sql`${adEvents.createdAt} >= now() - interval '24 hours'`)
    .groupBy(adEvents.kind);

  return {
    impressions: rows.find((r) => r.kind === "impression")?.total ?? 0,
    clicks: rows.find((r) => r.kind === "click")?.total ?? 0,
  };
});
