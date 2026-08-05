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

interface ProjectFormProps {
  project: ProjectWithRelations | null;
  onClose: () => void;
}

function ProjectForm({ project, onClose }: ProjectFormProps) {
  const action = project ? updateProject : createProject;
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const idSuffix = project?.id ?? "new";

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
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
        <Field label="Start date" htmlFor={`proj-start-${idSuffix}`}>
          <input
            id={`proj-start-${idSuffix}`}
            name="startDate"
            type="date"
            defaultValue={project?.startDate ?? ""}
            className={inputClass}
          />
        </Field>
        <Field
          label="End date (blank = ongoing)"
          htmlFor={`proj-end-${idSuffix}`}
        >
          <input
            id={`proj-end-${idSuffix}`}
            name="endDate"
            type="date"
            defaultValue={project?.endDate ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Bullet points" htmlFor="bullets">
        <BulletsInput name="bullets" initial={project?.bullets ?? []} />
      </Field>
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="flex gap-2">
        <SubmitButton>{project ? "Save changes" : "Add project"}</SubmitButton>
        <CancelButton onClick={onClose} />
      </div>
    </form>
  );
}

function ProjectItem({ project }: { project: ProjectWithRelations }) {
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
          className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
        <FormError message={deleteError} />
      </div>
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
          <div className="grid gap-4 sm:grid-cols-2">
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
