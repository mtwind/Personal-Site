interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

/** Shared wrapper: anchor target + consistent heading for each page section. */
export function Section({ id, title, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-20 py-12 first:pt-8">
      <h2 className="mb-6 text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Placeholder shown when a section has no content yet. */
export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
      {message}
    </p>
  );
}
