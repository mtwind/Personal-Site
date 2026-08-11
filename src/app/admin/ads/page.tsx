import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdsManager } from "@/components/admin/ads-manager";
import { adminReturn } from "@/lib/admin-return";
import { getAdEventsToday, getAdsWithStats, getRecentAdEvents } from "@/lib/ads";
import { getAuthState } from "@/lib/auth";

/** Editor-only admin view; invisible (404) to everyone else. */
export const metadata: Metadata = {
  title: "Ads",
  robots: { index: false, follow: false },
};

export default async function AdsAdminPage() {
  const { isEditor } = await getAuthState();
  if (!isEditor) notFound();

  const [ads, today, recent, back] = await Promise.all([
    getAdsWithStats(),
    getAdEventsToday(),
    getRecentAdEvents(),
    adminReturn(),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <Link
        href={back.href}
        className="font-sans text-[11px] font-semibold tracking-[0.18em] text-(--dim) uppercase transition-colors duration-200 hover:text-(--accent)"
      >
        {back.label}
      </Link>
      <h1 className="mt-6 text-3xl text-(--title)">Ads</h1>
      <p className="mt-1 max-w-[60ch] font-sans text-[12.5px] text-(--dim)">
        The brands and pastimes you actually like, running on the team-matching
        page as sponsored placements. Nobody pays for these, and every ad says
        so behind its ⓘ.
      </p>

      <AdsManager ads={ads} today={today} recent={recent} />
    </main>
  );
}
