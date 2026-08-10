"use client";

import { useEffect, useRef } from "react";

import type {
  ReferenceExperience,
  ReferenceMedia,
  ReferenceProject,
  ReferenceResolver,
  ReferenceSkill,
  ReferenceTarget,
} from "@/lib/match-references";

const TITLE_ID = "match-pane-title";

/** Elements a Tab press may land on inside the pane. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

interface ReferencePaneProps {
  /** Navigation history; the last entry is what's shown. */
  stack: ReferenceTarget[];
  resolver: ReferenceResolver;
  onNavigate: (target: ReferenceTarget) => void;
  onBack: () => void;
  onClose: () => void;
}

/**
 * Detail pane for an inline project/skill reference — a right-hand panel
 * on desktop, a bottom sheet covering three quarters of the viewport on
 * mobile. Drilling into a related project or a skill pushes onto the
 * stack, so the back button retraces the reader's path.
 */
export function ReferencePane({
  stack,
  resolver,
  onNavigate,
  onBack,
  onClose,
}: ReferencePaneProps) {
  const paneRef = useRef<HTMLDivElement>(null);
  const current = stack[stack.length - 1];

  // Close on Escape, and keep Tab inside the pane while it's open.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !paneRef.current) return;

      const focusable = [
        ...paneRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ].filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === paneRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Focus the pane on open; hand focus back to the trigger on close.
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    paneRef.current?.focus();
    return () => trigger?.focus?.();
  }, []);

  // Lock background scrolling for as long as the pane is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!current) return null;

  const project =
    current.kind === "project" ? resolver.project(current.id) : null;
  const skill = current.kind === "skill" ? resolver.skill(current.id) : null;
  const title = project?.name ?? skill?.name ?? "Details";

  return (
    <>
      {/* A light Google-blue wash, so the page behind reads as set back. */}
      <div
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-40 bg-[#1a73e8]/10 backdrop-blur-[1.5px] [animation:pane-fade_.2s_ease-out]"
      />
      <div
        ref={paneRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        tabIndex={-1}
        className="match-pane fixed inset-x-0 bottom-0 z-50 flex h-[75vh] flex-col rounded-t-2xl bg-white shadow-2xl outline-none md:inset-x-auto md:top-0 md:right-0 md:bottom-0 md:h-full md:w-[27rem] md:max-w-[92vw] md:rounded-none md:border-l md:border-[#dadce0]"
      >
        {/* Bottom-sheet grab handle — the sheet's collapse affordance. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Collapse panel"
          title="Collapse"
          className="group flex w-full shrink-0 cursor-pointer justify-center pt-3 pb-2 md:hidden"
        >
          <span className="h-1.5 w-11 rounded-full bg-[#bdc1c6] transition-colors group-hover:bg-[#80868b] group-active:bg-[#5f6368]" />
        </button>

        {/* Desktop equivalent: a pull-tab on the panel's leading edge. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Collapse panel"
          title="Collapse"
          className="group absolute top-0 left-0 hidden h-full w-5 cursor-pointer items-center justify-center md:flex"
        >
          <span className="flex h-14 w-[18px] items-center justify-center rounded-r-md border border-l-0 border-[#dadce0] bg-[#f1f3f4] transition-colors group-hover:border-[#1a73e8] group-hover:bg-[#e8f0fe] group-active:bg-[#d2e3fc]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5 text-[#5f6368] transition-colors group-hover:text-[#1a73e8]"
              aria-hidden
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </span>
        </button>

        <header className="flex items-center gap-2 border-b border-[#dadce0] px-4 py-3 md:pl-8">
          {stack.length > 1 ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="-ml-1 rounded-full p-1.5 text-[#5f6368] transition-colors hover:bg-[#f1f3f4] hover:text-[#202124]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          ) : null}

          <div className="min-w-0 flex-1">
            <p className="text-[11px] tracking-[0.14em] text-[#5f6368] uppercase">
              {current.kind === "project" ? "Project" : "Skill"}
            </p>
            <h2
              id={TITLE_ID}
              className="truncate text-[17px] font-medium text-[#202124]"
            >
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-full p-1.5 text-[#5f6368] transition-colors hover:bg-[#f1f3f4] hover:text-[#202124]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:pl-8">
          {project ? (
            <ProjectView
              project={project}
              resolver={resolver}
              onNavigate={onNavigate}
            />
          ) : skill ? (
            <SkillView
              skill={skill}
              resolver={resolver}
              onNavigate={onNavigate}
            />
          ) : (
            <p className="text-sm text-[#5f6368]">
              That entry is no longer available.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function ProjectView({
  project,
  resolver,
  onNavigate,
}: {
  project: ReferenceProject;
  resolver: ReferenceResolver;
  onNavigate: (target: ReferenceTarget) => void;
}) {
  const similar = resolver.similarProjects(project.id);
  const skills = project.skillIds
    .map((id) => resolver.skill(id))
    .filter((skill): skill is ReferenceSkill => skill !== null);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        {project.courseLabel ? (
          <p className="text-[13px] text-[#5f6368]">{project.courseLabel}</p>
        ) : null}
        {project.dateRange ? (
          <p className="text-[11px] tracking-[0.14em] text-[#5f6368] uppercase">
            {project.dateRange}
          </p>
        ) : null}
      </div>

      {project.bullets.length > 0 ? (
        <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-6 text-[#3c4043]">
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
          className="inline-flex items-center gap-1.5 rounded-full border border-[#dadce0] px-4 py-1.5 text-[13px] font-medium text-[#1a73e8] transition-colors hover:bg-[#f1f6fe]"
        >
          View source
          <span aria-hidden>↗</span>
        </a>
      ) : null}

      {skills.length > 0 ? (
        <PaneGroup title="Built with">
          <SkillChips skills={skills} onNavigate={onNavigate} />
        </PaneGroup>
      ) : null}

      <PaneMedia items={project.media} />

      {similar.length > 0 ? (
        <PaneGroup title="Similar projects">
          <ul className="space-y-2">
            {similar.map(({ project: related, sharedSkills }) => (
              <li key={related.id}>
                <button
                  type="button"
                  onClick={() => onNavigate({ kind: "project", id: related.id })}
                  className="w-full rounded-xl border border-[#dadce0] px-3.5 py-3 text-left transition-colors hover:border-[#1a73e8] hover:bg-[#f8fbff]"
                >
                  <span className="block text-[14px] font-medium text-[#202124]">
                    {related.name}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[#5f6368]">
                    Shares {sharedSkills.map((s) => s.name).join(", ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </PaneGroup>
      ) : null}
    </div>
  );
}

function SkillView({
  skill,
  resolver,
  onNavigate,
}: {
  skill: ReferenceSkill;
  resolver: ReferenceResolver;
  onNavigate: (target: ReferenceTarget) => void;
}) {
  const { experiences, projects } = resolver.workUsingSkill(skill.id);
  const total = experiences.length + projects.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        {skill.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={skill.iconUrl} alt="" aria-hidden className="h-6 w-6" />
        ) : null}
        <p className="text-[13px] text-[#5f6368]">
          {total === 0
            ? "Not tagged on any work yet."
            : `Used across ${total} ${total === 1 ? "entry" : "entries"}.`}
        </p>
      </div>

      {experiences.length > 0 ? (
        <PaneGroup title="Experience">
          <ul className="space-y-3">
            {experiences.map((experience) => (
              <li
                key={experience.id}
                className="rounded-xl border border-[#dadce0] px-3.5 py-3"
              >
                <ExperienceSummary experience={experience} />
              </li>
            ))}
          </ul>
        </PaneGroup>
      ) : null}

      {projects.length > 0 ? (
        <PaneGroup title="Projects">
          <ul className="space-y-2">
            {projects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => onNavigate({ kind: "project", id: project.id })}
                  className="w-full rounded-xl border border-[#dadce0] px-3.5 py-3 text-left transition-colors hover:border-[#1a73e8] hover:bg-[#f8fbff]"
                >
                  <span className="block text-[14px] font-medium text-[#202124]">
                    {project.name}
                  </span>
                  {project.courseLabel || project.dateRange ? (
                    <span className="mt-0.5 block text-[12px] text-[#5f6368]">
                      {project.courseLabel ?? project.dateRange}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </PaneGroup>
      ) : null}
    </div>
  );
}

function ExperienceSummary({
  experience,
}: {
  experience: ReferenceExperience;
}) {
  return (
    <>
      <p className="text-[14px] font-medium text-[#202124]">
        {experience.title}
      </p>
      <p className="text-[12px] text-[#5f6368]">
        {experience.companyName}
        {experience.dateRange ? ` · ${experience.dateRange}` : ""}
      </p>
      {experience.bullets.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] leading-5 text-[#3c4043]">
          {experience.bullets.slice(0, 3).map((bullet, index) => (
            <li key={index}>{bullet}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function SkillChips({
  skills,
  onNavigate,
}: {
  skills: ReferenceSkill[];
  onNavigate: (target: ReferenceTarget) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <button
          key={skill.id}
          type="button"
          onClick={() => onNavigate({ kind: "skill", id: skill.id })}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#dadce0] px-2.5 py-1 text-[12px] font-medium text-[#3c4043] transition-colors hover:border-[#1a73e8] hover:bg-[#f1f6fe] hover:text-[#1a73e8]"
        >
          {skill.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={skill.iconUrl} alt="" aria-hidden className="h-3.5 w-3.5" />
          ) : null}
          {skill.name}
        </button>
      ))}
    </div>
  );
}

function PaneMedia({ items }: { items: ReferenceMedia[] }) {
  if (items.length === 0) return null;

  const images = items.filter((item) => item.kind === "image");
  const links = items.filter((item) => item.kind !== "image");

  return (
    <div className="space-y-3">
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((item) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.id}
              src={item.url}
              alt={item.caption ?? ""}
              loading="lazy"
              className="h-24 rounded-lg border border-[#dadce0] object-cover"
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

function PaneGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-medium tracking-[0.14em] text-[#5f6368] uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}
