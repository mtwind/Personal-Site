import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QuestionsManager } from "@/components/admin/questions-manager";
import { adminReturn } from "@/lib/admin-return";
import { getAuthState } from "@/lib/auth";
import { buildReferenceIndex } from "@/lib/match-references";
import { getSitePages } from "@/lib/pages-data";
import { getProfileData } from "@/lib/profile-data";
import { getAllQuestions } from "@/lib/questions-data";
import { referenceOptions } from "@/lib/reference-options";

/** Editor-only admin view; invisible (404) to everyone else. */
export const metadata: Metadata = {
  title: "Questions",
  robots: { index: false, follow: false },
};

export default async function QuestionsAdminPage() {
  const { isEditor } = await getAuthState();
  if (!isEditor) notFound();

  const [questions, sitePages, profile, back] = await Promise.all([
    getAllQuestions(),
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
      <h1 className="mt-6 text-3xl text-(--title)">People also ask</h1>
      <p className="mt-1 max-w-[60ch] font-sans text-[12.5px] text-(--dim)">
        The questions a visitor has but wouldn&apos;t type — answered under
        every search, before they think to ask.
      </p>

      <QuestionsManager questions={questions} referenceOptions={options} />
    </main>
  );
}
