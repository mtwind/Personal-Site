import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * Drizzle client over the Supabase transaction pooler.
 * `prepare: false` is required — PgBouncer in transaction mode does not
 * support prepared statements.
 */
const client = postgres(getServerEnv().DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });
