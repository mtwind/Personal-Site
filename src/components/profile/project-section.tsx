import type { ProjectWithRelations } from "@/lib/profile-data";
import { formatDateRange } from "@/lib/format";
import { MediaList } from "./media-list";
import { EmptyState, Section } from "./section";
import { SkillBadgeList } from "./skill-badge";

export function ProjectCard({ project }: { project: ProjectWithRelations }) {
  const dateRange = formatDateRange(project.startDate, project.endDate);

  return (
    <article className="group -mx-2 rounded-md px-4 py-3 transition-[background-color,transform] duration-300 hover:-translate-y-1 hover:bg-(--hover-bg)">
      <h3 className="text-[19px] font-normal text-(--title) transition-colors duration-300 group-hover:text-(--accent)">
        {project.name}
      </h3>
      {dateRange ? (
        <div className="mt-0.5 font-sans text-[10.5px] tracking-[0.16em] text-(--dim) uppercase">
          {dateRange}
        </div>
      ) : null}
      {project.bullets.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-6">
          {project.bullets.map((bullet, i) => (
            <li key={i}>{bullet}</li>
          ))}
        </ul>
      )}
      {project.repoUrl ? (
        <a
          href={project.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block font-sans text-xs break-all text-(--accent) underline-offset-2 hover:underline"
        >
          {project.repoUrl.replace(/^https?:\/\//, "")} ↗
        </a>
      ) : null}
      <SkillBadgeList skills={project.skills} />
      <MediaList items={project.media} />
    </article>
  );
}

export function ProjectSection({
  projects,
}: {
  projects: ProjectWithRelations[];
}) {
  return (
    <Section id="projects" title="Projects">
      {projects.length > 0 ? (
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <EmptyState message="No projects added yet." />
      )}
    </Section>
  );
}
