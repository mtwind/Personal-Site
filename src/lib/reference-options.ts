/**
 * The things a note can link to, flattened for the editor's picker.
 *
 * Built on the server from the same index the team-matching pages use,
 * so what the picker offers and what actually resolves at render time
 * can't drift apart.
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
}

export function referenceOptions(
  index: MatchReferenceIndex,
): ReferenceOption[] {
  return [
    ...index.projects.map((project) => ({
      kind: "project" as const,
      name: project.name,
      detail: project.courseLabel ?? project.dateRange,
    })),
    ...index.experiences.map((experience) => ({
      kind: "experience" as const,
      name: experience.title,
      detail: experience.companyName,
    })),
    // Courses answer to their number, which is what the resolver keys on.
    ...index.courses.map((course) => ({
      kind: "course" as const,
      name: course.courseNumber,
      detail: course.name,
    })),
    ...index.skills.map((skill) => ({
      kind: "skill" as const,
      name: skill.name,
      detail: null,
    })),
    // Only published notes have a page, so only they can be linked to.
    ...index.notes.map((note) => ({
      kind: "note" as const,
      name: note.title,
      detail: "Published note",
    })),
  ];
}

/** `[[project:Figgie Genius]]` */
export function referenceToken(option: ReferenceOption): string {
  return `[[${option.kind}:${option.name}]]`;
}

export { KIND_LABEL };
