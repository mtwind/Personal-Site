/**
 * The things prose can link to, flattened for the editor's picker.
 *
 * Built from the same index the team-matching pages render from, so what
 * the picker offers and what actually resolves at render time can't
 * drift apart.
 *
 * Every kind is here, in the order an author is most likely to reach for
 * one: the pages they wrote, the roles they held, the work they built,
 * the courses behind it, and the skills it used.
 */
import {
  KIND_LABEL,
  type MatchReferenceIndex,
  type ReferenceKind,
} from "@/lib/match-references";

export interface ReferenceOption {
  kind: ReferenceKind;
  /** The name the token must carry, exactly as the resolver expects. */
  name: string;
  /** Extra context in the picker list — a company, a course name. */
  detail: string | null;
  /**
   * What the picker calls this row.
   *
   * Usually the kind's own label, but coursework says "Coursework"
   * rather than "Project": a compiler written for CS 4120 is findable
   * under the word an author would actually search for, while still
   * being a project as far as the URL and the token are concerned.
   */
  label: string;
}

export function referenceOptions(
  index: MatchReferenceIndex,
): ReferenceOption[] {
  return [
    // Only published pages have a URL, so only they can be linked to.
    ...index.pages.map((page) => ({
      kind: "page" as const,
      name: page.title,
      detail: page.hasDocument ? "Published page · document" : "Published page",
      label: KIND_LABEL.page,
    })),
    ...index.experiences.map((experience) => ({
      kind: "experience" as const,
      name: experience.title,
      detail: experience.companyName,
      label: KIND_LABEL.experience,
    })),
    ...index.projects.map((project) => ({
      kind: "project" as const,
      name: project.name,
      detail: project.courseLabel ?? project.dateRange,
      label: project.courseLabel ? "Coursework" : KIND_LABEL.project,
    })),
    // Courses answer to their number, which is what the resolver keys on.
    ...index.courses.map((course) => ({
      kind: "course" as const,
      name: course.courseNumber,
      detail: course.name,
      label: KIND_LABEL.course,
    })),
    ...index.skills.map((skill) => ({
      kind: "skill" as const,
      name: skill.name,
      detail: null,
      label: KIND_LABEL.skill,
    })),
  ];
}

/** `[[project:Figgie Genius]]` */
export function referenceToken(option: ReferenceOption): string {
  return `[[${option.kind}:${option.name}]]`;
}

export { KIND_LABEL };
