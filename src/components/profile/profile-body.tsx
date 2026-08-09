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
      <ProjectSection projects={profile.projects} />
      <CourseworkSection courses={profile.courses} />
      <ContactSection contact={profile.contact} />
    </>
  );
}
