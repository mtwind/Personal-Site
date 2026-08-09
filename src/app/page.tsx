import type { Metadata } from "next";
import { cookies } from "next/headers";

import { EDIT_MODE_COOKIE, EditModeProvider } from "@/components/edit/edit-mode";
import { GhostBackground } from "@/components/profile/ghost";
import { ProfileBody } from "@/components/profile/profile-body";
import { SiteFooter, SiteHeader } from "@/components/profile/site-header";
import { getAuthState } from "@/lib/auth";
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

export default async function Home() {
  const [profile, auth, cookieStore] = await Promise.all([
    getProfileData(),
    getAuthState(),
    cookies(),
  ]);
  const name = profile.about?.name || "Personal Site";
  const editMode =
    auth.isEditor && cookieStore.get(EDIT_MODE_COOKIE)?.value === "on";
  // Secret-page shortcut: fetched (and rendered) only for the editor,
  // so the slug never appears in anyone else's HTML.
  const matchSlug = auth.isEditor
    ? ((await getTeamMatchPage())?.slug ?? null)
    : null;

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
