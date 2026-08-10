/**
 * Inline project/skill references for the hidden team-matching page.
 *
 * Section prose can name a project or a skill with a token —
 * `[[project:Simple C Compiler]]` or `[[skill:C]]` — and the reader can
 * open it in a side pane without losing their place. Tokens resolve by
 * *name* rather than id so the page stays hand-editable in a textarea.
 *
 * Everything here is pure and serializable: the index is built on the
 * server from `ProfileData` and handed to the client component as props.
 */
import { formatDateRange } from "@/lib/format";
import type { ProfileData } from "@/lib/profile-data";
import { skillIconUrl, type Skill } from "@/lib/skill-icon";

/** How many related projects a project view suggests. */
const SIMILAR_LIMIT = 4;

export interface ReferenceSkill {
  id: string;
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
}

export interface ReferenceExperience {
  id: string;
  companyName: string;
  title: string;
  /** One-line description shown on preview cards. */
  headline: string;
  dateRange: string | null;
  bullets: string[];
  skillIds: string[];
}

export interface MatchReferenceIndex {
  projects: ReferenceProject[];
  experiences: ReferenceExperience[];
  skills: ReferenceSkill[];
}

export type ReferenceKind = "project" | "skill" | "experience";

/** A reference the reader can open in the pane. */
export interface ReferenceTarget {
  kind: ReferenceKind;
  id: string;
}

/** Stable identity for a target, used as its tab key. */
export function referenceKey(target: ReferenceTarget): string {
  return `${target.kind}:${target.id}`;
}

export type MatchSegment =
  | { type: "text"; text: string }
  | { type: "ref"; kind: ReferenceKind; id: string; label: string };

/** A related project plus the skills that made it related. */
export interface SimilarProject {
  project: ReferenceProject;
  sharedSkills: ReferenceSkill[];
}

/** Everything tagged with a given skill. */
export interface SkillUsage {
  experiences: ReferenceExperience[];
  projects: ReferenceProject[];
}

/**
 * `[[kind:name]]` or `[[kind:name|display text]]`.
 *
 * The name stops at `|` or `]` so an unterminated token degrades to
 * plain text instead of swallowing the rest of the paragraph.
 */
const TOKEN_PATTERN = /\[\[(project|skill):([^\]|]+)(?:\|([^\]]*))?\]\]/g;

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Flatten `ProfileData` into the client-safe shape the pane renders.
 * Course projects are included — a compiler or OS project is usually
 * coursework, and those are exactly the ones worth linking.
 */
export function buildReferenceIndex(profile: ProfileData): MatchReferenceIndex {
  const courseLabels = new Map(
    profile.courses.map((course) => [
      course.id,
      `${course.courseNumber} · ${course.name}`,
    ]),
  );

  const allProjects = [
    ...profile.projects,
    ...profile.courses.flatMap((course) => course.projects),
  ];

  const skillsById = new Map<string, ReferenceSkill>();
  const collectSkills = (entries: { skills: Skill[] }[]) => {
    for (const entry of entries) {
      for (const skill of entry.skills) {
        if (skillsById.has(skill.id)) continue;
        skillsById.set(skill.id, {
          id: skill.id,
          name: skill.name,
          iconUrl: skillIconUrl(skill),
        });
      }
    }
  };
  collectSkills(allProjects);
  collectSkills(profile.experiences);

  return {
    projects: allProjects.map((project) => ({
      id: project.id,
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
    })),
    experiences: profile.experiences.map((experience) => ({
      id: experience.id,
      companyName: experience.companyName,
      title: experience.title,
      headline: experience.headline,
      dateRange: formatDateRange(experience.startDate, experience.endDate),
      bullets: experience.bullets,
      skillIds: experience.skills.map((skill) => skill.id),
    })),
    skills: [...skillsById.values()],
  };
}

/**
 * Lookup helpers over an index. Built once per index (memoize it in the
 * client) so name resolution and similarity stay map-based.
 */
export function createReferenceResolver(index: MatchReferenceIndex) {
  const projectsById = new Map(index.projects.map((p) => [p.id, p]));
  const skillsById = new Map(index.skills.map((s) => [s.id, s]));
  const experiencesById = new Map(index.experiences.map((e) => [e.id, e]));
  const projectsByName = new Map(
    index.projects.map((p) => [normalizeKey(p.name), p]),
  );
  const skillsByName = new Map(
    index.skills.map((s) => [normalizeKey(s.name), s]),
  );
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
      const [raw, kind, rawName, rawLabel] = match;
      pushText(text.slice(lastIndex, match.index));
      lastIndex = match.index + raw.length;

      const name = rawName.trim();
      const label = rawLabel?.trim() || name;
      const target =
        kind === "project"
          ? projectsByName.get(normalizeKey(name))
          : skillsByName.get(normalizeKey(name));

      // Unresolved tokens read as plain prose rather than leaking syntax.
      if (!target) {
        pushText(label);
        continue;
      }

      segments.push({
        type: "ref",
        kind: kind as ReferenceKind,
        id: target.id,
        label,
      });
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

  /** Every experience and project tagged with a skill. */
  function workUsingSkill(skillId: string): SkillUsage {
    return {
      experiences: index.experiences.filter((experience) =>
        experience.skillIds.includes(skillId),
      ),
      projects: index.projects.filter((project) =>
        project.skillIds.includes(skillId),
      ),
    };
  }

  return {
    project,
    skill,
    experience,
    parse,
    similarProjects,
    workUsingSkill,
  };
}

export type ReferenceResolver = ReturnType<typeof createReferenceResolver>;
