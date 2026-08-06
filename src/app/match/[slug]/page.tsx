import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MatchPageClient } from "@/components/match/match-page";
import { getAuthState } from "@/lib/auth";
import { getProfileData } from "@/lib/profile-data";
import { getTeamMatchPage } from "@/lib/team-match-data";

/** Hidden page: reachable only by exact slug, never indexed or linked. */
export const metadata: Metadata = {
  title: "Team Matching",
  robots: { index: false, follow: false },
};

export default async function MatchPage(props: PageProps<"/match/[slug]">) {
  const { slug } = await props.params;
  const [page, auth, profile] = await Promise.all([
    getTeamMatchPage(),
    getAuthState(),
    getProfileData(),
  ]);

  if (!page || page.slug !== slug) notFound();

  return (
    <MatchPageClient
      page={page}
      isEditor={auth.isEditor}
      ownerName={profile.about?.name ?? "Matthew Wind"}
      contactEmail={profile.contact?.email ?? null}
    />
  );
}
