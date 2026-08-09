import type { ProjectWithRelations } from "@/lib/profile-data";
import { formatDateRange } from "@/lib/format";
import { ExternalLinkIcon, GitHubIcon } from "./icons";
import { MediaList } from "./media-list";
import { EmptyState, Section } from "./section";
import { SkillBadgeList } from "./skill-badge";

/** github.com and its subdomains get the GitHub mark; anything else the
 *  generic external-link glyph. Unparseable URLs fall back to generic. */
function isGitHubUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "github.com" || hostname.endsWith(".github.com");
  } catch {
    return false;
  }
}

export function ProjectCard({ project }: { project: ProjectWithRelations }) {
  const dateRange = formatDateRange(project.startDate, project.endDate);
  const repoUrl = project.repoUrl;

  return (
    <article className="group -mx-2 rounded-md px-4 py-3 transition-[background-color,transform] duration-300 hover:-translate-y-1 hover:bg-(--hover-bg)">
      <h3 className="text-[19px] font-normal text-(--title) transition-colors duration-300 group-hover:text-(--accent)">
        {project.name}
        {repoUrl ? (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${isGitHubUrl(repoUrl) ? "GitHub repository" : "Link"} for ${project.name}`}
            title={repoUrl.replace(/^https?:\/\//, "")}
            // ml-1 + p-1 keeps the visual gap of ml-2 while giving the
            // glyph a bigger tap target on touch screens.
            className="ml-1 inline-flex translate-y-[-1px] p-1 align-middle text-(--dim) transition-colors duration-200 hover:text-(--accent)"
          >
            {isGitHubUrl(repoUrl) ? (
              <GitHubIcon className="h-[17px] w-[17px]" />
            ) : (
              <ExternalLinkIcon className="h-[17px] w-[17px]" />
            )}
          </a>
        ) : null}
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
        <div className="space-y-4">
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
