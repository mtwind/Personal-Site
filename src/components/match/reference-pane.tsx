"use client";

import { useEffect, useRef } from "react";

import {
  referenceKey,
  type ReferenceExperience,
  type ReferenceMedia,
  type ReferenceProject,
  type ReferenceResolver,
  type ReferenceSkill,
  type ReferenceTarget,
} from "@/lib/match-references";

const TITLE_ID = "match-pane-title";

/** Elements a Tab press may land on inside the pane. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

interface ReferencePaneProps {
  /** Open tabs, left to right. Empty means the pane is closed. */
  tabs: ReferenceTarget[];
  /** Key of the tab currently in front. */
  activeKey: string;
  resolver: ReferenceResolver;
  /** Open a target, or focus it when a tab already holds it. */
  onOpen: (target: ReferenceTarget) => void;
  onSelectTab: (key: string) => void;
  onCloseTab: (key: string) => void;
  onClose: () => void;
}

/**
 * Detail pane for inline project/skill references — a right-hand panel on
 * desktop, a bottom sheet covering three quarters of the viewport on
 * mobile.
 *
 * Navigation is browser-like: following a related project or a skill
 * opens another tab in the strip rather than replacing what the reader was
 * looking at, so several entries stay open side by side and comparing them
 * is a click rather than a re-trace.
 */
export function ReferencePane({
  tabs,
  activeKey,
  resolver,
  onOpen,
  onSelectTab,
  onCloseTab,
  onClose,
}: ReferencePaneProps) {
  const paneRef = useRef<HTMLDivElement>(null);
  const current = tabs.find((tab) => referenceKey(tab) === activeKey);

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
        className="match-pane fixed inset-x-0 bottom-0 z-50 flex h-[75vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none md:inset-x-auto md:top-0 md:right-0 md:bottom-0 md:h-full md:w-[27rem] md:max-w-[92vw] md:rounded-none md:border-l md:border-[#dadce0]"
      >
        <TabStrip
          tabs={tabs}
          activeKey={activeKey}
          resolver={resolver}
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <p className="text-[11px] tracking-[0.14em] text-[#5f6368] uppercase">
            {current.kind === "project" ? "Project" : "Skill"}
          </p>
          <h2
            id={TITLE_ID}
            className="mt-0.5 mb-4 text-[21px] leading-tight font-normal text-[#202124]"
          >
            {title}
          </h2>

          {project ? (
            <ProjectView
              project={project}
              resolver={resolver}
              onOpen={onOpen}
            />
          ) : skill ? (
            <SkillView skill={skill} resolver={resolver} onOpen={onOpen} />
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

/**
 * Chrome-like tab row: a grey shelf of tabs whose active member is white
 * and joined to the content below it. The pane's close button sits at the
 * far right of the same row.
 */
function TabStrip({
  tabs,
  activeKey,
  resolver,
  onSelectTab,
  onCloseTab,
  onClose,
}: {
  tabs: ReferenceTarget[];
  activeKey: string;
  resolver: ReferenceResolver;
  onSelectTab: (key: string) => void;
  onCloseTab: (key: string) => void;
  onClose: () => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);

  // Keep the front tab in view as the strip fills up.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeKey]);

  return (
    // No bottom border: the active tab is white and merges into the
    // content below it, the way a browser tab joins its page.
    <div className="flex shrink-0 items-end gap-1 bg-[#dee1e6] pt-2 pr-1 pl-1.5">
      <div
        role="tablist"
        aria-label="Open entries"
        className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const key = referenceKey(tab);
          const isActive = key === activeKey;
          const entry =
            tab.kind === "project"
              ? resolver.project(tab.id)
              : resolver.skill(tab.id);
          const label = entry?.name ?? "Missing";
          const iconUrl =
            tab.kind === "skill" ? resolver.skill(tab.id)?.iconUrl : null;

          return (
            <span
              key={key}
              className={`group flex min-w-0 shrink items-center gap-1 rounded-t-lg pr-1 pl-2 transition-colors ${
                isActive
                  ? "bg-white"
                  : "bg-[#cfd3d8] hover:bg-[#dfe2e6] active:bg-[#e8eaed]"
              }`}
            >
              <button
                ref={isActive ? activeRef : undefined}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectTab(key)}
                title={label}
                className="flex min-w-0 cursor-pointer items-center gap-1.5 py-1.5 text-left"
              >
                {iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={iconUrl}
                    alt=""
                    aria-hidden
                    className="h-3.5 w-3.5 shrink-0"
                  />
                ) : (
                  <TabGlyph kind={tab.kind} />
                )}
                <span
                  className={`truncate text-[12px] ${
                    isActive
                      ? "font-medium text-[#202124]"
                      : "text-[#3c4043] group-hover:text-[#202124]"
                  }`}
                >
                  {label}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onCloseTab(key)}
                aria-label={`Close ${label}`}
                title="Close tab"
                className="shrink-0 cursor-pointer rounded-full p-0.5 text-[#5f6368] transition-colors hover:bg-black/10 hover:text-[#202124]"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="h-3 w-3"
                  aria-hidden
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </span>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        title="Close panel"
        className="mb-1 shrink-0 cursor-pointer rounded-full p-1.5 text-[#5f6368] transition-colors hover:bg-black/10 hover:text-[#202124]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/** Stand-in favicon for entries without an icon of their own. */
function TabGlyph({ kind }: { kind: ReferenceTarget["kind"] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#5f6368"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden
    >
      {kind === "project" ? (
        <>
          <path d="M4 7h6l2 2h8v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
          <path d="M4 7V6a1 1 0 0 1 1-1h4" />
        </>
      ) : (
        <path d="m8 6-5 6 5 6M16 6l5 6-5 6" />
      )}
    </svg>
  );
}

function ProjectView({
  project,
  resolver,
  onOpen,
}: {
  project: ReferenceProject;
  resolver: ReferenceResolver;
  onOpen: (target: ReferenceTarget) => void;
}) {
  const similar = resolver.similarProjects(project.id);

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

      <PaneMedia items={project.media} />

      {similar.length > 0 ? (
        <PaneGroup title="Similar projects">
          <ul className="space-y-2">
            {similar.map(({ project: related, sharedSkills }) => (
              <li key={related.id}>
                <WorkCard
                  title={related.name}
                  note={`Shares ${sharedSkills.map((s) => s.name).join(", ")}`}
                  skillIds={related.skillIds}
                  resolver={resolver}
                  onOpen={onOpen}
                  onOpenSelf={() => onOpen({ kind: "project", id: related.id })}
                />
              </li>
            ))}
          </ul>
        </PaneGroup>
      ) : null}

      <TechStack
        skillIds={project.skillIds}
        resolver={resolver}
        onOpen={onOpen}
      />
    </div>
  );
}

function SkillView({
  skill,
  resolver,
  onOpen,
}: {
  skill: ReferenceSkill;
  resolver: ReferenceResolver;
  onOpen: (target: ReferenceTarget) => void;
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
          <ul className="space-y-2">
            {experiences.map((experience) => (
              <li key={experience.id}>
                <ExperienceCard
                  experience={experience}
                  resolver={resolver}
                  onOpen={onOpen}
                />
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
                <WorkCard
                  title={project.name}
                  note={project.courseLabel ?? project.dateRange}
                  skillIds={project.skillIds}
                  resolver={resolver}
                  onOpen={onOpen}
                  onOpenSelf={() => onOpen({ kind: "project", id: project.id })}
                />
              </li>
            ))}
          </ul>
        </PaneGroup>
      ) : null}
    </div>
  );
}

