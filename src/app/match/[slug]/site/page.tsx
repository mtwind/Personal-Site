import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMatchContext } from "@/lib/match-index";
import { SITE_TITLE } from "@/lib/match-tabs";

export const metadata: Metadata = { title: SITE_TITLE };

/**
 * The ordinary website, in a tab of this one.
 *
 * A frame rather than a re-render of the site's own components: the
 * shell around this page overrides the palette to Google's and the font
 * to Roboto, which is right for everything else here and wrong for a
 * site whose whole look is the point. Framing it keeps the real
 * document — its theme, its serif, its light/dark toggle, its own
 * scrolling — while the strip above stays where it is, so a reader can
 * look at the site and come straight back to the entry they were on.
 *
 * Same origin, same app, so this is the live site rather than a copy of
 * it: anything published on it is what shows up in here.
 */
export default async function MatchSite(
  props: PageProps<"/match/[slug]/site">,
) {
  const [{ slug }, context] = await Promise.all([
    props.params,
    getMatchContext(),
  ]);

  if (!context || context.page.slug !== slug) notFound();

  return (
    <section aria-label={SITE_TITLE}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-[0.12em] text-[#5f6368] uppercase">
            {SITE_TITLE}
          </p>
          <h1 className="mt-1 text-[22px] leading-tight font-normal text-[#202124]">
            Everything else about {context.ownerName}
          </h1>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-[#dadce0] bg-white px-4 py-2 text-[13px] font-medium text-[#1a73e8] transition-colors hover:bg-[#f1f6fe]"
        >
          Open in a new tab ↗
        </a>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#dadce0] bg-white">
        <iframe
          // `embed` drops the site's own link back to this page: in here
          // that link would load the team-matching page inside the tab
          // that is already showing it.
          src="/?embed=1"
          title={`${context.ownerName}'s personal site`}
          // Everything the viewport has left under the header, the
          // strip and this page's own heading — measured, so the frame
          // reaches the bottom of the window and the page around it
          // never grows a second scrollbar. The floor is for the short
          // windows where that arithmetic would leave a letterbox.
          className="block h-[calc(100vh-14rem)] min-h-[440px] w-full"
        />
      </div>
    </section>
  );
}
