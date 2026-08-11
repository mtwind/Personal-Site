import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { notFound } from "next/navigation";

import { AdRail } from "@/components/match/match-ads";
import { MatchShell } from "@/components/match/match-shell";
import { getActiveAds } from "@/lib/ads";
import { getAuthState } from "@/lib/auth";
import { getMatchContext } from "@/lib/match-index";
import { matchBase } from "@/lib/match-tabs";

/** Roboto: the authentic Google typeface for this page only. */
const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

/**
 * Hidden page: reachable only by exact slug, never indexed or linked.
 * Every page under it names itself in the title, so the browser's own
 * tab reads like the strip inside the page.
 */
export const metadata: Metadata = {
  title: { default: "Team Matching", template: "%s · Team Matching" },
  robots: { index: false, follow: false },
};

export default async function MatchLayout(props: LayoutProps<"/match/[slug]">) {
  const { slug } = await props.params;
  const [context, auth, ads] = await Promise.all([
    getMatchContext(),
    getAuthState(),
    getActiveAds(),
  ]);

  if (!context || context.page.slug !== slug) notFound();

  return (
    <MatchShell
      base={matchBase(slug)}
      index={context.index}
      ownerName={context.ownerName}
      homeTitle={context.page.headline || "Team Matching"}
      isEditor={auth.isEditor}
      fontClass={roboto.className}
      ads={ads}
      // Handed in as an element: the rail reads the shell's context, so
      // the shell importing it would make the two import each other. The
      // key is what stops React warning about it — an element built here
      // and rendered beside `children` over there arrives without the
      // marking a client-side sibling would have had.
      rail={<AdRail key="ad-rail" />}
    >
      {props.children}
    </MatchShell>
  );
}
