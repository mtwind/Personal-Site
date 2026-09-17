"use client";

import { useActionState, useEffect, useState, useTransition } from "react";

import {
  createCompany,
  createExperience,
  deleteCompany,
  deleteExperience,
  updateCompany,
  updateExperience,
} from "@/lib/actions/profile";
import type { ActionResult } from "@/lib/actions/validation";
import type {
  CompanyWithRoles,
  ExperienceWithRelations,
} from "@/lib/profile-data";
import {
  CompanyLine,
  RoleCard,
} from "@/components/profile/experience-section";
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
import { CompanySearch } from "./company-search";
import { MediaEditor } from "./media-editor";
import { SkillPickerField, toSkillSelections } from "./skill-picker-field";

const deleteButtonClass =
  "rounded-md border border-(--danger) px-2.5 py-1 font-sans text-xs font-medium text-(--danger) transition-colors duration-200 hover:bg-red-500/10 disabled:opacity-50";

interface CompanyFormProps {
  company: CompanyWithRoles | null;
  onClose: () => void;
}

/** Name, domain and logo — the roles are added underneath afterwards. */
function CompanyForm({ company, onClose }: CompanyFormProps) {
  const action = company ? updateCompany : createCompany;
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
      className="space-y-4 rounded-xl border border-(--line) bg-(--hover-bg) p-4"
    >
      {company ? <input type="hidden" name="id" value={company.id} /> : null}
      <CompanySearch
        idSuffix={company?.id ?? "new"}
        initialName={company?.name ?? ""}
        initialDomain={company?.domain ?? null}
        initialLogoUrl={company?.logoUrl ?? null}
      />
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="flex gap-2">
        <SubmitButton>{company ? "Save changes" : "Add company"}</SubmitButton>
        <CancelButton onClick={onClose} />
      </div>
    </form>
  );
}

interface RoleFormProps {
  /** The company this role belongs to. */
  companyId: string;
  role: ExperienceWithRelations | null;
  onClose: () => void;
}

function RoleForm({ companyId, role, onClose }: RoleFormProps) {
  const action = role ? updateExperience : createExperience;
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const idSuffix = role?.id ?? `new-${companyId}`;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-(--line) bg-(--hover-bg) p-4"
    >
      {role ? <input type="hidden" name="id" value={role.id} /> : null}
      <input type="hidden" name="companyId" value={companyId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor={`exp-title-${idSuffix}`}>
          <input
            id={`exp-title-${idSuffix}`}
            name="title"
            defaultValue={role?.title ?? ""}
            required
            placeholder="Software Engineer"
            className={inputClass}
          />
        </Field>
        <Field label="Start month" htmlFor={`exp-start-${idSuffix}`}>
          <input
            id={`exp-start-${idSuffix}`}
            name="startDate"
            type="month"
            defaultValue={role?.startDate?.slice(0, 7) ?? ""}
            required
            className={inputClass}
          />
        </Field>
        <Field
          label="End month (blank = present)"
          htmlFor={`exp-end-${idSuffix}`}
        >
          <input
            id={`exp-end-${idSuffix}`}
            name="endDate"
            type="month"
            defaultValue={role?.endDate?.slice(0, 7) ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
      <Field
        label="Short description (shown on preview cards)"
        htmlFor={`exp-headline-${idSuffix}`}
      >
        <input
          id={`exp-headline-${idSuffix}`}
          name="headline"
          defaultValue={role?.headline ?? ""}
          placeholder="One line on what this role was about"
          className={inputClass}
        />
      </Field>
      <Field label="Bullet points" htmlFor="bullets">
        <BulletsInput name="bullets" initial={role?.bullets ?? []} />
      </Field>
      <Field label="Skills" htmlFor="skills">
        <SkillPickerField initial={toSkillSelections(role?.skills ?? [])} />
      </Field>
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="flex gap-2">
        <SubmitButton>{role ? "Save changes" : "Add role"}</SubmitButton>
        <CancelButton onClick={onClose} />
      </div>
    </form>
  );
}

interface RoleItemProps {
  company: CompanyWithRoles;
  role: ExperienceWithRelations;
}

function RoleItem({ company, role }: RoleItemProps) {
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (editing) {
    return (
      <RoleForm
        companyId={company.id}
        role={role}
        onClose={() => setEditing(false)}
      />
    );
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${role.title} at ${company.name}"?`)) {
      return;
    }
    startDelete(async () => {
      const result = await deleteExperience(role.id);
      setDeleteError(result.ok ? null : result.error);
    });
  }

  return (
    <div>
      <RoleCard role={role} />
      <div className="mt-2 flex items-center gap-2 sm:pl-[170px]">
        <EditButton label="Edit role" onClick={() => setEditing(true)} />
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className={deleteButtonClass}
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
        <FormError message={deleteError} />
      </div>
      <div className="sm:pl-[170px]">
        <MediaEditor
          ownerType="experience"
          ownerId={role.id}
          items={role.media}
        />
      </div>
    </div>
  );
}

/** Company header + its roles, each with their own CRUD. */
function CompanyItem({ company }: { company: CompanyWithRoles }) {
  const [editing, setEditing] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDelete() {
    const roleNote =
      company.roles.length > 0
        ? ` and its ${company.roles.length} role${company.roles.length === 1 ? "" : "s"}`
        : "";
    if (!window.confirm(`Delete "${company.name}"${roleNote}?`)) {
      return;
    }
    startDelete(async () => {
      const result = await deleteCompany(company.id);
      setDeleteError(result.ok ? null : result.error);
    });
  }

  return (
    <div className="rounded-md border border-(--line) p-4">
      {editing ? (
        <CompanyForm company={company} onClose={() => setEditing(false)} />
      ) : (
        <>
          <CompanyLine company={company} />
          <div className="flex items-center gap-2 sm:pl-[170px]">
            <EditButton
              label="Edit company"
              onClick={() => setEditing(true)}
            />
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className={deleteButtonClass}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
            <FormError message={deleteError} />
          </div>
        </>
      )}
      <div className="mt-4 space-y-6 border-l border-(--line) pl-4">
        {company.roles.map((role) => (
          <RoleItem key={role.id} company={company} role={role} />
        ))}
        {addingRole ? (
          <RoleForm
            companyId={company.id}
            role={null}
            onClose={() => setAddingRole(false)}
          />
        ) : (
          <EditButton
            label="+ Add role"
            onClick={() => setAddingRole(true)}
          />
        )}
      </div>
    </div>
  );
}

export function EditableExperiences({
  companies,
}: {
  companies: CompanyWithRoles[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <Section id="experience" title="Work Experience">
      <div className="space-y-6">
        {companies.length > 0 ? (
          <div className="space-y-4">
            {companies.map((company) => (
              <CompanyItem key={company.id} company={company} />
            ))}
          </div>
        ) : (
          !adding && <EmptyState message="No work experience added yet." />
        )}
        {adding ? (
          <CompanyForm company={null} onClose={() => setAdding(false)} />
        ) : (
          <EditButton label="+ Add company" onClick={() => setAdding(true)} />
        )}
      </div>
    </Section>
  );
}
