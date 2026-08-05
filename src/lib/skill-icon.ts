import type { skills } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type Skill = InferSelectModel<typeof skills>;

/**
 * Resolve a display URL for a skill icon.
 *
 * - devicon: full-color SVGs from the Devicon CDN
 * - simple-icons: monochrome SVGs from the Simple Icons CDN, tinted with
 *   the brand color when available
 * - custom: user-uploaded file (customUrl)
 *
 * Returns null when unresolvable (render name-only).
 */
export function iconUrl(
  source: string,
  slug: string | null,
  color: string | null,
  variant: string | null,
  customUrl: string | null,
): string | null {
  switch (source) {
    case "devicon": {
      if (!slug) return null;
      const v = variant ?? "original";
      return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${slug}/${slug}-${v}.svg`;
    }
    case "simple-icons": {
      if (!slug) return null;
      const tint = color ? `/${color.replace("#", "")}` : "";
      return `https://cdn.simpleicons.org/${slug}${tint}`;
    }
    case "custom":
      return customUrl;
    default:
      return null;
  }
}

/** Icon URL for a skill row from the database. */
export function skillIconUrl(skill: Skill): string | null {
  return iconUrl(
    skill.iconSource,
    skill.iconSlug,
    skill.color,
    skill.iconVariant,
    skill.iconUrl,
  );
}
