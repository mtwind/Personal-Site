"use client";

import { EditableProfile } from "@/components/edit/editable-profile";
import { useEditMode } from "@/components/edit/edit-mode";
import type { ProfileData } from "@/lib/profile-data";
import { AboutSection } from "./about-section";
import { ContactSection } from "./contact-section";
import { CourseworkSection } from "./coursework-section";
import { ExperienceSection } from "./experience-section";
import { ProjectSection } from "./project-section";

interface ProfileBodyProps {
  profile: ProfileData;
  isEditor: boolean;
}

/** Applies to both lists: a course project can be match-only too. */
const onPublicSite = (project: { matchOnly: boolean }) => !project.matchOnly;

/** Editors see CRUD controls only while the header toggle is on. */
export function ProfileBody({ profile, isEditor }: ProfileBodyProps) {
  const { editMode } = useEditMode();

  if (isEditor && editMode) {
    return <EditableProfile profile={profile} />;
  }

  return (
    <>
      <AboutSection about={profile.about} />
      <ExperienceSection experiences={profile.experiences} />
      {/* Match-only projects are dropped here rather than in the query:
          the same profile builds the team-matching index, which is the
          one place they are meant to show. Filtering on the read path
          would take them off both. The editor still sees them above,
          since edit mode renders the whole list. */}
      <ProjectSection projects={profile.projects.filter(onPublicSite)} />
      <CourseworkSection
        courses={profile.courses.map((course) => ({
          ...course,
          projects: course.projects.filter(onPublicSite),
        }))}
      />
      <ContactSection contact={profile.contact} />
    </>
  );
}
