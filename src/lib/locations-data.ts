import "server-only";

import { cache } from "react";

import type { InferSelectModel } from "drizzle-orm";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { locationPins } from "@/db/schema";
import { cachedContent } from "@/lib/content-cache";
import type { LocationPin } from "@/lib/location-pins";

export type LocationPinRow = InferSelectModel<typeof locationPins>;

/** Every pin, switched-off ones included — the admin list. */
export async function getAllLocationPins(): Promise<LocationPinRow[]> {
  return db
    .select()
    .from(locationPins)
    .orderBy(asc(locationPins.sortOrder), asc(locationPins.createdAt));
}

/**
 * The pins the map may draw, in authored order.
 *
 * A switched-off pin is never sent to the browser: filtering in the
 * component would ship the row to every visitor and rely on render order
 * to keep it hidden — the same reason `getActiveAds` filters here.
 *
 * A database without the table yet returns nothing rather than taking
 * the page down; the section simply doesn't render.
 */
const loadActiveLocationPins = cachedContent(
  "active-location-pins",
  async (): Promise<LocationPin[]> =>
    db
      .select({
        id: locationPins.id,
        label: locationPins.label,
        note: locationPins.note,
        lat: locationPins.lat,
        lng: locationPins.lng,
        priority: locationPins.priority,
      })
      .from(locationPins)
      .where(eq(locationPins.active, true))
      .orderBy(asc(locationPins.sortOrder), asc(locationPins.createdAt)),
);

export const getActiveLocationPins = cache(
  async (): Promise<LocationPin[]> => {
    // The catch sits outside the cache so a failed read is retried next
    // time rather than remembered as "no pins" for a minute.
    try {
      return await loadActiveLocationPins();
    } catch (error: unknown) {
      console.error("location pins unavailable:", error);
      return [];
    }
  },
);
