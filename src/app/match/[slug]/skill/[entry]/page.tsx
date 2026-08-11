import type { Metadata } from "next";

import { EntryPage, entryMetadata } from "../../entry-page";

export async function generateMetadata(
  props: PageProps<"/match/[slug]/skill/[entry]">,
): Promise<Metadata> {
  const { slug, entry } = await props.params;
  return entryMetadata(slug, "skill", entry);
}

export default async function MatchSkillPage(
  props: PageProps<"/match/[slug]/skill/[entry]">,
) {
  const { slug, entry } = await props.params;
  return <EntryPage pageSlug={slug} kind="skill" entrySlug={entry} />;
}
