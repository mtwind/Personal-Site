import type { ExperienceWithRelations } from "@/lib/profile-data";
import { formatDateRange } from "@/lib/format";
import { MediaList } from "./media-list";
import { EmptyState, Section } from "./section";
import { SkillBadgeList } from "./skill-badge";

function ExperienceCard({ exp }: { exp: ExperienceWithRelations }) {
  const dateRange = formatDateRange(exp.startDate, exp.endDate);

  return (
    <article className="flex gap-4">
      {exp.companyLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={exp.companyLogoUrl}
          alt=""
          aria-hidden
          className="mt-1 h-10 w-10 shrink-0 rounded-md border border-zinc-200 object-contain dark:border-zinc-700"
        />
      ) : (
        <div
          aria-hidden
          className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {exp.companyName.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
          {exp.title}
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {exp.companyName}
          {dateRange ? (
            <span className="text-zinc-400 dark:text-zinc-500">
              {" "}
              · {dateRange}
            </span>
          ) : null}
        </p>
        {exp.bullets.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {exp.bullets.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
        )}
        <SkillBadgeList skills={exp.skills} />
        <MediaList items={exp.media} />
      </div>
    </article>
  );
}

export function ExperienceSection({
  experiences,
}: {
  experiences: ExperienceWithRelations[];
}) {
  return (
    <Section id="experience" title="Work Experience">
      {experiences.length > 0 ? (
        <div className="space-y-10">
          {experiences.map((exp) => (
            <ExperienceCard key={exp.id} exp={exp} />
          ))}
        </div>
      ) : (
        <EmptyState message="No work experience added yet." />
      )}
    </Section>
  );
}
