"use client";

import { useActionState, useEffect, useState, useTransition } from "react";

import {
  createExperience,
  deleteExperience,
  updateExperience,
} from "@/lib/actions/profile";
import type { ActionResult } from "@/lib/actions/validation";
import type { ExperienceWithRelations } from "@/lib/profile-data";
import { ExperienceCard } from "@/components/profile/experience-section";
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

interface ExperienceFormProps {
  exp: ExperienceWithRelations | null;
  onClose: () => void;
}

function ExperienceForm({ exp, onClose }: ExperienceFormProps) {
  const action = exp ? updateExperience : createExperience;
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      {exp ? <input type="hidden" name="id" value={exp.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" htmlFor={`exp-company-${exp?.id ?? "new"}`}>
          <input
            id={`exp-company-${exp?.id ?? "new"}`}
            name="companyName"
            defaultValue={exp?.companyName ?? ""}
            required
            placeholder="Company name (search coming soon)"
            className={inputClass}
          />
        </Field>
        <Field label="Title" htmlFor={`exp-title-${exp?.id ?? "new"}`}>
          <input
            id={`exp-title-${exp?.id ?? "new"}`}
            name="title"
            defaultValue={exp?.title ?? ""}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Start date" htmlFor={`exp-start-${exp?.id ?? "new"}`}>
          <input
            id={`exp-start-${exp?.id ?? "new"}`}
            name="startDate"
            type="date"
            defaultValue={exp?.startDate ?? ""}
            required
            className={inputClass}
          />
        </Field>
        <Field
          label="End date (blank = present)"
          htmlFor={`exp-end-${exp?.id ?? "new"}`}
        >
          <input
            id={`exp-end-${exp?.id ?? "new"}`}
            name="endDate"
            type="date"
            defaultValue={exp?.endDate ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Bullet points" htmlFor="bullets">
        <BulletsInput name="bullets" initial={exp?.bullets ?? []} />
      </Field>
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="flex gap-2">
        <SubmitButton>{exp ? "Save changes" : "Add experience"}</SubmitButton>
        <CancelButton onClick={onClose} />
      </div>
    </form>
  );
}

function ExperienceItem({ exp }: { exp: ExperienceWithRelations }) {
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (editing) {
    return <ExperienceForm exp={exp} onClose={() => setEditing(false)} />;
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${exp.title} at ${exp.companyName}"?`)) {
      return;
    }
    startDelete(async () => {
      const result = await deleteExperience(exp.id);
      setDeleteError(result.ok ? null : result.error);
    });
  }

  return (
    <div className="group relative">
      <ExperienceCard exp={exp} />
      <div className="mt-2 flex items-center gap-2 pl-14">
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

export function EditableExperiences({
  experiences,
}: {
  experiences: ExperienceWithRelations[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <Section id="experience" title="Work Experience">
      <div className="space-y-10">
        {experiences.length > 0
          ? experiences.map((exp) => <ExperienceItem key={exp.id} exp={exp} />)
          : !adding && <EmptyState message="No work experience added yet." />}
        {adding ? (
          <ExperienceForm exp={null} onClose={() => setAdding(false)} />
        ) : (
          <EditButton label="+ Add experience" onClick={() => setAdding(true)} />
        )}
      </div>
    </Section>
  );
}
