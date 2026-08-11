/**
 * The entry index behind the team-matching page.
 *
 * Every project, experience, course and skill is a *page* of its own,
 * reachable at a real URL — `/match/<page>/project/simple-c-compiler` —
 * so a reader navigates the profile the way they navigate any site, with
 * working back/forward, shareable links and cmd-click.
 *
 * Page prose can name an entry with a token —
 * `[[project:Simple C Compiler]]`, `[[skill:C]]`, `[[course:CS 4120]]` —
 * which renders as a link to that page. Tokens resolve by *name* rather
 * than id so the page stays hand-editable in a textarea.
 *
 * Everything here is pure and serializable: the index is built on the
 * server from `ProfileData` and handed to the client shell as props.
 */
import { formatDateRange } from "@/lib/format";
import { markdownHeadings } from "@/lib/match-markdown";
import type { SitePage } from "@/lib/pages-data";
import type { ProfileData } from "@/lib/profile-data";
import { skillIconUrl, type Skill } from "@/lib/skill-icon";

/** How many related projects a project page suggests. */
const SIMILAR_LIMIT = 4;

export interface ReferenceSkill {
  id: string;
  /** URL segment for this skill's page. */
  slug: string;
  name: string;
  /** Resolved on the server so the client needs no icon logic. */
  iconUrl: string | null;
}

export interface ReferenceMedia {
  id: string;
  kind: string;
  url: string;
  caption: string | null;
}

export interface ReferenceProject {
  id: string;
  slug: string;
  name: string;
  /** One-line description shown on preview cards. */
  headline: string;
  /** Preformatted on the server — avoids Intl hydration mismatches. */
  dateRange: string | null;
  bullets: string[];
  repoUrl: string | null;
  skillIds: string[];
  media: ReferenceMedia[];
  /** e.g. "CS 4120 · Compilers" when the project came out of a course. */
  courseLabel: string | null;
  /** Set alongside `courseLabel`, so the label can link to its course. */
  courseId: string | null;
}

export interface ReferenceExperience {
  id: string;
  slug: string;
  companyName: string;
  title: string;
  /** One-line description shown on preview cards. */
  headline: string;
  dateRange: string | null;
  bullets: string[];
  skillIds: string[];
}

export interface ReferenceCourse {
  id: string;
  slug: string;
  name: string;
  /** e.g. "CS 4120". */
  courseNumber: string;
  headline: string;
  semester: string | null;
  /** Projects that came out of this course. */
  projectIds: string[];
}

/** A heading inside a page, and the anchor that scrolls to it. */
export interface PageHeading {
  /** `#id` on the rendered page; unique within that page. */
  id: string;
  text: string;
  level: number;
}

/**
 * A published page. Private ones never reach the index — they ground the
 * overview's answers but have no URL to link to, so putting them here
 * would be inviting a citation that 404s.
 */
export interface ReferencePage {
  id: string;
  slug: string;
  title: string;
  /** The prose itself; pages are short enough to render whole. */
  body: string;
  /**
   * The page's own headings, resolved once here rather than re-parsed
   * by every surface that wants to link into the middle of a page.
   */
  headings: PageHeading[];
  /** True when a document is attached, so the page can offer it. */
  hasDocument: boolean;
  /**
   * When set, the page also renders the ranking derived from what the
   * profile is tagged with — the claim and its evidence in one place.
   */
  showSkillRanking: boolean;
  skillIds: string[];
}

export interface MatchReferenceIndex {
  projects: ReferenceProject[];
  experiences: ReferenceExperience[];
  courses: ReferenceCourse[];
  skills: ReferenceSkill[];
  pages: ReferencePage[];
}

export type ReferenceKind =
  | "project"
  | "skill"
  | "experience"
  | "course"
  | "page";

/** URL segment each kind of entry lives under. */
export const KIND_SEGMENT: Record<ReferenceKind, string> = {
  project: "project",
  experience: "experience",
  course: "course",
  skill: "skill",
  page: "page",
};

/** Singular label for a kind, as shown above an entry's title. */
export const KIND_LABEL: Record<ReferenceKind, string> = {
  project: "Project",
  experience: "Experience",
  course: "Course",
  skill: "Skill",
  page: "Page",
};

/** An entry the reader can open. */
export interface ReferenceTarget {
  kind: ReferenceKind;
  id: string;
}

export type MatchSegment =
  | { type: "text"; text: string }
  | { type: "ref"; kind: ReferenceKind; id: string; label: string };

/**
 * Anchor ids for a page's headings.
 *
 * Slugged the same way entry names are, and de-duplicated per page, so
 * two sections both called "What I'm looking for" still get distinct
 * anchors instead of both scrolling to the first one.
 */