/**
 * A project summary in a list. The title opens the project in its own tab;
 * the stack chips open their skill. Both live in the card as siblings —
 * nesting a button inside a button would be invalid.
 */
function WorkCard({
  title,
  note,
  skillIds,
  resolver,
  onOpen,
  onOpenSelf,
}: {
  title: string;
  note: string | null;
  skillIds: string[];
  resolver: ReferenceResolver;
  onOpen: (target: ReferenceTarget) => void;
  onOpenSelf: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#dadce0] px-3.5 py-3 transition-colors focus-within:border-[#1a73e8] hover:border-[#1a73e8] hover:bg-[#f8fbff]">
      <button
        type="button"
        onClick={onOpenSelf}
        className="cursor-pointer text-left text-[14px] font-medium text-[#202124] underline-offset-2 hover:underline"
      >
        {title}
      </button>
      {note ? (
        <p className="mt-0.5 text-[12px] text-[#5f6368]">{note}</p>
      ) : null}
      <TechStack
        skillIds={skillIds}
        resolver={resolver}
        onOpen={onOpen}
        compact
      />
    </div>
  );
}

/** An experience summary. No detail view of its own, so it shows in full. */
function ExperienceCard({
  experience,
  resolver,
  onOpen,
}: {
  experience: ReferenceExperience;
  resolver: ReferenceResolver;
  onOpen: (target: ReferenceTarget) => void;
}) {
  return (
    <div className="rounded-xl border border-[#dadce0] px-3.5 py-3">
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
      <TechStack
        skillIds={experience.skillIds}
        resolver={resolver}
        onOpen={onOpen}
        compact
      />
    </div>
  );
}

/**
 * The tech stack for a piece of work, at the bottom of every entry. Each
 * chip opens that skill in its own tab.
 */
function TechStack({
  skillIds,
  resolver,
  onOpen,
  compact = false,
}: {
  skillIds: string[];
  resolver: ReferenceResolver;
  onOpen: (target: ReferenceTarget) => void;
  compact?: boolean;
}) {
  const skills = skillIds
    .map((id) => resolver.skill(id))
    .filter((skill): skill is ReferenceSkill => skill !== null);

  if (skills.length === 0) return null;

  const chips = (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <button
          key={skill.id}
          type="button"
          onClick={() => onOpen({ kind: "skill", id: skill.id })}
          title={`Open ${skill.name}`}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#dadce0] bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#3c4043] transition-colors hover:border-[#1a73e8] hover:bg-[#f1f6fe] hover:text-[#1a73e8]"
        >
          {skill.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={skill.iconUrl}
              alt=""
              aria-hidden
              className="h-3.5 w-3.5"
            />
          ) : null}
          {skill.name}
        </button>
      ))}
    </div>
  );

  if (compact) return <div className="mt-2.5">{chips}</div>;
  return <PaneGroup title="Tech stack">{chips}</PaneGroup>;
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
