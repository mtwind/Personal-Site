"use client";

import { markdownToPlainText } from "@/lib/match-markdown";
import { SKILLS_SECTION_SLUG, type MatchSection } from "@/lib/match-tabs";
import { EntryGroup, PreviewCard, SkillChip } from "./entry-views";
import { MatchRichText } from "./match-rich-text";
import { CARD, FOUR_COLOR_GRADIENT, useMatch } from "./match-shell";

/** How many skills the strongest-skills page ranks. */
const RANKED_LIMIT = 12;

/**
 * One authored section, as its own page. Prose is the whole of it, save
 * for the strongest-skills page, which also shows the ranking derived
 * from what the profile is tagged with — a hand-kept list of favourite
 * languages goes stale, a count of the work using them doesn't.
 */
export function SectionView({ section }: { section: MatchSection }) {
  return (
    <article>
      <h1 className="text-[32px] leading-tight font-normal text-[#202124]">
        {section.title || "Untitled"}
      </h1>
      <div
        className="mt-3 h-1 w-28 rounded-full"
        style={{ background: FOUR_COLOR_GRADIENT }}
        aria-hidden
      />

      {section.body ? (
        <section className={`${CARD} mt-8`}>
          <p className="text-[16px] leading-7 whitespace-pre-line">
            <MatchRichText text={section.body} />
          </p>
        </section>
      ) : null}

      {section.slug === SKILLS_SECTION_SLUG ? (
        <div className="mt-4">
          <RankedSkills />
        </div>
      ) : null}
    </article>
  );
}

/**
 * Skills ordered by how much of the profile is tagged with them, with
 * the work behind the top few shown outright — the claim and its
 * evidence in the same place.
 */
function RankedSkills() {
  const { resolver } = useMatch();
  const ranked = resolver.rankedSkills().slice(0, RANKED_LIMIT);
  if (ranked.length === 0) return null;

  const [leader, ...rest] = ranked;
  const { experiences, projects, notes } = leader.usage;

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
          {notes.map((note) => (
            <li key={note.id}>
              <PreviewCard
                target={{ kind: "note", id: note.id }}
                title={note.title}
                headline={markdownToPlainText(note.body).slice(0, 180)}
                note={note.hasDocument ? "Document" : null}
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
