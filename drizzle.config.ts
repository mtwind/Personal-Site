import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

// `generate` works offline; `migrate`/`push` need a real DATABASE_URL.
// The placeholder makes offline generation work and fails loudly (with a
// connection error) if migrate/push run without .env.local configured.
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  // Never touch Supabase-managed schemas (auth, storage, ...).
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
