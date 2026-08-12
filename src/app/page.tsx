import type { Metadata } from "next";
import { cookies } from "next/headers";

import { EDIT_MODE_COOKIE, EditModeProvider } from "@/components/edit/edit-mode";
import { GhostBackground } from "@/components/profile/ghost";
import { ProfileBody } from "@/components/profile/profile-body";
import { SiteFooter, SiteHeader } from "@/components/profile/site-header";
import { getAuthState } from "@/lib/auth";
import { MATCH_VISIT_COOKIE } from "@/lib/match-visit";
import { getProfileData } from "@/lib/profile-data";
import { getTeamMatchPage } from "@/lib/team-match-data";

export async function generateMetadata(): Promise<Metadata> {
  const { about } = await getProfileData();
  const name = about?.name || "Personal Site";
  return {
    // Matches the tab title in the layout, with the name coming from the
    // profile rather than being hardcoded.
    title: `${name} | SWE`,
    description: about?.headline || `${name} — profile, experience, projects`,
  };
}

export default async function Home(props: PageProps<"/">) {
  const [profile, auth, cookieStore, search] = await Promise.all([
    getProfileData(),
    getAuthState(),
    cookies(),
    props.searchParams,
  ]);
  const name = profile.about?.name || "Personal Site";
  const editMode =
    auth.isEditor && cookieStore.get(EDIT_MODE_COOKIE)?.value === "on";

  // Secret-page shortcut, for the two people entitled to one: the
  // editor, and whoever has been on the team-matching page already —
  // which takes a slug nobody can guess, so showing it back to them
  // gives nothing away. Not inside the frame, though: there the site is
  // being viewed *from* that page, and the link would only lead back
  // into the tab it is already in.
  //
  // Looked up at all only when it could be shown, and rendered only
  // when the cookie names the real page, so an invented one leaks
  // nothing and the slug stays out of everyone else's HTML.
  const visited = cookieStore.get(MATCH_VISIT_COOKIE)?.value ?? null;
  const embedded = search.embed === "1";
  const knownSlug =
    !embedded && (auth.isEditor || visited)
      ? ((await getTeamMatchPage())?.slug ?? null)
      : null;
  const matchSlug =
    knownSlug && (auth.isEditor || visited === knownSlug) ? knownSlug : null;

  const initials =
    name
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("") || "MW";

  return (
    <EditModeProvider initial={editMode}>
      <div className="flex min-h-full flex-1 flex-col">
        <GhostBackground initials={initials} />
        <SiteHeader name={name} auth={auth} matchSlug={matchSlug} />
        <main className="relative z-[1] mx-auto w-full max-w-3xl flex-1 px-5">
          <ProfileBody profile={profile} isEditor={auth.isEditor} />
        </main>
        <SiteFooter name={name} auth={auth} />
      </div>
    </EditModeProvider>
  );
}
