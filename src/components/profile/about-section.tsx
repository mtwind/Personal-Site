import Image from "next/image";

import type { About } from "@/lib/profile-data";
import { EmptyState } from "./section";

/** Editorial masthead: portrait, oversized serif name, gold role line. */
export function AboutView({ about }: { about: About | null }) {
  if (!about) {
    return (
      <EmptyState message="No about content yet — sign in and add some." />
    );
  }

  return (
    <header className="border-b border-(--line) pb-10 text-center">
      {about.photoUrl ? (
        <Image
          src={about.photoUrl}
          alt={about.name}
          width={104}
          height={104}
          className="mx-auto mb-6 h-26 w-26 rounded-full border border-(--line) object-cover"
        />
      ) : null}
      <h1 className="text-[42px] leading-tight font-normal text-(--title) sm:text-[50px]">
        {about.name}
      </h1>
      {about.headline ? (
        <div className="mt-3 font-sans text-[11px] font-semibold tracking-[0.34em] text-(--accent) uppercase">
          {about.headline}
        </div>
      ) : null}
      {about.body ? (
        <p className="mx-auto mt-6 max-w-[60ch] text-[17px] leading-7 whitespace-pre-line">
          {about.body}
        </p>
      ) : null}
    </header>
  );
}

/** The About block doubles as the page masthead — no section label. */
export function AboutSection({ about }: { about: About | null }) {
  return (
    <section id="about" className="scroll-mt-24 pt-12 pb-4">
      <AboutView about={about} />
    </section>
  );
}
