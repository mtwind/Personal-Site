import type { Metadata } from "next";

import { AboutSection } from "@/components/profile/about-section";
import { ContactSection } from "@/components/profile/contact-section";
import { ExperienceSection } from "@/components/profile/experience-section";
import { ProjectSection } from "@/components/profile/project-section";
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
  const [profile, auth] = await Promise.all([getProfileData(), getAuthState()]);
  const name = profile.about?.name || "Personal Site";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white dark:bg-black">
      <SiteHeader name={name} auth={auth} />
      <main className="mx-auto w-full max-w-3xl flex-1 divide-y divide-zinc-100 px-4 dark:divide-zinc-900">
        <AboutSection about={profile.about} />
        <ExperienceSection experiences={profile.experiences} />
        <ProjectSection projects={profile.projects} />
        <ContactSection contact={profile.contact} />
      </main>
      <SiteFooter name={name} auth={auth} />
    </div>
  );
}
