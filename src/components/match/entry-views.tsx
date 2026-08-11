"use client";

import Link from "next/link";

import {
  KIND_LABEL,
  type ReferenceCourse,
  type ReferenceExperience,
  type ReferenceMedia,
  type ReferenceProject,
  type ReferenceSkill,
  type ReferenceTarget,
} from "@/lib/match-references";
import { targetHref } from "@/lib/match-tabs";
import { CARD, FOUR_COLOR_GRADIENT, useMatch } from "./match-shell";

/**
 * One entry, as its own page.
 *
 * Everything that used to live in a side pane is a document here: the
 * body is a card, and each thing it relates to — the course a project
 * came from, the skills it used, the work a skill appears in — is a link
 * to that entry's own page.
 */
export function EntryView({ target }: { target: ReferenceTarget }) {
  const { resolver } = useMatch();

  const project = target.kind === "project" ? resolver.project(target.id) : null;
  const skill = target.kind === "skill" ? resolver.skill(target.id) : null;
  const course = target.kind === "course" ? resolver.course(target.id) : null;
  const experience =
    target.kind === "experience" ? resolver.experience(target.id) : null;

  const title =
    project?.name ??
    skill?.name ??
    experience?.title ??
    (course ? `${course.courseNumber} · ${course.name}` : "Details");

  return (
    <article>
      <p className="text-[11px] tracking-[0.14em] text-[#5f6368] uppercase">
        {KIND_LABEL[target.kind]}
      </p>
      <h1 className="mt-1 text-[32px] leading-tight font-normal text-[#202124]">
        {title}
      </h1>
      <div
        className="mt-3 h-1 w-28 rounded-full"
        style={{ background: FOUR_COLOR_GRADIENT }}
        aria-hidden
      />

      <div className="mt-8 space-y-4">
        {project ? (
          <ProjectView project={project} />
        ) : experience ? (
          <ExperienceView experience={experience} />
        ) : course ? (
          <CourseView course={course} />
        ) : skill ? (
          <SkillView skill={skill} />
        ) : (
          <p className="text-sm text-[#5f6368]">
            That entry is no longer available.
          </p>
        )}
      </div>
    </article>
  );
}

