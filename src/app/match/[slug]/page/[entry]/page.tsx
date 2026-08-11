import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EntryView } from "@/components/match/entry-views";
import { getMatchContext } from "@/lib/match-index";
import { signedDocumentUrl } from "@/lib/storage";

/**
 * A published background note.
 *
 * Notes have their own route rather than going through the shared
 * entry page because a document link can't be built on the client: the
 * bucket is private, so the URL has to be signed here, per request, and
 * it expires.
 */
async function findNote(pageSlug: string, entrySlug: string) {
  const context = await getMatchContext();
  if (!context || context.page.slug !== pageSlug) return null;

  const target = context.resolver.fromSlug("note", entrySlug);
  return target ? context.resolver.note(target.id) : null;
}

export async function generateMetadata(
  props: PageProps<"/match/[slug]/note/[entry]">,
): Promise<Metadata> {
  const { slug, entry } = await props.params;
  const note = await findNote(slug, entry);
  return { title: note?.title ?? "Not found" };
}

export default async function MatchNotePage(
  props: PageProps<"/match/[slug]/note/[entry]">,
) {
  const { slug, entry } = await props.params;
  const note = await findNote(slug, entry);
  if (!note) notFound();

  // Published notes are the only ones with a page, so this only ever
  // signs a document its owner chose to publish.
  const context = await getMatchContext();
  const stored = context?.notes.find((row) => row.id === note.id) ?? null;
  const documentUrl = await signedDocumentUrl(stored?.filePath ?? null);

  return (
    <EntryView target={{ kind: "note", id: note.id }} documentUrl={documentUrl} />
  );
}
