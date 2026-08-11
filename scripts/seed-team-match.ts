/**
 * Create the team_match_page singleton with an unguessable slug, and
 * make sure it has the four standard pages.
 *
 * Idempotent: run it against an existing page and it adds only the
 * standard sections that aren't there yet, matching on title and leaving
 * every authored section — and their order — alone.
 *
 * Run: npx tsx scripts/seed-team-match.ts
 */
import { randomBytes } from "node:crypto";

import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { teamMatchPage } from "../src/db/schema";
import { DEFAULT_SECTIONS } from "../src/lib/match-defaults";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL required");

function normalize(title: string): string {
  return title.trim().toLowerCase();
}

async function main(): Promise<void> {
  const client = postgres(databaseUrl!, { prepare: false, max: 1 });
  const db = drizzle(client);

  const existing = await db
    .select({
      id: teamMatchPage.id,
      slug: teamMatchPage.slug,
      sections: teamMatchPage.sections,
    })
    .from(teamMatchPage)
    .limit(1);

  const row = existing[0];

  if (row) {
    const present = new Set(row.sections.map((s) => normalize(s.title)));
    const missing = DEFAULT_SECTIONS.filter(
      (section) => !present.has(normalize(section.title)),
    );

    if (missing.length === 0) {
      console.log(`Team match page already set up: /match/${row.slug}`);
    } else {
      await db
        .update(teamMatchPage)
        .set({
          sections: [...row.sections, ...missing],
          updatedAt: new Date(),
        })
        .where(eq(teamMatchPage.id, row.id));
      console.log(
        `Added ${missing.length} page(s) to /match/${row.slug}: ` +
          missing.map((section) => section.title).join(", "),
      );
    }

    await client.end();
    return;
  }

  const slug = randomBytes(16).toString("hex");
  await db.insert(teamMatchPage).values({
    slug,
    headline: "Team Matching Profile",
    intro:
      "A closer look at what I'm hoping to find in a team — beyond what fits on a résumé.",
    sections: DEFAULT_SECTIONS,
  });
  console.log(`Created team match page: /match/${slug}`);
  await client.end();
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
