import { z } from "zod";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Empty/whitespace form values become null (optional fields). */
function emptyToNull(value: FormDataEntryValue | null): string | null {
  const str = typeof value === "string" ? value.trim() : "";
  return str === "" ? null : str;
}

function requiredString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

/** All non-empty textareas named `bullets`, in DOM order. */
function bulletList(formData: FormData): string[] {
  return formData
    .getAll("bullets")
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry !== "");
}

export const aboutSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  headline: z.string().max(200),
  body: z.string().max(5000),
});

export const mediaLinkSchema = z.object({
  ownerType: z.enum(["experience", "project"]),
  ownerId: z.uuid(),
  url: z.url("Link must be a valid URL"),
  caption: z.string().max(200).nullable(),
});

export const mediaImageSchema = z.object({
  ownerType: z.enum(["experience", "project"]),
  ownerId: z.uuid(),
  caption: z.string().max(200).nullable(),
});

export const contactSchema = z.object({
  linkedinUrl: z.url("LinkedIn must be a valid URL").nullable(),
  githubUrl: z.url("GitHub must be a valid URL").nullable(),
  phone: z.string().max(30).nullable(),
  email: z.email("Invalid email").nullable(),
  showPhone: z.boolean(),
});

/** A skill chosen in the picker: catalog entry or custom name. */
export const skillSelectionSchema = z.object({
  name: z.string().trim().min(1, "Skill name is required").max(100),
  slug: z.string().max(100).nullable(),
  source: z.enum(["devicon", "simple-icons", "custom"]),
  color: z.string().max(20).nullable(),
  variant: z.string().max(40).nullable(),
});

export type SkillSelection = z.infer<typeof skillSelectionSchema>;

/** Hidden-field JSON → unknown for schema validation (null on bad JSON). */
function parseJsonField(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export const experienceSchema = z.object({
  companyName: z.string().min(1, "Company is required").max(200),
  companyDomain: z
    .string()
    .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, "Invalid company domain")
    .nullable(),
  companyLogoUrl: z.url("Invalid logo URL").nullable(),
  title: z.string().min(1, "Title is required").max(200),
  headline: z.string().max(200),
  startDate: z.iso.date("Start date is required"),
  endDate: z.iso.date().nullable(),
  bullets: z.array(z.string().max(500)).max(20),
  skills: z.array(skillSelectionSchema).max(30),
});

/**
 * Month inputs post "YYYY-MM"; date columns need a full date. Pin to
 * the 1st — display only ever shows month/year anyway.
 */
function normalizeMonth(value: FormDataEntryValue | null): string | null {
  const raw = emptyToNull(value);
  if (!raw) return null;
  return /^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : raw;
}

/** "https://www.Stripe.com/about" → "stripe.com"; empty → null. */
function normalizeDomain(value: FormDataEntryValue | null): string | null {
  const raw = emptyToNull(value);
  if (!raw) return null;
  const bare = raw
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
  return bare === "" ? null : bare;
}

export const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200),
  headline: z.string().max(200),
  courseId: z.uuid().nullable(),
  startDate: z.iso.date().nullable(),
  endDate: z.iso.date().nullable(),
  repoUrl: z.url("Repo link must be a valid URL").nullable(),
  bullets: z.array(z.string().max(500)).max(20),
  skills: z.array(skillSelectionSchema).max(30),
});

export const courseSchema = z.object({
  name: z.string().min(1, "Course name is required").max(200),
  courseNumber: z.string().min(1, "Course number is required").max(50),
  headline: z.string().max(200),
  semester: z.string().max(50).nullable(),
});

export const idSchema = z.uuid();

export type AboutInput = z.infer<typeof aboutSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type ExperienceInput = z.infer<typeof experienceSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type CourseInput = z.infer<typeof courseSchema>;

export function parseAboutForm(formData: FormData) {
  return aboutSchema.safeParse({
    name: requiredString(formData.get("name")),
    headline: requiredString(formData.get("headline")),
    body: requiredString(formData.get("body")),
  });
}

export function parseMediaLinkForm(formData: FormData) {
  return mediaLinkSchema.safeParse({
    ownerType: requiredString(formData.get("ownerType")),
    ownerId: requiredString(formData.get("ownerId")),
    url: requiredString(formData.get("url")),
    caption: emptyToNull(formData.get("caption")),
  });
}

export function parseMediaImageForm(formData: FormData) {
  return mediaImageSchema.safeParse({
    ownerType: requiredString(formData.get("ownerType")),
    ownerId: requiredString(formData.get("ownerId")),
    caption: emptyToNull(formData.get("caption")),
  });
}

