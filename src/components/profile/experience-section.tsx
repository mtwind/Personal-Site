import type { ExperienceWithRelations } from "@/lib/profile-data";
import { formatDateRange } from "@/lib/format";
import { MediaList } from "./media-list";
import { EmptyState, Section } from "./section";
import { SkillBadgeList } from "./skill-badge";

/** Company name + logo; links to the company site when a domain is set. */
function CompanyLine({ exp }: { exp: ExperienceWithRelations }) {
  const content = (
    <>
      {exp.companyLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={exp.companyLogoUrl}
          alt=""
          aria-hidden
          className="h-4 w-4 rounded-sm object-contain"
        />
      ) : null}
      {exp.companyName}
    </>
  );
  const lineClass =
    "mt-0.5 mb-2 flex items-center gap-2 font-sans text-[11px] font-semibold tracking-[0.18em] text-(--accent) uppercase";

  if (!exp.companyDomain) {
    return <div className={lineClass}>{content}</div>;
  }
  return (
    <a
      href={`https://${exp.companyDomain}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`${lineClass} w-fit underline-offset-3 hover:underline`}
    >
      {content}
    </a>
  );
}

export function ExperienceCard({ exp }: { exp: ExperienceWithRelations }) {
  const dateRange = formatDateRange(exp.startDate, exp.endDate);

  return (
    <article className="-mx-4 grid gap-x-5 gap-y-1 rounded-md border-l-2 border-l-transparent px-4 py-3 transition-[background-color,border-color,transform] duration-300 hover:translate-x-1.5 hover:border-l-(--accent) hover:bg-(--hover-bg) sm:grid-cols-[150px_1fr]">
      <div className="pt-1 font-sans text-[11.5px] text-(--dim)">
        {dateRange}
      </div>
      <div className="min-w-0">
        <h3 className="text-[19px] font-normal text-(--title) italic">
          {exp.title}
        </h3>
        <CompanyLine exp={exp} />
        {exp.bullets.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-[14.5px] leading-6">
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
    <Section id="experience" title="Experience">
      {experiences.length > 0 ? (
        <div className="space-y-3">
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
