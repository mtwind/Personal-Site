import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EntryView } from "@/components/match/entry-views";
import { getMatchContext } from "@/lib/match-index";
import { signedDocumentUrl } from "@/lib/storage";

/**
 * One of the site's own written pages.
 *
 * Pages have their own route rather than going through the shared entry
 * page because a document link can't be built on the client: the bucket
 * is private, so the URL has to be signed here, per request, and it
 * expires.
 */
async function findPage(pageSlug: string, entrySlug: string) {
  const context = await getMatchContext();
  if (!context || context.page.slug !== pageSlug) return null;

  const target = context.resolver.fromSlug("page", entrySlug);
  return target ? context.resolver.page(target.id) : null;
}

export async function generateMetadata(
  props: PageProps<"/match/[slug]/page/[entry]">,
): Promise<Metadata> {
  const { slug, entry } = await props.params;
  const found = await findPage(slug, entry);
  return { title: found?.title ?? "Not found" };
}

export default async function MatchWrittenPage(
  props: PageProps<"/match/[slug]/page/[entry]">,
) {
  const { slug, entry } = await props.params;
  const found = await findPage(slug, entry);
  if (!found) notFound();

  // Published pages are the only ones with a route, so this only ever
  // signs a document its owner chose to publish.
  const context = await getMatchContext();
  const stored = context?.sitePages.find((row) => row.id === found.id) ?? null;
  const documentUrl = await signedDocumentUrl(stored?.filePath ?? null);

  return (
    <EntryView target={{ kind: "page", id: found.id }} documentUrl={documentUrl} />
  );
}
