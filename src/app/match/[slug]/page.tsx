import { notFound } from "next/navigation";

import { HomeView } from "@/components/match/home-view";
import { MatchEditorForm } from "@/components/match/match-editor-form";
import { getAuthState } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { getMatchContext } from "@/lib/match-index";

/**
 * The page a visit starts on. The search lives here — a query is
 * `?q=`, so it is a real history entry rather than a mode the reader
 * can't back out of — and so does the way in to every other page.
 */
export default async function MatchHome(props: PageProps<"/match/[slug]">) {
  const [{ slug }, search, context, auth] = await Promise.all([
    props.params,
    props.searchParams,
    getMatchContext(),
    getAuthState(),
  ]);

  if (!context || context.page.slug !== slug) notFound();

  const { page, contactEmail } = context;
  const query = typeof search.q === "string" ? search.q.trim() : "";

  // The editor is a mode of the home page rather than a route of its
  // own: it belongs to no tab, and closing it is a plain link back.
  if (auth.isEditor && search.edit === "1") {
    return (
      <MatchEditorForm
        page={page}
        featured={context.featured}
        referenceIndex={context.index}
      />
    );
  }

  const meetingHref =
    page.meetingUrl ??
    (contactEmail
      ? `mailto:${contactEmail}?subject=Team%20matching%20chat`
      : null);

  return (
    <HomeView
      query={query}
      // Whether the overview can answer at all. Deciding here rather than
      // in the browser means an unconfigured site never fires a request
      // that can only come back 503.
      aiEnabled={Boolean(getServerEnv().ANTHROPIC_API_KEY)}
      headline={page.headline}
      intro={page.intro}
      featured={context.featured}
      resumeUrl={page.resumeUrl}
      meetingHref={meetingHref}
    />
  );
}
