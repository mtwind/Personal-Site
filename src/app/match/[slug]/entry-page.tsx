import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EntryView } from "@/components/match/entry-views";
import { getMatchContext } from "@/lib/match-index";
import type { ReferenceKind } from "@/lib/match-references";

/**
 * The shared body of the four entry routes.
 *
 * Each kind gets its own directory so the URL says what it is —
 * `/project/simple-c-compiler` rather than an opaque id — and they all
 * resolve the same way: look the slug up in the request's index, or 404.
 */
async function findEntry(
  pageSlug: string,
  kind: ReferenceKind,
  entrySlug: string,
) {
  const context = await getMatchContext();
  if (!context || context.page.slug !== pageSlug) return null;

  const target = context.resolver.fromSlug(kind, entrySlug);
  return target ? context.resolver.entry(target) : null;
}

/** Title for an entry route, used as the browser tab's own label. */
export async function entryMetadata(
  pageSlug: string,
  kind: ReferenceKind,
  entrySlug: string,
): Promise<Metadata> {
  const entry = await findEntry(pageSlug, kind, entrySlug);
  return { title: entry?.title ?? "Not found" };
}

export async function EntryPage({
  pageSlug,
  kind,
  entrySlug,
}: {
  pageSlug: string;
  kind: ReferenceKind;
  entrySlug: string;
}) {
  const entry = await findEntry(pageSlug, kind, entrySlug);
  if (!entry) notFound();

  return <EntryView target={{ kind: entry.kind, id: entry.id }} />;
}
