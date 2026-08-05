import type { Metadata } from "next";
import { cookies } from "next/headers";

import { EDIT_MODE_COOKIE, EditModeProvider } from "@/components/edit/edit-mode";
import { ProfileBody } from "@/components/profile/profile-body";
import { SiteFooter, SiteHeader } from "@/components/profile/site-header";
import { getAuthState } from "@/lib/auth";
import { getProfileData } from "@/lib/profile-data";

export async function generateMetadata(): Promise<Metadata> {
  const { about } = await getProfileData();
  const name = about?.name || "Personal Site";
  return {
    title: name,
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

  return (
    <EditModeProvider initial={editMode}>
      <div className="flex min-h-full flex-1 flex-col bg-white dark:bg-black">
        <SiteHeader name={name} auth={auth} />
        <main className="mx-auto w-full max-w-3xl flex-1 divide-y divide-zinc-100 px-4 dark:divide-zinc-900">
          <ProfileBody profile={profile} isEditor={auth.isEditor} />
        </main>
        <SiteFooter name={name} auth={auth} />
      </div>
    </EditModeProvider>
  );
}
