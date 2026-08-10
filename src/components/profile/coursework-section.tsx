"use client";

import { useState } from "react";

import type { CourseWithProjects } from "@/lib/profile-data";
import { ProjectCard } from "./project-section";
import { EmptyState, Section } from "./section";

/** Course header line; expands to reveal the projects built for it. */
export function CourseCard({ course }: { course: CourseWithProjects }) {
  const [open, setOpen] = useState(false);
  const hasProjects = course.projects.length > 0;

  return (
    <article className="-mx-4 rounded-md border-l-2 border-l-transparent px-4 py-3 transition-[background-color,border-color] duration-300 hover:border-l-(--accent) hover:bg-(--hover-bg)">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={!hasProjects}
        aria-expanded={hasProjects ? open : undefined}
        className="grid w-full gap-x-5 gap-y-1 text-left sm:grid-cols-[150px_1fr_auto]"
      >
        <div className="pt-1 font-sans text-[11.5px] text-(--dim)">
          {course.semester}
        </div>
        <div className="min-w-0">
          <h3 className="text-[19px] font-normal text-(--title) italic">
            {course.name}
          </h3>
          <div className="mt-0.5 font-sans text-[11px] font-semibold tracking-[0.18em] text-(--accent) uppercase">
            {course.courseNumber}
            {hasProjects
              ? ` · ${course.projects.length} project${course.projects.length === 1 ? "" : "s"}`
              : ""}
          </div>
          {course.headline ? (
            <p className="mt-1 text-[14px] leading-6 text-(--text)">
              {course.headline}
            </p>
          ) : null}
        </div>
        {hasProjects && (
          <span
            aria-hidden
            className={`justify-self-end pt-2 text-(--dim) transition-transform duration-300 ${open ? "rotate-90" : ""}`}
          >
            ›
          </span>
        )}
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="mt-2 space-y-1 border-l border-(--line) pl-3 sm:ml-[170px]">
            {course.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export function CourseworkSection({
  courses,
}: {
  courses: CourseWithProjects[];
}) {
  return (
    <Section id="coursework" title="Coursework">
      {courses.length > 0 ? (
        <div className="space-y-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <EmptyState message="No coursework added yet." />
      )}
    </Section>
  );
}
