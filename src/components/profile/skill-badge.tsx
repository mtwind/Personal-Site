import { skillIconUrl, type Skill } from "@/lib/skill-icon";

/**
 * Small pill showing a skill's icon + name, in the editorial palette.
 * Icons are tiny remote SVGs rendered with a plain <img>.
 */
export function SkillBadge({ skill }: { skill: Skill }) {
  const iconUrl = skillIconUrl(skill);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-(--line) bg-(--hover-bg) px-2.5 py-1 font-sans text-[11px] font-medium tracking-wide text-(--text)">
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