export function pageHeadings(body: string): PageHeading[] {
  const slug = uniqueSlugger();
  return markdownHeadings(body).map((heading) => ({
    id: slug(heading.text),
    text: heading.text,
    level: heading.level,
  }));
}

/** A related project plus the skills that made it related. */
export interface SimilarProject {
  project: ReferenceProject;
  sharedSkills: ReferenceSkill[];
}

/** Everything tagged with a given skill. */
export interface SkillUsage {
  experiences: ReferenceExperience[];
  projects: ReferenceProject[];
  /** Published pages only — a private one has no URL to link to. */
  pages: ReferencePage[];
}

/**
 * `[[kind:name]]` or `[[kind:name|display text]]`.
 *
 * The name stops at `|` or `]` so an unterminated token degrades to
 * plain text instead of swallowing the rest of the paragraph.
 *
 * `note:` is the old spelling of `page:`, kept because prose written
 * before the rename is stored as text and would otherwise quietly lose
 * its links.
 */
export const TOKEN_PATTERN =
  /\[\[(project|skill|course|experience|page|note):([^\]|]+)(?:\|([^\]]*))?\]\]/g;

/** The kind a token names, with the legacy spelling folded in. */
function tokenKind(raw: string): ReferenceKind {
  return raw === "note" ? "page" : (raw as ReferenceKind);
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * URL-safe slug for an entry name.
 *
 * Symbols that carry meaning in tech names are spelled out first, so
 * "C++" and "C#" don't both collapse onto "c" and end up disambiguated
 * by a meaningless numeric suffix.
 */
export function slugify(value: string): string {
  const spelled = value
    .replace(/\+\+/g, " plus plus")
    .replace(/\+/g, " plus")
    .replace(/#/g, " sharp")
    .replace(/&/g, " and ");

  return (
    spelled
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "entry"
  );
}

/**
 * A slugger that keeps one run of names collision-free: the first
 * "Compilers" is `compilers`, a second becomes `compilers-2`.
 */
export function uniqueSlugger(): (value: string) => string {
  const used = new Map<string, number>();
  return (value: string) => {
    const base = slugify(value);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  };
}

/**
 * Flatten `ProfileData` into the client-safe shape the pages render.
 * Course projects are included — a compiler or OS project is usually
 * coursework, and those are exactly the ones worth linking.
 */
export function buildReferenceIndex(
  profile: ProfileData,
  /** Every non-draft page; only published ones become entries. */
  sitePages: SitePage[] = [],
): MatchReferenceIndex {
  const courseSlug = uniqueSlugger();
  const courses: ReferenceCourse[] = profile.courses.map((course) => ({
    id: course.id,
    slug: courseSlug(`${course.courseNumber} ${course.name}`),
    name: course.name,
    courseNumber: course.courseNumber,
    headline: course.headline,
    semester: course.semester,
    projectIds: course.projects.map((project) => project.id),
  }));

  const courseLabels = new Map(
    courses.map((course) => [
      course.id,
      `${course.courseNumber} · ${course.name}`,
    ]),
  );

  const allProjects = [
    ...profile.projects,
    ...profile.courses.flatMap((course) => course.projects),
  ];

  const skillsById = new Map<string, ReferenceSkill>();
  const skillSlug = uniqueSlugger();
  const collectSkills = (entries: readonly { skills: Skill[] }[]) => {
    for (const entry of entries) {
      for (const skill of entry.skills) {
        if (skillsById.has(skill.id)) continue;
        skillsById.set(skill.id, {
          id: skill.id,
          slug: skillSlug(skill.name),
          name: skill.name,
          iconUrl: skillIconUrl(skill),
        });
      }
    }
  };
  collectSkills(allProjects);
  collectSkills(profile.experiences);
  collectSkills(sitePages);

  const projectSlug = uniqueSlugger();
  const experienceSlug = uniqueSlugger();
  const pageSlug = uniqueSlugger();

  return {
    projects: allProjects.map((project) => ({
      id: project.id,
      slug: projectSlug(project.name),
      name: project.name,
      headline: project.headline,
      dateRange: formatDateRange(project.startDate, project.endDate),
      bullets: project.bullets,
      repoUrl: project.repoUrl,
      skillIds: project.skills.map((skill) => skill.id),
      media: project.media.map((item) => ({
        id: item.id,
        kind: item.kind,
        url: item.url,
        caption: item.caption,
      })),
      courseLabel: project.courseId
        ? (courseLabels.get(project.courseId) ?? null)
        : null,
      courseId: project.courseId,
    })),
    experiences: profile.experiences.map((experience) => ({
      id: experience.id,
      slug: experienceSlug(`${experience.title} ${experience.companyName}`),
      companyName: experience.companyName,
      title: experience.title,
      headline: experience.headline,
      dateRange: formatDateRange(experience.startDate, experience.endDate),
      bullets: experience.bullets,
      skillIds: experience.skills.map((skill) => skill.id),
    })),
    courses,
    skills: [...skillsById.values()],
    pages: sitePages
      .filter((page) => page.visibility === "published")
      .map((page) => ({
        id: page.id,
        slug: pageSlug(page.title),
        title: page.title,
        body: page.body,
        headings: pageHeadings(page.body),
        hasDocument: page.filePath !== null,
        showSkillRanking: page.showSkillRanking,
        skillIds: page.skills.map((skill) => skill.id),
      })),
  };
}

/** An entry of any kind, alongside the kind it is. */
export interface ResolvedEntry {
  kind: ReferenceKind;
  id: string;
  slug: string;
  /** How the entry names itself in a tab or a heading. */
  title: string;
  iconUrl: string | null;
}

/**
 * Lookup helpers over an index. Built once per index (memoize it in the
 * client) so name resolution and similarity stay map-based.
 */
export function createReferenceResolver(index: MatchReferenceIndex) {
  const projectsById = new Map(index.projects.map((p) => [p.id, p]));
  const skillsById = new Map(index.skills.map((s) => [s.id, s]));
  const experiencesById = new Map(index.experiences.map((e) => [e.id, e]));
  const coursesById = new Map(index.courses.map((c) => [c.id, c]));
  const pagesById = new Map(index.pages.map((p) => [p.id, p]));

  const projectsByName = new Map(
    index.projects.map((p) => [normalizeKey(p.name), p]),
  );
  const skillsByName = new Map(
    index.skills.map((s) => [normalizeKey(s.name), s]),
  );
  const experiencesByName = new Map(
    index.experiences.flatMap((e) => [
      [normalizeKey(e.title), e] as const,
      [normalizeKey(`${e.title} at ${e.companyName}`), e] as const,
    ]),
  );
  // Courses answer to their number ("CS 4120"), their name, and both.
  const coursesByName = new Map(
    index.courses.flatMap((c) => [
      [normalizeKey(c.courseNumber), c] as const,
      [normalizeKey(c.name), c] as const,
      [normalizeKey(`${c.courseNumber} ${c.name}`), c] as const,
    ]),
  );

  const pagesByName = new Map(
    index.pages.map((p) => [normalizeKey(p.title), p]),
  );

  const bySlug: Record<ReferenceKind, Map<string, { id: string }>> = {
    project: new Map(index.projects.map((p) => [p.slug, p])),
    experience: new Map(index.experiences.map((e) => [e.slug, e])),
    course: new Map(index.courses.map((c) => [c.slug, c])),
    skill: new Map(index.skills.map((s) => [s.slug, s])),
    page: new Map(index.pages.map((p) => [p.slug, p])),
  };

  const projectSkillSets = new Map(
    index.projects.map((p) => [p.id, new Set(p.skillIds)]),
  );

  function project(id: string): ReferenceProject | null {
    return projectsById.get(id) ?? null;
  }

  function skill(id: string): ReferenceSkill | null {
    return skillsById.get(id) ?? null;
  }

  function experience(id: string): ReferenceExperience | null {
    return experiencesById.get(id) ?? null;
  }

  function course(id: string): ReferenceCourse | null {
    return coursesById.get(id) ?? null;
  }

  function page(id: string): ReferencePage | null {
    return pagesById.get(id) ?? null;
  }

  /** Kind-agnostic lookup, for tabs and links that only carry a target. */
  function entry(target: ReferenceTarget): ResolvedEntry | null {
    switch (target.kind) {
      case "project": {
        const found = projectsById.get(target.id);
        return found
          ? { kind: "project", id: found.id, slug: found.slug, title: found.name, iconUrl: null }
          : null;
      }
      case "experience": {
        const found = experiencesById.get(target.id);
        return found
          ? { kind: "experience", id: found.id, slug: found.slug, title: found.title, iconUrl: null }
          : null;
      }
      case "course": {
        const found = coursesById.get(target.id);
        return found
          ? {
              kind: "course",
              id: found.id,
              slug: found.slug,
              title: found.courseNumber,
              iconUrl: null,
            }
          : null;
      }
      case "page": {
        const found = pagesById.get(target.id);
        return found
          ? {
              kind: "page",
              id: found.id,
              slug: found.slug,
              title: found.title,
              iconUrl: null,
            }
          : null;
      }
      case "skill": {
        const found = skillsById.get(target.id);
        return found
          ? {
              kind: "skill",
              id: found.id,
              slug: found.slug,
              title: found.name,
              iconUrl: found.iconUrl,
            }
          : null;
      }
    }
  }

  /** Resolve a URL segment back to a target, for entry routes. */
  function fromSlug(kind: ReferenceKind, slug: string): ReferenceTarget | null {
    const found = bySlug[kind].get(slug);
    return found ? { kind, id: found.id } : null;
  }

  /** Split prose into plain text and resolved reference segments. */
  function parse(text: string): MatchSegment[] {
    const segments: MatchSegment[] = [];
    let lastIndex = 0;

    // A fresh regex per call: TOKEN_PATTERN is global and stateful.
    const pattern = new RegExp(TOKEN_PATTERN.source, TOKEN_PATTERN.flags);
    let match: RegExpExecArray | null;

    const pushText = (value: string) => {
      if (value === "") return;
      const previous = segments[segments.length - 1];
      if (previous?.type === "text") previous.text += value;
      else segments.push({ type: "text", text: value });
    };

    while ((match = pattern.exec(text)) !== null) {
      const [raw, rawKind, rawName, rawLabel] = match;
      pushText(text.slice(lastIndex, match.index));
      lastIndex = match.index + raw.length;

      const kind = tokenKind(rawKind);
      const name = rawName.trim();
      const label = rawLabel?.trim() || name;
      const key = normalizeKey(name);
      const target =
        kind === "project"
          ? projectsByName.get(key)
          : kind === "skill"
            ? skillsByName.get(key)
            : kind === "course"
              ? coursesByName.get(key)
              : kind === "page"
                ? pagesByName.get(key)
                : experiencesByName.get(key);

      // Unresolved tokens read as plain prose rather than leaking syntax.
      if (!target) {
        pushText(label);
        continue;
      }

      segments.push({ type: "ref", kind, id: target.id, label });
    }

    pushText(text.slice(lastIndex));
    return segments;
  }

  /**
   * Projects sharing skills with the given one, best match first.
   *
   * Scored by Jaccard overlap rather than raw shared count, so a project
   * tagged with twenty skills doesn't dominate every list purely by
   * having a wide surface.
   */
  function similarProjects(projectId: string): SimilarProject[] {
    const source = projectSkillSets.get(projectId);
    if (!source || source.size === 0) return [];

    return index.projects
      .filter((candidate) => candidate.id !== projectId)
      .map((candidate) => {
        const candidateSkills = projectSkillSets.get(candidate.id) ?? new Set();
        const shared = candidate.skillIds.filter((id) => source.has(id));
        const unionSize = source.size + candidateSkills.size - shared.length;
        return {
          project: candidate,
          shared,
          score: unionSize === 0 ? 0 : shared.length / unionSize,
        };
      })
      .filter((entry) => entry.shared.length > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.shared.length - a.shared.length ||
          a.project.name.localeCompare(b.project.name),
      )
      .slice(0, SIMILAR_LIMIT)
      .map((entry) => ({
        project: entry.project,
        sharedSkills: entry.shared
          .map((id) => skillsById.get(id))
          .filter((s): s is ReferenceSkill => s !== undefined),
      }));
  }

  /** Every experience, project and published page tagged with a skill. */
  function workUsingSkill(skillId: string): SkillUsage {
    return {
      experiences: index.experiences.filter((experience) =>
        experience.skillIds.includes(skillId),
      ),
      projects: index.projects.filter((project) =>
        project.skillIds.includes(skillId),
      ),
      pages: index.pages.filter((page) => page.skillIds.includes(skillId)),
    };
  }

  /** Projects a course produced. */
  function courseProjects(courseId: string): ReferenceProject[] {
    return index.projects.filter((project) => project.courseId === courseId);
  }

  /**
   * Skills ranked by how much work is tagged with them.
   *
   * Depth of use is the only evidence the profile actually holds, so
   * "strongest" is measured as the number of roles and projects a skill
   * appears on — with roles counted double, since shipping something at
   * a job is a stronger signal than using it once in a project.
   */
  function rankedSkills(): { skill: ReferenceSkill; usage: SkillUsage; score: number }[] {
    return index.skills
      .map((skill) => {
        const usage = workUsingSkill(skill.id);
        return {
          skill,
          usage,
          score:
            usage.experiences.length * 2 +
            usage.projects.length +
            usage.pages.length,
        };
      })
      .filter((entry) => entry.score > 0)
      .sort(
        (a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name),
      );
  }

  return {
    project,
    skill,
    experience,
    course,
    page,
    entry,
    fromSlug,
    parse,
    similarProjects,
    workUsingSkill,
    courseProjects,
    rankedSkills,
  };
}

export type ReferenceResolver = ReturnType<typeof createReferenceResolver>;
