import type { ProjectWithRelations } from "@/lib/profile-data";
import { formatDateRange } from "@/lib/format";
import { MediaList } from "./media-list";
import { EmptyState, Section } from "./section";
import { SkillBadgeList } from "./skill-badge";

export function ProjectCard({ project }: { project: ProjectWithRelations }) {
  const dateRange = formatDateRange(project.startDate, project.endDate);

  return (
    <article className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
          {project.name}
        </h3>
        {dateRange ? (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {dateRange}
          </span>
        ) : null}
      </div>
      {project.repoUrl ? (
        <a
          href={project.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block break-all text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          {project.repoUrl.replace(/^https?:\/\//, "")}
        </a>
      ) : null}
      {project.bullets.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {project.bullets.map((bullet, i) => (
            <li key={i}>{bullet}</li>
          ))}
        </ul>
      )}
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
        <div className="grid gap-4 sm:grid-cols-2">
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
