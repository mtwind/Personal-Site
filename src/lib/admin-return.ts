import "server-only";

import { matchBase } from "@/lib/match-tabs";
import { getTeamMatchPage } from "@/lib/team-match-data";

/**
 * Where an admin page's back link goes.
 *
 * Both admin pages are reached from the team-matching header, so that
 * is where "back" means — not the public profile, which is a different
 * site the editor wasn't looking at. Falls back to the public home when
 * no team-matching page has been seeded.
 */
export async function adminReturn(): Promise<{ href: string; label: string }> {
  const page = await getTeamMatchPage();
  return page
    ? { href: matchBase(page.slug), label: "← Back to team matching" }
    : { href: "/", label: "← Back to site" };
}
