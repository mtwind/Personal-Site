import Image from "next/image";

import type { About } from "@/lib/profile-data";
import { EmptyState, Section } from "./section";

export function AboutSection({ about }: { about: About | null }) {
  return (
    <Section id="about" title="About">
      {about ? (
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {about.photoUrl ? (
            <Image
              src={about.photoUrl}
              alt={about.name}
              width={112}
              height={112}
              className="h-28 w-28 shrink-0 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
            />
          ) : null}
          <div className="space-y-2">
            {about.headline ? (
              <p className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
                {about.headline}
              </p>
            ) : null}
            {about.body ? (
              <div className="whitespace-pre-line leading-7 text-zinc-600 dark:text-zinc-400">
                {about.body}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <EmptyState message="No about content yet — sign in and add some." />
      )}
    </Section>
  );
}
