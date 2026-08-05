import { skillIconUrl, type Skill } from "@/lib/skill-icon";

/**
 * Small pill showing a skill's icon + name.
 *
 * Icons are tiny remote SVGs rendered with a plain <img> — next/image
 * adds no value for SVGs (no raster optimization) and would require
 * dangerouslyAllowSVG.
 */
export function SkillBadge({ skill }: { skill: Skill }) {
  const iconUrl = skillIconUrl(skill);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl} alt="" aria-hidden className="h-3.5 w-3.5" />
      ) : null}
      {skill.name}
    </span>
  );
}

export function SkillBadgeList({ skills }: { skills: Skill[] }) {
  if (skills.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <SkillBadge key={skill.id} skill={skill} />
      ))}
    </div>
  );
}
