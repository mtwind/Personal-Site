import type { Metadata } from "next";

import { EntryPage, entryMetadata } from "../../entry-page";

export async function generateMetadata(
  props: PageProps<"/match/[slug]/course/[entry]">,
): Promise<Metadata> {
  const { slug, entry } = await props.params;
  return entryMetadata(slug, "course", entry);
}

export default async function MatchCoursePage(
  props: PageProps<"/match/[slug]/course/[entry]">,
) {
  const { slug, entry } = await props.params;
  return <EntryPage pageSlug={slug} kind="course" entrySlug={entry} />;
}
