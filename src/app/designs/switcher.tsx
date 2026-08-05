import Link from "next/link";

const DESIGNS = ["b2", "b3", "e2", "e3", "f1", "f2", "f3"] as const;

/** Floating pill nav for hopping between design previews. */
export function DesignSwitcher({ current }: { current?: string }) {
  return (
    <nav
      aria-label="Design previews"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900/90 px-2 py-1.5 shadow-xl backdrop-blur"
    >
      <Link
        href="/designs"
        className="rounded-full px-2.5 py-1 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-white"
      >
        ☰
      </Link>
      {DESIGNS.map((id) => (
        <Link
          key={id}
          href={`/designs/${id}`}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${
            id === current
              ? "bg-white text-zinc-900"
              : "text-zinc-300 hover:bg-zinc-700 hover:text-white"
          }`}
        >
          {id}
        </Link>
      ))}
    </nav>
  );
}