export function parseContactForm(formData: FormData) {
  return contactSchema.safeParse({
    linkedinUrl: emptyToNull(formData.get("linkedinUrl")),
    githubUrl: emptyToNull(formData.get("githubUrl")),
    phone: emptyToNull(formData.get("phone")),
    email: emptyToNull(formData.get("email")),
    showPhone: formData.get("showPhone") === "on",
  });
}

export function parseExperienceForm(formData: FormData) {
  return experienceSchema.safeParse({
    companyName: requiredString(formData.get("companyName")),
    companyDomain: normalizeDomain(formData.get("companyDomain")),
    companyLogoUrl: emptyToNull(formData.get("companyLogoUrl")),
    title: requiredString(formData.get("title")),
    headline: requiredString(formData.get("headline")),
    startDate: normalizeMonth(formData.get("startDate")) ?? "",
    endDate: normalizeMonth(formData.get("endDate")),
    bullets: bulletList(formData),
    skills: parseJsonField(formData.get("skills")),
  });
}

export function parseProjectForm(formData: FormData) {
  return projectSchema.safeParse({
    name: requiredString(formData.get("name")),
    headline: requiredString(formData.get("headline")),
    courseId: emptyToNull(formData.get("courseId")),
    startDate: normalizeMonth(formData.get("startDate")),
    endDate: normalizeMonth(formData.get("endDate")),
    repoUrl: emptyToNull(formData.get("repoUrl")),
    bullets: bulletList(formData),
    skills: parseJsonField(formData.get("skills")),
  });
}

export function parseCourseForm(formData: FormData) {
  return courseSchema.safeParse({
    name: requiredString(formData.get("name")),
    courseNumber: requiredString(formData.get("courseNumber")),
    headline: requiredString(formData.get("headline")),
    semester: emptyToNull(formData.get("semester")),
  });
}

export const teamMatchSchema = z.object({
  headline: z.string().max(200),
  intro: z.string().max(2000),
  meetingUrl: z.url("Meeting link must be a valid URL").nullable(),
  sections: z
    .array(
      z.object({
        title: z.string().trim().min(1, "Section title is required").max(120),
        body: z.string().max(4000),
      }),
    )
    .max(12),
});

export type TeamMatchInput = z.infer<typeof teamMatchSchema>;

export function parseTeamMatchForm(formData: FormData) {
  return teamMatchSchema.safeParse({
    headline: requiredString(formData.get("headline")),
    intro: requiredString(formData.get("intro")),
    meetingUrl: emptyToNull(formData.get("meetingUrl")),
    sections: parseJsonField(formData.get("sections")),
  });
}

export const feedbackSchema = z
  .object({
    role: z.enum(["recruiter", "hiring_manager", "googler", "other"]).nullable(),
    improvementNote: z.string().max(2000).nullable(),
    wantsCall: z.boolean(),
    visitorEmail: z.email("Enter a valid email").nullable(),
  })
  .refine((data) => !data.wantsCall || data.visitorEmail !== null, {
    message: "Add an email so I can reach out about the call",
    path: ["visitorEmail"],
  });

export type FeedbackInput = z.infer<typeof feedbackSchema>;

export function parseFeedbackForm(formData: FormData) {
  return feedbackSchema.safeParse({
    role: emptyToNull(formData.get("role")),
    improvementNote: emptyToNull(formData.get("improvementNote")),
    wantsCall: formData.get("wantsCall") === "on",
    visitorEmail: emptyToNull(formData.get("visitorEmail")),
  });
}

export const knowledgeNoteSchema = z.object({
  id: z.uuid().nullable(),
  kind: z.enum(["note", "document"]),
  title: z.string().trim().min(1, "Give the note a title").max(200),
  body: z.string().max(200000),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  visibility: z.enum(["draft", "private", "published"]),
  skills: z.array(skillSelectionSchema).max(30),
});

export type KnowledgeNoteInput = z.infer<typeof knowledgeNoteSchema>;

/** "visa, relocation , " → ["visa", "relocation"] */
function tagList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  const seen = new Set(
    value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== ""),
  );
  return [...seen];
}

export function parseKnowledgeNoteForm(formData: FormData) {
  return knowledgeNoteSchema.safeParse({
    id: emptyToNull(formData.get("id")),
    kind: requiredString(formData.get("kind")),
    title: requiredString(formData.get("title")),
    body: typeof formData.get("body") === "string" ? formData.get("body") : "",
    tags: tagList(formData.get("tags")),
    visibility: requiredString(formData.get("visibility")),
    skills: parseJsonField(formData.get("skills")),
  });
}

/** First human-readable issue from a failed parse. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}
