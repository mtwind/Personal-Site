interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

/** Shared wrapper: anchor target + centered small-caps gold heading. */
export function Section({ id, title, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-24 py-10">
      <h2 className="mb-7 text-center font-sans text-[11.5px] font-bold tracking-[0.3em] text-(--accent) uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Placeholder shown when a section has no content yet. */
export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-dashed border-(--line) px-4 py-6 text-center font-sans text-sm text-(--dim) italic">
      {message}
    </p>
  );
}
