import type { MediaItem } from "@/lib/profile-data";

/** Render image thumbnails and link cards attached to an entry. */
export function MediaList({ items }: { items: MediaItem[] }) {
  if (items.length === 0) return null;

  const images = items.filter((m) => m.kind === "image");
  const links = items.filter((m) => m.kind === "link" || m.kind === "video");

  return (
    <div className="mt-3 space-y-3">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((item) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.id}
              src={item.url}
              alt={item.caption ?? ""}
              loading="lazy"
              className="h-24 rounded-md border border-zinc-200 object-cover dark:border-zinc-700"
            />
          ))}
        </div>
      )}
      {links.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {links.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 underline-offset-2 hover:underline dark:border-zinc-700 dark:text-zinc-400"
              >
                {item.caption ?? item.url}
                <span aria-hidden>↗</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
