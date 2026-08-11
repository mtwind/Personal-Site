import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SectionView } from "@/components/match/section-view";
import { getMatchContext } from "@/lib/match-index";

/** One authored section of the page, at its own URL. */
async function findSection(pageSlug: string, sectionSlug: string) {
  const context = await getMatchContext();
  if (!context || context.page.slug !== pageSlug) return null;
  return (
    context.sections.find((section) => section.slug === sectionSlug) ?? null
  );
}

export async function generateMetadata(
  props: PageProps<"/match/[slug]/[section]">,
): Promise<Metadata> {
  const { slug, section } = await props.params;
  const found = await findSection(slug, section);
  return { title: found?.title || "Not found" };
}

export default async function MatchSectionPage(
  props: PageProps<"/match/[slug]/[section]">,
) {
  const { slug, section } = await props.params;
  const found = await findSection(slug, section);
  if (!found) notFound();

  return <SectionView section={found} />;
}
