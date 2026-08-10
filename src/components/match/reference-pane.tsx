"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

/** Desktop pane width, in px: default and the range a drag may reach. */
const DEFAULT_WIDTH = 432;
const MIN_WIDTH = 320;
const MAX_WIDTH = 900;
/** Keyboard resize step for the drag handle. */
const RESIZE_STEP = 24;

function clampWidth(width: number): number {
  const ceiling =
    typeof window === "undefined"
      ? MAX_WIDTH
      : Math.min(MAX_WIDTH, window.innerWidth - 80);
  return Math.max(MIN_WIDTH, Math.min(ceiling, width));
}

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
 * Detail pane for inline project/skill references — a resizable right-hand
 * panel on desktop, a bottom sheet covering three quarters of the viewport
 * on mobile.
 *
 * Navigation is browser-like: following a related project, an experience,
 * or a skill opens another tab rather than replacing what the reader was
 * looking at, so several entries stay open side by side.
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
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);
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

  // Keep the width legal when the viewport shrinks under it.
  useEffect(() => {
    function onResize() {
      setWidth((current) => clampWidth(current));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const startResize = useCallback((event: React.PointerEvent) => {
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    setResizing(true);

    const onMove = (move: PointerEvent) => {
      setWidth(clampWidth(window.innerWidth - move.clientX));
    };
    const onUp = () => {
      setResizing(false);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }, []);

  const onResizeKey = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setWidth((w) => clampWidth(w + RESIZE_STEP));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setWidth((w) => clampWidth(w - RESIZE_STEP));
    } else if (event.key === "Home") {
      event.preventDefault();
      setWidth(clampWidth(DEFAULT_WIDTH));
    }
  }, []);

  if (!current) return null;

  const project =
    current.kind === "project" ? resolver.project(current.id) : null;
  const skill = current.kind === "skill" ? resolver.skill(current.id) : null;
  const experience =
    current.kind === "experience" ? resolver.experience(current.id) : null;

  const title = project?.name ?? skill?.name ?? experience?.title ?? "Details";
  const eyebrow =
    current.kind === "project"
      ? "Project"
      : current.kind === "skill"
        ? "Skill"
        : "Experience";

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
        style={{ "--pane-w": `${width}px` } as React.CSSProperties}
        className={`match-pane fixed inset-x-0 bottom-0 z-50 flex h-[75vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none md:inset-x-auto md:top-0 md:right-0 md:bottom-0 md:h-full md:w-[var(--pane-w)] md:max-w-[92vw] md:rounded-none md:border-l md:border-[#dadce0] ${
          resizing ? "select-none" : ""
        }`}
      >
        {/* Desktop-only resize gutter; drag or arrow-key to set the width. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          aria-valuenow={width}
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          tabIndex={0}
          onPointerDown={startResize}
          onKeyDown={onResizeKey}
          onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
          title="Drag to resize"
          className={`absolute top-0 left-0 z-10 hidden h-full w-1.5 cursor-col-resize transition-colors focus-visible:bg-[#1a73e8] focus-visible:outline-none md:block ${
            resizing ? "bg-[#1a73e8]" : "bg-transparent hover:bg-[#1a73e8]/40"
          }`}
        />

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
            {eyebrow}
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
          ) : experience ? (
            <ExperienceView
              experience={experience}
              resolver={resolver}
              onOpen={onOpen}
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

/**
 * Chrome-like tab row: a grey shelf of tabs whose active member is white
 * and joined to the content below it. Tabs hold a fixed width rather than
 * shrinking to nothing, so a crowded strip scrolls instead.
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
  const stripRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ left: 0, scroll: 0, client: 0 });

  // Keep the front tab in view as the strip fills up.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeKey]);

  // Track scroll geometry so the strip can draw its own scrollbar.
  useEffect(() => {
    const element = stripRef.current;
    if (!element) return;

    const update = () =>
      setMetrics({
        left: element.scrollLeft,
        scroll: element.scrollWidth,
        client: element.clientWidth,
      });

    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [tabs.length]);

  const overflowing = metrics.scroll > metrics.client + 1;

  const onThumbDown = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const thumb = event.currentTarget as HTMLElement;
    thumb.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startLeft = stripRef.current?.scrollLeft ?? 0;
    // Track travel maps to content travel by the overflow ratio.
    const ratio = metrics.scroll / Math.max(metrics.client, 1);

    const onMove = (move: PointerEvent) => {
      if (!stripRef.current) return;
      stripRef.current.scrollLeft = startLeft + (move.clientX - startX) * ratio;
    };
    const onUp = () => {
      thumb.removeEventListener("pointermove", onMove);
      thumb.removeEventListener("pointerup", onUp);
      thumb.removeEventListener("pointercancel", onUp);
    };
    thumb.addEventListener("pointermove", onMove);
    thumb.addEventListener("pointerup", onUp);
    thumb.addEventListener("pointercancel", onUp);
  };

  /** Clicking the bare track pages toward the click. */
  const onTrackDown = (event: React.PointerEvent) => {
    const strip = stripRef.current;
    if (!strip) return;
    const track = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientX - track.left) / track.width;
    strip.scrollTo({
      left: fraction * metrics.scroll - metrics.client / 2,
      behavior: "smooth",
    });
  };

  const thumbWidth = overflowing
    ? Math.max(12, (metrics.client / metrics.scroll) * 100)
    : 100;
  const thumbLeft = overflowing ? (metrics.left / metrics.scroll) * 100 : 0;

  return (
    // No bottom border: the active tab is white and merges into the
    // content below it, the way a browser tab joins its page.
    <div className="shrink-0 bg-[#dee1e6] pt-2">
      <div className="flex items-end gap-1 pr-1 pl-1.5">
        <div
          ref={stripRef}
          role="tablist"
          aria-label="Open entries"
          className="match-tabstrip flex min-w-0 flex-1 items-end gap-1 overflow-x-auto"
        >
          {tabs.map((tab) => {
            const key = referenceKey(tab);
            const isActive = key === activeKey;
            const entry =
              tab.kind === "project"
                ? resolver.project(tab.id)
                : tab.kind === "skill"
                  ? resolver.skill(tab.id)
                  : resolver.experience(tab.id);
            const label =
              entry && "title" in entry
                ? entry.title
                : (entry?.name ?? "Missing");
            const iconUrl =
              tab.kind === "skill" ? resolver.skill(tab.id)?.iconUrl : null;

            return (
              <span
                key={key}
                className={`group flex w-40 shrink-0 items-center gap-1 rounded-t-lg pr-1 pl-2 transition-colors ${
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
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 py-1.5 text-left"
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

      {/* Only present once the tabs outgrow the strip. */}
      {overflowing ? (
        <div className="px-1.5 pt-1 pb-1">
          <div
            onPointerDown={onTrackDown}
            className="group h-1.5 w-full cursor-pointer rounded-full bg-black/10"
          >
            <div
              onPointerDown={onThumbDown}
              style={{
                width: `${thumbWidth}%`,
                marginLeft: `${thumbLeft}%`,
              }}
              className="h-full cursor-grab rounded-full bg-[#80868b] transition-colors hover:bg-[#5f6368] active:cursor-grabbing"
            />
          </div>
        </div>
      ) : null}
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
      ) : kind === "experience" ? (
        <>
          <rect x="3" y="7" width="18" height="13" rx="1.5" />
          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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

      {project.headline ? (
        <p className="text-[14px] leading-6 text-[#3c4043]">
          {project.headline}
        </p>
      ) : null}

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

      <TechStack
        skillIds={project.skillIds}
        resolver={resolver}
        onOpen={onOpen}
      />

      {similar.length > 0 ? (
        <PaneGroup title="Similar projects">
          <ul className="space-y-2">
            {similar.map(({ project: related, sharedSkills }) => (
              <li key={related.id}>
                <PreviewCard
                  title={related.name}
                  headline={related.headline}
                  note={`Shares ${sharedSkills.map((s) => s.name).join(", ")}`}
                  onOpen={() => onOpen({ kind: "project", id: related.id })}
                />
              </li>
            ))}
          </ul>
        </PaneGroup>
      ) : null}
    </div>
  );
}

function ExperienceView({
  experience,
  resolver,
  onOpen,
}: {
  experience: ReferenceExperience;
  resolver: ReferenceResolver;
  onOpen: (target: ReferenceTarget) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-[13px] text-[#5f6368]">{experience.companyName}</p>
        {experience.dateRange ? (
          <p className="text-[11px] tracking-[0.14em] text-[#5f6368] uppercase">
            {experience.dateRange}
          </p>
        ) : null}
      </div>

      {experience.headline ? (
        <p className="text-[14px] leading-6 text-[#3c4043]">
          {experience.headline}
        </p>
      ) : null}

      {experience.bullets.length > 0 ? (
        <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-6 text-[#3c4043]">
          {experience.bullets.map((bullet, index) => (
            <li key={index}>{bullet}</li>
          ))}
        </ul>
      ) : null}

      <TechStack
        skillIds={experience.skillIds}
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
                <PreviewCard
                  title={experience.title}
                  headline={experience.headline}
                  note={[experience.companyName, experience.dateRange]
                    .filter(Boolean)
                    .join(" · ")}
                  onOpen={() =>
                    onOpen({ kind: "experience", id: experience.id })
                  }
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
                <PreviewCard
                  title={project.name}
                  headline={project.headline}
                  note={project.courseLabel ?? project.dateRange}
                  onOpen={() => onOpen({ kind: "project", id: project.id })}
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
 * Collapsed view of a piece of work: its name, the one-line header that
 * describes it, and a short note. The whole card is the click target — the
 * full detail, tech stack included, lives in the tab it opens.
 */
function PreviewCard({
  title,
  headline,
  note,
  onOpen,
}: {
  title: string;
  headline: string;
  note: string | null;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full cursor-pointer rounded-xl border border-[#dadce0] px-3.5 py-3 text-left transition-colors hover:border-[#1a73e8] hover:bg-[#f8fbff] focus-visible:border-[#1a73e8] focus-visible:outline-none"
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
    </button>
  );
}

/**
 * The tech stack for a piece of work. Each chip opens that skill in its
 * own tab.
 */
function TechStack({
  skillIds,
  resolver,
  onOpen,
}: {
  skillIds: string[];
  resolver: ReferenceResolver;
  onOpen: (target: ReferenceTarget) => void;
}) {
  const skills = skillIds
    .map((id) => resolver.skill(id))
    .filter((skill): skill is ReferenceSkill => skill !== null);

  if (skills.length === 0) return null;

  return (
    <PaneGroup title="Tech stack">
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
    </PaneGroup>
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
