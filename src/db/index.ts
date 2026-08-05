import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * Drizzle client over the Supabase pooler.
 *
 * - `prepare: false`: required for the transaction pooler; harmless on
 *   the session pooler, so the same URL works in both modes.
 * - `max: 1`: the session pooler allows only 15 clients TOTAL. The
 *   postgres-js default of 10 nearly exhausts it on its own; Supabase's
 *   pooler does the real pooling, so one app-side connection is enough.
 * - globalThis cache: Next dev hot-reloads re-evaluate this module and
 *   would otherwise open a fresh pool each time, leaking connections
 *   until the pooler rejects everything (EMAXCONNSESSION).
 */
const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.pgClient ??
  postgres(getServerEnv().DATABASE_URL, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
