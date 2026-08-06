/**
 * Create the team_match_page singleton with an unguessable slug.
 * Idempotent: prints the existing URL if the row already exists.
 * Run: npx tsx scripts/seed-team-match.ts
 */
import { randomBytes } from "node:crypto";

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { teamMatchPage } from "../src/db/schema";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL required");

async function main(): Promise<void> {
  const client = postgres(databaseUrl!, { prepare: false, max: 1 });
  const db = drizzle(client);

  const existing = await db
    .select({ slug: teamMatchPage.slug })
    .from(teamMatchPage)
    .limit(1);

  if (existing[0]) {
    console.log(`Team match page already exists: /match/${existing[0].slug}`);
    await client.end();
    return;
  }

  const slug = randomBytes(16).toString("hex");
  await db.insert(teamMatchPage).values({
    slug,
    headline: "Team Matching Profile",
    intro:
      "A closer look at what I'm hoping to find in a team — beyond what fits on a résumé.",
    sections: [
      {
        title: "What I'm looking for",
        body: "Edit this page (sign in with your editor account) to describe the teams, problem spaces, and locations you're excited about.",
      },
    ],
  });
  console.log(`Created team match page: /match/${slug}`);
  await client.end();
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
