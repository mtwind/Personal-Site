import type {
  CompanyWithRoles,
  ExperienceWithRelations,
} from "@/lib/profile-data";
import { formatDateRange } from "@/lib/format";
import { CompanyLogo } from "./company-logo";
import { MediaList } from "./media-list";
import { EmptyState, Section } from "./section";
import { SkillBadgeList } from "./skill-badge";

/** Company name + logo; links to the company site when a domain is set. */
export function CompanyLine({ company }: { company: CompanyWithRoles }) {
  const content = (
    <>
      {company.logoUrl ? (
        <CompanyLogo
          src={company.logoUrl}
          domain={company.domain}
          className="h-4 w-4 rounded-sm object-contain"
        />
      ) : null}
      {company.name}
    </>
  );
  const lineClass =
    "mb-2 flex items-center gap-2 font-sans text-[11px] font-semibold tracking-[0.18em] text-(--accent) uppercase sm:ml-[170px]";

  if (!company.domain) {
    return <div className={lineClass}>{content}</div>;
  }
  return (
    <a
      href={`https://${company.domain}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`${lineClass} w-fit underline-offset-3 hover:underline`}
    >
      {content}
    </a>
  );
}

/** One role: its dates in the margin, everything else beside them. */
export function RoleCard({ role }: { role: ExperienceWithRelations }) {
  const dateRange = formatDateRange(role.startDate, role.endDate);

  return (
    <div className="grid gap-x-5 gap-y-1 sm:grid-cols-[150px_1fr]">
      <div className="pt-1 font-sans text-[11.5px] text-(--dim)">
        {dateRange}
      </div>
      <div className="min-w-0">
        <h3 className="mb-2 text-[19px] font-normal text-(--title) italic">
          {role.title}
        </h3>
        {role.bullets.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-[14.5px] leading-6">
            {role.bullets.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
        )}
        <SkillBadgeList skills={role.skills} />
        <MediaList items={role.media} />
      </div>
    </div>
  );
}

/**
 * A company and every role held there, the way a résumé groups them:
 * the employer named once, the roles stacked beneath it newest first.
 */
export function CompanyCard({ company }: { company: CompanyWithRoles }) {
  return (
    <article className="-mx-4 rounded-md border-l-2 border-l-transparent px-4 py-3 transition-[background-color,border-color,transform] duration-300 hover:translate-x-1.5 hover:border-l-(--accent) hover:bg-(--hover-bg)">
      <CompanyLine company={company} />
      <div className="space-y-5">
        {company.roles.map((role) => (
          <RoleCard key={role.id} role={role} />
        ))}
      </div>
    </article>
  );
}

export function ExperienceSection({
  companies,
}: {
  companies: CompanyWithRoles[];
}) {
  // A company with no roles yet is still being filled in by the editor.
  const listed = companies.filter((company) => company.roles.length > 0);

  return (
    <Section id="experience" title="Experience">
      {listed.length > 0 ? (
        <div className="space-y-3">
          {listed.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      ) : (
        <EmptyState message="No work experience added yet." />
      )}
    </Section>
  );
}
