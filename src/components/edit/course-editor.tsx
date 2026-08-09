"use client";

import { useActionState, useEffect, useState, useTransition } from "react";

import {
  createCourse,
  deleteCourse,
  updateCourse,
} from "@/lib/actions/profile";
import type { ActionResult } from "@/lib/actions/validation";
import type { CourseWithProjects } from "@/lib/profile-data";
import { EmptyState, Section } from "@/components/profile/section";
import {
  CancelButton,
  EditButton,
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "./form-fields";
import { ProjectForm, ProjectItem } from "./project-editor";

interface CourseFormProps {
  course: CourseWithProjects | null;
  onClose: () => void;
}

function CourseForm({ course, onClose }: CourseFormProps) {
  const action = course ? updateCourse : createCourse;
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const idSuffix = course?.id ?? "new";

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-(--line) bg-(--hover-bg) p-4"
    >
      {course ? <input type="hidden" name="id" value={course.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Course name" htmlFor={`course-name-${idSuffix}`}>
          <input
            id={`course-name-${idSuffix}`}
            name="name"
            defaultValue={course?.name ?? ""}
            required
            placeholder="Machine Learning"
            className={inputClass}
          />
        </Field>
        <Field label="Course number" htmlFor={`course-number-${idSuffix}`}>
          <input
            id={`course-number-${idSuffix}`}
            name="courseNumber"
            defaultValue={course?.courseNumber ?? ""}
            required
            placeholder="CS 4780"
            className={inputClass}
          />
        </Field>
        <Field
          label="Semester (optional)"
          htmlFor={`course-semester-${idSuffix}`}
        >
          <input
            id={`course-semester-${idSuffix}`}
            name="semester"
            defaultValue={course?.semester ?? ""}
            placeholder="Fall 2025"
            className={inputClass}
          />
        </Field>
      </div>
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="flex gap-2">
        <SubmitButton>{course ? "Save changes" : "Add course"}</SubmitButton>
        <CancelButton onClick={onClose} />
      </div>
    </form>
  );
}

/** Course header + always-expanded project list with its own CRUD. */
function CourseItem({ course }: { course: CourseWithProjects }) {
  const [editing, setEditing] = useState(false);
  const [addingProject, setAddingProject] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDelete() {
    const projectNote =
      course.projects.length > 0
        ? ` and its ${course.projects.length} project${course.projects.length === 1 ? "" : "s"}`
        : "";
    if (!window.confirm(`Delete course "${course.name}"${projectNote}?`)) {
      return;
    }
    startDelete(async () => {
      const result = await deleteCourse(course.id);
      setDeleteError(result.ok ? null : result.error);
    });
  }

  return (
    <div className="rounded-md border border-(--line) p-4">
      {editing ? (
        <CourseForm course={course} onClose={() => setEditing(false)} />
      ) : (
        <>
          <div className="grid gap-x-5 gap-y-1 sm:grid-cols-[150px_1fr]">
            <div className="pt-1 font-sans text-[11.5px] text-(--dim)">
              {course.semester}
            </div>
            <div className="min-w-0">
              <h3 className="text-[19px] font-normal text-(--title) italic">
                {course.name}
              </h3>
              <div className="mt-0.5 font-sans text-[11px] font-semibold tracking-[0.18em] text-(--accent) uppercase">
                {course.courseNumber}
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <EditButton label="Edit course" onClick={() => setEditing(true)} />
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
        </>
      )}
      <div className="mt-4 space-y-4 border-l border-(--line) pl-4">
        {course.projects.map((project) => (
          <ProjectItem key={project.id} project={project} />
        ))}
        {addingProject ? (
          <ProjectForm
            project={null}
            courseId={course.id}
            onClose={() => setAddingProject(false)}
          />
        ) : (
          <EditButton
            label="+ Add project"
            onClick={() => setAddingProject(true)}
          />
        )}
      </div>
    </div>
  );
}

export function EditableCoursework({
  courses,
}: {
  courses: CourseWithProjects[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <Section id="coursework" title="Coursework">
      <div className="space-y-6">
        {courses.length > 0 ? (
          <div className="space-y-4">
            {courses.map((course) => (
              <CourseItem key={course.id} course={course} />
            ))}
          </div>
        ) : (
          !adding && <EmptyState message="No coursework added yet." />
        )}
        {adding ? (
          <CourseForm course={null} onClose={() => setAdding(false)} />
        ) : (
          <EditButton label="+ Add course" onClick={() => setAdding(true)} />
        )}
      </div>
    </Section>
  );
}
