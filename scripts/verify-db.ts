import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL missing");

const sql = postgres(url, { prepare: false, max: 1 });

async function main(): Promise<void> {
  const migrations = await sql`
    select hash, created_at from drizzle.__drizzle_migrations order by created_at`;
  console.log("MIGRATIONS APPLIED:", migrations.length);

  const tables = await sql`
    select tablename, rowsecurity from pg_tables
    where schemaname = 'public' order by tablename`;
  console.log("\nPUBLIC TABLES (rls enabled?):");
  for (const t of tables) console.log(` - ${t.tablename}  rls=${t.rowsecurity}`);

  const policies = await sql`
    select tablename, policyname, cmd from pg_policies
    where schemaname = 'public' order by tablename, policyname`;
  console.log("\nPOLICIES:", policies.length);
  for (const p of policies)
    console.log(` - ${p.tablename}: ${p.policyname} [${p.cmd}]`);

  await sql.end();
}

main().catch((err: unknown) => {
  console.error("VERIFY FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
