import type { Metadata } from "next";

import { EntryPage, entryMetadata } from "../../entry-page";

export async function generateMetadata(
  props: PageProps<"/match/[slug]/project/[entry]">,
): Promise<Metadata> {
  const { slug, entry } = await props.params;
  return entryMetadata(slug, "project", entry);
}

export default async function MatchProjectPage(
  props: PageProps<"/match/[slug]/project/[entry]">,
) {
  const { slug, entry } = await props.params;
  return <EntryPage pageSlug={slug} kind="project" entrySlug={entry} />;
}
