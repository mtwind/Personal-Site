import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PagesManager } from "@/components/admin/pages-manager";
import { adminReturn } from "@/lib/admin-return";
import { getAuthState } from "@/lib/auth";
import { extractionAvailable } from "@/lib/extract-document";
import { getSitePages } from "@/lib/pages-data";
import { buildReferenceIndex } from "@/lib/match-references";
import { getProfileData } from "@/lib/profile-data";
import { referenceOptions } from "@/lib/reference-options";

/** Editor-only admin view; invisible (404) to everyone else. */
export const metadata: Metadata = {
  title: "Pages",
  robots: { index: false, follow: false },
};

export default async function PagesAdminPage() {
  const { isEditor } = await getAuthState();
  if (!isEditor) notFound();

  const [sitePages, profile, back] = await Promise.all([
    getSitePages(),
    getProfileData(),
    adminReturn(),
  ]);

  // The picker offers exactly what the resolver will accept, built from
  // the same index the team-matching pages render from.
  const options = referenceOptions(buildReferenceIndex(profile, sitePages));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <Link
        href={back.href}
        className="font-sans text-[11px] font-semibold tracking-[0.18em] text-(--dim) uppercase transition-colors duration-200 hover:text-(--accent)"
      >
        {back.label}
      </Link>
      <h1 className="mt-6 text-3xl text-(--title)">Pages</h1>
      <p className="mt-1 max-w-[60ch] font-sans text-[12.5px] text-(--dim)">
        The written half of the team-matching site: where you are in a process,
        what you told an interviewer, a letter someone wrote about you. A
        published page is a real page a visitor can open; every page that
        isn&apos;t a draft also grounds the AI overview&apos;s answers.
      </p>

      <PagesManager
        pages={sitePages}
        extractionEnabled={extractionAvailable()}
        referenceOptions={options}
      />
    </main>
  );
}
