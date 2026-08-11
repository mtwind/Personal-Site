"use client";

import { markdownToPlainText } from "@/lib/match-markdown";
import { EntryGroup, PreviewCard, SkillChip } from "./entry-views";
import { useMatch } from "./match-shell";

/** How many skills the ranking shows. */
const RANKED_LIMIT = 12;

/**
 * Skills ordered by how much of the profile is tagged with them, with
 * the work behind the top one shown outright — the claim and its
 * evidence in the same place.
 *
 * Any page can switch this on. It is derived rather than authored on
 * purpose: a hand-kept list of favourite languages is out of date the
 * moment a project is added, and a count of the work using them isn't.
 */
export function RankedSkills() {
  const { resolver } = useMatch();
  const ranked = resolver.rankedSkills().slice(0, RANKED_LIMIT);
  if (ranked.length === 0) return null;

  const [leader, ...rest] = ranked;
  const { experiences, projects, pages } = leader.usage;

  return (
    <div className="space-y-4">
      <EntryGroup title="Most used across my work">
        <div className="flex flex-wrap gap-1.5">
          {ranked.map(({ skill }) => (
            <SkillChip key={skill.id} skill={skill} />
          ))}
        </div>
      </EntryGroup>

      <EntryGroup title={`Where ${leader.skill.name} shows up`}>
        <ul className="space-y-2">
          {experiences.map((experience) => (
            <li key={experience.id}>
              <PreviewCard
                target={{ kind: "experience", id: experience.id }}
                title={experience.title}
                headline={experience.headline}
                note={[experience.companyName, experience.dateRange]
                  .filter(Boolean)
                  .join(" · ")}
              />
            </li>
          ))}
          {projects.map((project) => (
            <li key={project.id}>
              <PreviewCard
                target={{ kind: "project", id: project.id }}
                title={project.name}
                headline={project.headline}
                note={project.courseLabel ?? project.dateRange}
              />
            </li>
          ))}
          {pages.map((written) => (
            <li key={written.id}>
              <PreviewCard
                target={{ kind: "page", id: written.id }}
                title={written.title}
                headline={markdownToPlainText(written.body).slice(0, 180)}
                note={written.hasDocument ? "Document" : null}
              />
            </li>
          ))}
        </ul>
        {rest.length > 0 ? (
          <p className="mt-3 text-[13px] text-[#5f6368]">
            Open any skill above to see the same for it.
          </p>
        ) : null}
      </EntryGroup>
    </div>
  );
}
