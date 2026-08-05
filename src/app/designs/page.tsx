import Link from "next/link";

const DESIGNS = [
  { id: "b2", name: "Neon Bento", family: "Bento", bg: "animated glow blobs" },
  { id: "b3", name: "Sketchbook Bento", family: "Bento", bg: "graph paper, tilted cards" },
  { id: "e2", name: "Warm Editorial", family: "Editorial", bg: "paper grain" },
  { id: "e3", name: "Editorial Noir", family: "Editorial", bg: "animated ghost monogram" },
  { id: "f1", name: "Aurora", family: "Midnight", bg: "animated aurora ribbons" },
  { id: "f2", name: "Starfield", family: "Midnight", bg: "twinkling stars" },
  { id: "f3", name: "Mono Midnight", family: "Midnight", bg: "shimmering rule" },
];

export default function DesignsIndex() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-950 px-6 py-16 text-zinc-100">
      <h1 className="text-2xl font-semibold">Design previews</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Seven full-page candidates for the site&apos;s new look. Click through —
        links and animations are live.
      </p>
      <ul className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
        {DESIGNS.map((design) => (
          <li key={design.id}>
            <Link
              href={`/designs/${design.id}`}
              className="block rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-500"
            >
              <span className="text-xs font-bold uppercase text-zinc-500">
                {design.id} · {design.family}
              </span>
              <span className="mt-1 block font-semibold">{design.name}</span>
              <span className="mt-1 block text-xs text-zinc-400">
                {design.bg}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/"
        className="mt-8 text-sm text-zinc-500 underline-offset-2 hover:underline"
      >
        ← Back to the live site
      </Link>
    </div>
  );
}
