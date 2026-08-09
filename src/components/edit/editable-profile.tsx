"use client";

import type { ProfileData } from "@/lib/profile-data";
import { EditableAbout } from "./about-editor";
import { EditableContact } from "./contact-editor";
import { EditableCoursework } from "./course-editor";
import { EditableExperiences } from "./experience-editor";
import { EditableProjects } from "./project-editor";

/** Editor variant of the profile page: every section gains CRUD controls. */
export function EditableProfile({ profile }: { profile: ProfileData }) {
  return (
    <>
      <EditableAbout about={profile.about} />
      <EditableExperiences experiences={profile.experiences} />
      <EditableProjects projects={profile.projects} />
      <EditableCoursework courses={profile.courses} />
      <EditableContact contact={profile.contact} />
    </>
  );
}