function ProjectView({ project }: { project: ReferenceProject }) {
  const { resolver } = useMatch();
  const similar = resolver.similarProjects(project.id);
  const course = project.courseId ? resolver.course(project.courseId) : null;

  return (
    <>
      <section className={CARD}>
        <div className="space-y-1">
          {course ? (
            <p className="text-[13px]">
              <EntryLink target={{ kind: "course", id: course.id }}>
                {course.courseNumber} · {course.name}
              </EntryLink>
            </p>
          ) : project.courseLabel ? (
            <p className="text-[13px] text-[#5f6368]">{project.courseLabel}</p>
          ) : null}
          {project.dateRange ? (
            <p className="text-[11px] tracking-[0.14em] text-[#5f6368] uppercase">
              {project.dateRange}
            </p>
          ) : null}
        </div>

        {project.headline ? (
          <p className="mt-4 text-[15px] leading-7 text-[#3c4043]">
            {project.headline}
          </p>
        ) : null}

        {project.bullets.length > 0 ? (
          <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-[#3c4043]">
            {project.bullets.map((bullet, index) => (
              <li key={index}>{bullet}</li>
            ))}
          </ul>
        ) : null}

        {project.repoUrl ? (
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-[#dadce0] px-4 py-1.5 text-[13px] font-medium text-[#1a73e8] transition-colors hover:bg-[#f1f6fe]"
          >
            View source
            <span aria-hidden>↗</span>
          </a>
        ) : null}

        <EntryMedia items={project.media} />
      </section>

      <TechStack skillIds={project.skillIds} />

      {similar.length > 0 ? (
        <EntryGroup title="Similar projects">
          <ul className="space-y-2">
            {similar.map(({ project: related, sharedSkills }) => (
              <li key={related.id}>
                <PreviewCard
                  target={{ kind: "project", id: related.id }}
                  title={related.name}
                  headline={related.headline}
                  note={`Shares ${sharedSkills.map((s) => s.name).join(", ")}`}
                />
              </li>
            ))}
          </ul>
        </EntryGroup>
      ) : null}
    </>
  );
}

function ExperienceView({ experience }: { experience: ReferenceExperience }) {
  return (
    <>
      <section className={CARD}>
        <div className="space-y-1">
          <p className="text-[15px] font-medium text-[#202124]">
            {experience.companyName}
          </p>
          {experience.dateRange ? (
            <p className="text-[11px] tracking-[0.14em] text-[#5f6368] uppercase">
              {experience.dateRange}
            </p>
          ) : null}
        </div>

        {experience.headline ? (
          <p className="mt-4 text-[15px] leading-7 text-[#3c4043]">
            {experience.headline}
          </p>
        ) : null}

        {experience.bullets.length > 0 ? (
          <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-[#3c4043]">
            {experience.bullets.map((bullet, index) => (
              <li key={index}>{bullet}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <TechStack skillIds={experience.skillIds} />
    </>
  );
}

function CourseView({ course }: { course: ReferenceCourse }) {
  const { resolver } = useMatch();
  const projects = resolver.courseProjects(course.id);

  return (
    <>
      <section className={CARD}>
        {course.semester ? (
          <p className="text-[11px] tracking-[0.14em] text-[#5f6368] uppercase">
            {course.semester}
          </p>
        ) : null}
        <p className="mt-2 text-[15px] leading-7 text-[#3c4043]">
          {course.headline || `Coursework in ${course.name}.`}
        </p>
      </section>

      {projects.length > 0 ? (
        <EntryGroup title="Projects from this course">
          <ul className="space-y-2">
            {projects.map((project) => (
              <li key={project.id}>
                <PreviewCard
                  target={{ kind: "project", id: project.id }}
                  title={project.name}
                  headline={project.headline}
                  note={project.dateRange}
                />
              </li>
            ))}
          </ul>
        </EntryGroup>
      ) : null}
    </>
  );
}

function SkillView({ skill }: { skill: ReferenceSkill }) {
  const { resolver } = useMatch();
  const { experiences, projects } = resolver.workUsingSkill(skill.id);
  const total = experiences.length + projects.length;

  return (
    <>
      <section className={CARD}>
        <div className="flex items-center gap-2.5">
          {skill.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={skill.iconUrl} alt="" aria-hidden className="h-7 w-7" />
          ) : null}
          <p className="text-[15px] text-[#3c4043]">
            {total === 0
              ? "Not tagged on any work yet."
              : `Used across ${total} ${total === 1 ? "entry" : "entries"}.`}
          </p>
        </div>
      </section>

      {experiences.length > 0 ? (
        <EntryGroup title="Experience">
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
          </ul>
        </EntryGroup>
      ) : null}

      {projects.length > 0 ? (
        <EntryGroup title="Projects">
          <ul className="space-y-2">
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
          </ul>
        </EntryGroup>
      ) : null}
    </>
  );
}

/** A plain link to another entry's page. */
export function EntryLink({
  target,
  className,
  children,
}: {
  target: ReferenceTarget;
  className?: string;
  children: React.ReactNode;
}) {
  const { base, resolver } = useMatch();
  const href = targetHref(base, resolver, target);
  if (!href) return <>{children}</>;

  return (
    <Link
      href={href}
      className={
        className ??
        "font-medium text-[#1a73e8] underline-offset-2 hover:underline"
      }
    >
      {children}
    </Link>
  );
}

/**
 * Collapsed view of a piece of work: its name, the one-line header that
 * describes it, and a short note. The whole card is the link — the full
 * detail, tech stack included, lives on the page it opens.
 */
export function PreviewCard({
  target,
  title,
  headline,
  note,
}: {
  target: ReferenceTarget;
  title: string;
  headline: string;
  note: string | null;
}) {
  const { base, resolver } = useMatch();
  const href = targetHref(base, resolver, target);
  if (!href) return null;

  return (
    <Link
      href={href}
      className="block w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-3 text-left transition-colors hover:border-[#1a73e8] hover:bg-[#f8fbff] focus-visible:border-[#1a73e8] focus-visible:outline-none"
    >
      <span className="block text-[14px] font-medium text-[#202124]">
        {title}
      </span>
      {note ? (
        <span className="mt-0.5 block text-[12px] text-[#5f6368]">{note}</span>
      ) : null}
      {headline ? (
        <span className="mt-1.5 block text-[13px] leading-5 text-[#3c4043]">
          {headline}
        </span>
      ) : null}
    </Link>
  );
}

/** The tech stack for a piece of work; each chip links to that skill. */
export function TechStack({ skillIds }: { skillIds: string[] }) {
  const { resolver } = useMatch();
  const skills = skillIds
    .map((id) => resolver.skill(id))
    .filter((skill): skill is ReferenceSkill => skill !== null);

  if (skills.length === 0) return null;

  return (
    <EntryGroup title="Tech stack">
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <SkillChip key={skill.id} skill={skill} />
        ))}
      </div>
    </EntryGroup>
  );
}

export function SkillChip({ skill }: { skill: ReferenceSkill }) {
  return (
    <EntryLink
      target={{ kind: "skill", id: skill.id }}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#dadce0] bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#3c4043] transition-colors hover:border-[#1a73e8] hover:bg-[#f1f6fe] hover:text-[#1a73e8]"
    >
      {skill.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={skill.iconUrl} alt="" aria-hidden className="h-3.5 w-3.5" />
      ) : null}
      {skill.name}
    </EntryLink>
  );
}

function EntryMedia({ items }: { items: ReferenceMedia[] }) {
  if (items.length === 0) return null;

  const images = items.filter((item) => item.kind === "image");
  const links = items.filter((item) => item.kind !== "image");

  return (
    <div className="mt-5 space-y-3">
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((item) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.id}
              src={item.url}
              alt={item.caption ?? ""}
              loading="lazy"
              className="h-28 rounded-lg border border-[#dadce0] object-cover"
            />
          ))}
        </div>
      ) : null}
      {links.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {links.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-[#dadce0] px-2.5 py-1 text-[12px] text-[#3c4043] transition-colors hover:border-[#1a73e8] hover:text-[#1a73e8]"
              >
                {item.caption ?? item.url}
                <span aria-hidden>↗</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** A titled block of related entries, styled as its own card. */
export function EntryGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={CARD}>
      <h2 className="mb-3 text-[11px] font-medium tracking-[0.14em] text-[#5f6368] uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
