import "server-only";

import { cache } from "react";

import type { InferSelectModel } from "drizzle-orm";

import { db } from "@/db";
import { teamMatchPage } from "@/db/schema";

export type TeamMatchPage = InferSelectModel<typeof teamMatchPage>;

/** Singleton row for the hidden page; null until seeded. */
export const getTeamMatchPage = cache(
  async (): Promise<TeamMatchPage | null> => {
    const rows = await db.select().from(teamMatchPage).limit(1);
    return rows[0] ?? null;
  },
);
