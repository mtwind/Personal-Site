import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LocationsManager } from "@/components/admin/locations-manager";
import { adminReturn } from "@/lib/admin-return";
import { getAuthState } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { getAllLocationPins } from "@/lib/locations-data";

/** Editor-only admin view; invisible (404) to everyone else. */
export const metadata: Metadata = {
  title: "Locations",
  robots: { index: false, follow: false },
};

export default async function LocationsAdminPage() {
  const { isEditor } = await getAuthState();
  if (!isEditor) notFound();

  const [pins, back] = await Promise.all([getAllLocationPins(), adminReturn()]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <Link
        href={back.href}
        className="font-sans text-[11px] font-semibold tracking-[0.18em] text-(--dim) uppercase transition-colors duration-200 hover:text-(--accent)"
      >
        {back.label}
      </Link>
      <h1 className="mt-6 text-3xl text-(--title)">Locations</h1>
      <p className="mt-1 max-w-[60ch] font-sans text-[12.5px] text-(--dim)">
        The places you&apos;d like to be placed, pinned on the map at the foot
        of the team-matching page. Each pin carries the reason it&apos;s there —
        that note is what a reader sees on hover — and an optional rank that
        colours it.
      </p>

      <LocationsManager
        pins={pins}
        mapsApiKey={getServerEnv().GOOGLE_MAPS_API_KEY ?? null}
      />
    </main>
  );
}
