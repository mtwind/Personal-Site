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

/**
 * A row on the home page's listing.
 *
 * The overrides are stored as null rather than "" so a blank field means
 * "use the entry's own words" — which is what an editor who cleared the
 * box meant, and what keeps the listing following a renamed project.
 */
export const featuredEntrySchema = z.object({
  kind: z.enum(["project", "experience", "course", "skill", "page"]),
  id: z.uuid(),
  title: z
    .string()
    .trim()
    .max(120)
    .nullish()
    .transform((value) => value || null),
  snippet: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((value) => value || null),
});

export const teamMatchSchema = z.object({
  headline: z.string().max(200),
  intro: z.string().max(2000),
  meetingUrl: z.url("Meeting link must be a valid URL").nullable(),
  featured: z.array(featuredEntrySchema).max(24),
});

export type TeamMatchInput = z.infer<typeof teamMatchSchema>;

export function parseTeamMatchForm(formData: FormData) {
  return teamMatchSchema.safeParse({
    headline: requiredString(formData.get("headline")),
    intro: requiredString(formData.get("intro")),
    meetingUrl: emptyToNull(formData.get("meetingUrl")),
    featured: parseJsonField(formData.get("featured")),
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

/**
 * The inline strip's two halves.
 *
 * Split because they are two separate submissions: the role is written
 * the moment it is tapped, and everything else is an optional second
 * act against the row that tap created. Same fields as the one-shot
 * form above, so both routes store the same shape.
 */
export const feedbackRoleSchema = z.object({
  role: z.enum(["recruiter", "hiring_manager", "googler", "other"]),
});

export const feedbackDetailSchema = z
  .object({
    id: z.uuid(),
    improvementNote: z.string().max(2000).nullable(),
    wantsCall: z.boolean(),
    visitorEmail: z.email("Enter a valid email").nullable(),
  })
  .refine((data) => !data.wantsCall || data.visitorEmail !== null, {
    message: "Add an email so I can reach out about the call",
    path: ["visitorEmail"],
  });

export type FeedbackDetailInput = z.infer<typeof feedbackDetailSchema>;

export function parseFeedbackForm(formData: FormData) {
  return feedbackSchema.safeParse({
    role: emptyToNull(formData.get("role")),
    improvementNote: emptyToNull(formData.get("improvementNote")),
    wantsCall: formData.get("wantsCall") === "on",
    visitorEmail: emptyToNull(formData.get("visitorEmail")),
  });
}

export const sitePageSchema = z.object({
  id: z.uuid().nullable(),
  kind: z.enum(["page", "document"]),
  title: z.string().trim().min(1, "Give the page a title").max(200),
  body: z.string().max(200000),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  visibility: z.enum(["draft", "private", "published"]),
  showSkillRanking: z.boolean(),
  skills: z.array(skillSelectionSchema).max(30),
});

export type SitePageInput = z.infer<typeof sitePageSchema>;

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

export function parseSitePageForm(formData: FormData) {
  return sitePageSchema.safeParse({
    id: emptyToNull(formData.get("id")),
    kind: requiredString(formData.get("kind")),
    title: requiredString(formData.get("title")),
    body: typeof formData.get("body") === "string" ? formData.get("body") : "",
    tags: tagList(formData.get("tags")),
    visibility: requiredString(formData.get("visibility")),
    showSkillRanking: formData.get("showSkillRanking") === "on",
    skills: parseJsonField(formData.get("skills")),
  });
}

export const adSchema = z.object({
  id: z.uuid().nullable(),
  brand: z.string().trim().min(1, "Give the ad a brand").max(80),
  headline: z.string().trim().min(1, "Give the ad a headline").max(120),
  description: z.string().trim().max(300),
  displayUrl: z.string().trim().max(120),
  targetUrl: z.url("The ad needs a valid link").max(500),
  iconSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9.-]+$/, "Icon slug is lowercase letters, digits and dashes")
    .max(60)
    .nullable(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Colour must be a hex like #FC4C02")
    .nullable(),
  iconUrl: z.url("Custom logo must be a valid URL").max(500).nullable(),
  infoText: z.string().trim().max(500),
  keywords: z.array(z.string().trim().min(1).max(40)).max(40),
  slots: z
    .array(z.enum(["sponsored", "rail", "banner"]))
    .min(1, "Pick at least one placement"),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

export type AdInput = z.infer<typeof adSchema>;

export function parseAdForm(formData: FormData) {
  const order = Number(formData.get("sortOrder"));

  return adSchema.safeParse({
    id: emptyToNull(formData.get("id")),
    brand: requiredString(formData.get("brand")),
    headline: requiredString(formData.get("headline")),
    description: requiredString(formData.get("description")),
    displayUrl: requiredString(formData.get("displayUrl")),
    targetUrl: requiredString(formData.get("targetUrl")),
    iconSlug: emptyToNull(formData.get("iconSlug"))?.toLowerCase() ?? null,
    color: emptyToNull(formData.get("color")),
    iconUrl: emptyToNull(formData.get("iconUrl")),
    infoText: requiredString(formData.get("infoText")),
    keywords: tagList(formData.get("keywords")),
    // Checkbox groups post nothing when every box is cleared, which the
    // schema then rejects — a placement-less ad can't run anywhere.
    slots: formData.getAll("slots"),
    active: formData.get("active") === "on",
    sortOrder: Number.isFinite(order) ? order : 0,
  });
}

/** First human-readable issue from a failed parse. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

/**
 * One "people also ask" row.
 *
 * The answer may be empty: writing the question down is often the first
 * step, and a half-filled block the editor can see is more useful than
 * one that refused to save.
 */
export const questionSchema = z.object({
  id: z.uuid().nullable(),
  question: z.string().trim().min(1, "Write the question").max(200),
  answer: z.string().trim().max(2000),
  keywords: z.array(z.string().trim().min(1).max(60)).max(20),
  sortOrder: z.number().int().min(0).max(999),
  active: z.boolean(),
});

export type QuestionInput = z.infer<typeof questionSchema>;

export function parseQuestionForm(formData: FormData) {
  return questionSchema.safeParse({
    id: emptyToNull(formData.get("id")),
    question: requiredString(formData.get("question")),
    answer: requiredString(formData.get("answer")),
    keywords: tagList(formData.get("keywords")),
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    active: formData.get("active") === "on",
  });
}
