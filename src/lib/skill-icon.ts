import type { skills } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type Skill = InferSelectModel<typeof skills>;

/**
 * Resolve the display URL for a skill icon based on its source.
 *
 * - devicon: full-color SVGs from the Devicon CDN
 * - simple-icons: monochrome SVGs from the Simple Icons CDN, tinted with
 *   the brand color when available
 * - custom: user-uploaded file in Supabase Storage
 *
 * Returns null when the skill has no resolvable icon (render name-only).
 */
export function skillIconUrl(skill: Skill): string | null {
  switch (skill.iconSource) {
    case "devicon": {
      if (!skill.iconSlug) return null;
      const variant = skill.iconVariant ?? "original";
      return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${skill.iconSlug}/${skill.iconSlug}-${variant}.svg`;
    }
    case "simple-icons": {
      if (!skill.iconSlug) return null;
      const tint = skill.color ? `/${skill.color.replace("#", "")}` : "";
      return `https://cdn.simpleicons.org/${skill.iconSlug}${tint}`;
    }
    case "custom":
      return skill.iconUrl;
    default:
      return null;
  }
}
