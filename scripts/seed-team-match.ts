/**
 * Create the team_match_page singleton with an unguessable slug, and
 * make sure the four standard pages exist behind it.
 *
 * Idempotent: run it against an existing site and it adds only the
 * standard pages that aren't there yet, matching on title. Pages that
 * are already featured on the home page keep their place; newly created
 * ones are appended to the listing, so nothing an editor arranged by
 * hand is rearranged here.
 *
 * Run: npx tsx scripts/seed-team-match.ts
 */
import { randomBytes } from "node:crypto";

import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { pages, teamMatchPage } from "../src/db/schema";
import { DEFAULT_PAGES } from "../src/lib/match-defaults";

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
      featured: teamMatchPage.featured,
    })
    .from(teamMatchPage)
    .limit(1);

  let row = existing[0];

  if (!row) {
    const slug = randomBytes(16).toString("hex");
    const created = await db
      .insert(teamMatchPage)
      .values({
        slug,
        headline: "Team Matching Profile",
        intro:
          "A closer look at what I'm hoping to find in a team — beyond what fits on a résumé.",
      })
      .returning({
        id: teamMatchPage.id,
        slug: teamMatchPage.slug,
        featured: teamMatchPage.featured,
      });
    row = created[0];
    console.log(`Created team match page: /match/${slug}`);
  }

  const written = await db.select({ title: pages.title }).from(pages);
  const present = new Set(written.map((page) => normalize(page.title)));
  const missing = DEFAULT_PAGES.filter(
    (page) => !present.has(normalize(page.title)),
  );

  if (missing.length === 0) {
    console.log(`Team match page already set up: /match/${row.slug}`);
    await client.end();
    return;
  }

  const created = await db
    .insert(pages)
    .values(
      missing.map((page, index) => ({
        kind: "page",
        title: page.title,
        body: page.body,
        visibility: "published",
        showSkillRanking: page.showSkillRanking ?? false,
        sortOrder: written.length + index,
      })),
    )
    .returning({ id: pages.id });

  await db
    .update(teamMatchPage)
    .set({
      featured: [
        ...row.featured,
        ...created.map((page) => ({
          kind: "page",
          id: page.id,
          title: null,
          snippet: null,
        })),
      ],
      updatedAt: new Date(),
    })
    .where(eq(teamMatchPage.id, row.id));

  console.log(
    `Added ${missing.length} page(s) to /match/${row.slug}: ` +
      missing.map((page) => page.title).join(", "),
  );

  await client.end();
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
