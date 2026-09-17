import "server-only";

import { cache } from "react";

import type { InferSelectModel } from "drizzle-orm";

import { db } from "@/db";
import { teamMatchPage } from "@/db/schema";
import { cachedContent } from "@/lib/content-cache";
import type { Serialized } from "@/lib/serialized";

/** The row as it comes back from the content cache. */
export type TeamMatchPage = Serialized<InferSelectModel<typeof teamMatchPage>>;

const loadTeamMatchPage = cachedContent(
  "team-match-page",
  async (): Promise<InferSelectModel<typeof teamMatchPage> | null> => {
    const rows = await db.select().from(teamMatchPage).limit(1);
    return rows[0] ?? null;
  },
);

/** Singleton row for the hidden page; null until seeded. */
export const getTeamMatchPage = cache(
  (): Promise<TeamMatchPage | null> => loadTeamMatchPage(),
);
