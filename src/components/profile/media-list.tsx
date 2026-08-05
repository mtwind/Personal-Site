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
              className="h-24 rounded-md border border-(--line) object-cover"
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
                className="inline-flex items-center gap-1 rounded-md border border-(--line) px-2.5 py-1 font-sans text-xs text-(--text) underline-offset-2 transition-colors duration-200 hover:border-(--accent) hover:text-(--accent)"
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
