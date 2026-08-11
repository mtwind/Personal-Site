import type { Metadata } from "next";

import { EntryPage, entryMetadata } from "../../entry-page";

export async function generateMetadata(
  props: PageProps<"/match/[slug]/experience/[entry]">,
): Promise<Metadata> {
  const { slug, entry } = await props.params;
  return entryMetadata(slug, "experience", entry);
}

export default async function MatchExperiencePage(
  props: PageProps<"/match/[slug]/experience/[entry]">,
) {
  const { slug, entry } = await props.params;
  return <EntryPage pageSlug={slug} kind="experience" entrySlug={entry} />;
}
