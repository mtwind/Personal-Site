"use client";

import { useActionState, useEffect, useState, useTransition } from "react";

import {
  createProject,
  deleteProject,
  updateProject,
} from "@/lib/actions/profile";
import type { ActionResult } from "@/lib/actions/validation";
import type { ProjectWithRelations } from "@/lib/profile-data";
import { ProjectCard } from "@/components/profile/project-section";
import { EmptyState, Section } from "@/components/profile/section";
import {
  BulletsInput,
  CancelButton,
  EditButton,
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "./form-fields";
import { MediaEditor } from "./media-editor";
import { SkillPickerField, toSkillSelections } from "./skill-picker-field";

interface ProjectFormProps {
  project: ProjectWithRelations | null;
  /** When set, the project is created under (or stays under) this course. */
  courseId?: string | null;
  onClose: () => void;
}

export function ProjectForm({ project, courseId, onClose }: ProjectFormProps) {
  const action = project ? updateProject : createProject;
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const idSuffix = project?.id ?? "new";
  // Editing must preserve an existing course link — omitting the field
  // would detach the project from its course on save.
  const courseIdValue = project?.courseId ?? courseId ?? null;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-(--line) bg-(--hover-bg) p-4"
    >
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      {courseIdValue ? (
        <input type="hidden" name="courseId" value={courseIdValue} />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project name" htmlFor={`proj-name-${idSuffix}`}>
          <input
            id={`proj-name-${idSuffix}`}
            name="name"
            defaultValue={project?.name ?? ""}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Repo URL (optional)" htmlFor={`proj-repo-${idSuffix}`}>
          <input
            id={`proj-repo-${idSuffix}`}
            name="repoUrl"
            type="url"
            defaultValue={project?.repoUrl ?? ""}
            placeholder="https://github.com/…"
            className={inputClass}
          />
        </Field>
        <Field label="Start month" htmlFor={`proj-start-${idSuffix}`}>
          <input
            id={`proj-start-${idSuffix}`}
            name="startDate"
            type="month"
            defaultValue={project?.startDate?.slice(0, 7) ?? ""}
            className={inputClass}
          />
        </Field>
        <Field
          label="End month (blank = ongoing)"
          htmlFor={`proj-end-${idSuffix}`}
        >
          <input
            id={`proj-end-${idSuffix}`}
            name="endDate"
            type="month"
            defaultValue={project?.endDate?.slice(0, 7) ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Bullet points" htmlFor="bullets">
        <BulletsInput name="bullets" initial={project?.bullets ?? []} />
      </Field>
      <Field label="Skills" htmlFor="skills">
        <SkillPickerField initial={toSkillSelections(project?.skills ?? [])} />
      </Field>
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="flex gap-2">
        <SubmitButton>{project ? "Save changes" : "Add project"}</SubmitButton>
        <CancelButton onClick={onClose} />
      </div>
    </form>
  );
}

export function ProjectItem({ project }: { project: ProjectWithRelations }) {
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (editing) {
    return <ProjectForm project={project} onClose={() => setEditing(false)} />;
  }

  function handleDelete() {
    if (!window.confirm(`Delete project "${project.name}"?`)) return;
    startDelete(async () => {
      const result = await deleteProject(project.id);
      setDeleteError(result.ok ? null : result.error);
    });
  }

  return (
    <div>
      <ProjectCard project={project} />
      <div className="mt-2 flex items-center gap-2">
        <EditButton label="Edit" onClick={() => setEditing(true)} />
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-md border border-(--danger) px-2.5 py-1 font-sans text-xs font-medium text-(--danger) transition-colors duration-200 hover:bg-red-500/10 disabled:opacity-50"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
        <FormError message={deleteError} />
      </div>
      <MediaEditor ownerType="project" ownerId={project.id} items={project.media} />
    </div>
  );
}

export function EditableProjects({
  projects,
}: {
  projects: ProjectWithRelations[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <Section id="projects" title="Projects">
      <div className="space-y-6">
        {projects.length > 0 ? (
          <div className="space-y-4">
            {projects.map((project) => (
              <ProjectItem key={project.id} project={project} />
            ))}
          </div>
        ) : (
          !adding && <EmptyState message="No projects added yet." />
        )}
        {adding ? (
          <ProjectForm project={null} onClose={() => setAdding(false)} />
        ) : (
          <EditButton label="+ Add project" onClick={() => setAdding(true)} />
        )}
      </div>
    </Section>
  );
}
