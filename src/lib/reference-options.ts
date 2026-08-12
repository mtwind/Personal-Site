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

/**
 * The characters a display label can't carry.
 *
 * `|` separates the label from the name and `]` ends the token, so a
 * label containing either would truncate the link it belongs to. They're
 * dropped rather than escaped: there is no escape syntax to drop them
 * into, and no sentence needs a bracket in the middle of a link.
 */
export function sanitizeReferenceLabel(label: string): string {
  // Whitespace is collapsed after the strip rather than before it, so a
  // dropped bracket doesn't leave a gap where it used to be.
  return label.replace(/[[\]|]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * `[[project:Figgie Genius]]`, or `[[project:Figgie Genius|the one with
 * the bots]]` when the prose wants to call it something else.
 *
 * A label matching the entry's own name is left off. The two render
 * identically, and the shorter token is the one that still reads as the
 * name of a thing when the entry is later renamed.
 *
 * Takes the kind as a string rather than a `ReferenceKind` so the editor
 * can rewrite a token it found in the text without first resolving it —
 * including a legacy `note:` one, which keeps its old spelling instead of
 * being quietly rewritten by an edit to its label.
 */
export function writeReferenceToken(
  kind: string,
  name: string,
  label?: string,
): string {
  const shown = sanitizeReferenceLabel(label ?? "");
  const suffix = shown && shown !== name.trim() ? `|${shown}` : "";
  return `[[${kind}:${name}${suffix}]]`;
}

/** The token for something the picker offered. */
export function referenceToken(
  option: ReferenceOption,
  label?: string,
): string {
  return writeReferenceToken(option.kind, option.name, label);
}

export { KIND_LABEL };
