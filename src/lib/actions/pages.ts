"use server";

import { revalidatePath } from "next/cache";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  knowledgeNoteSkills,
  knowledgeNotes,
  teamMatchPage,
} from "@/db/schema";
import { extractDocumentText } from "@/lib/extract-document";
import { deleteDocument, uploadDocument } from "@/lib/storage";
import { runMutation } from "./mutation";
import { resolveSkillIds } from "./skill-sync";
import {
  firstIssue,
  idSchema,
  parseKnowledgeNoteForm,
  type ActionResult,
} from "./validation";

/**
 * Editor-only writes for the private knowledge base.
 *
 * A published note becomes a page under the team-matching site and the
 * overview's corpus changes on every save, so each mutation revalidates
 * that whole subtree rather than a single path.
 */
async function revalidateMatch(): Promise<void> {
  const rows = await db
    .select({ slug: teamMatchPage.slug })
    .from(teamMatchPage)
    .limit(1);
  if (rows[0]) revalidatePath(`/match/${rows[0].slug}`, "layout");
  revalidatePath("/admin/knowledge");
}

/**
 * Create or update a note.
 *
 * When a file comes with the request it is uploaded first and read
 * second, and the transcription replaces the note's text unless the
 * editor asked to keep what they had. Extraction failing is a failed
 * save, not a note quietly stored with an empty body — the uploaded
 * file is removed again so storage doesn't collect orphans.
 */
export async function saveKnowledgeNote(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseKnowledgeNoteForm(formData);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { id, kind, title, tags, visibility, skills: skillSelections } =
    parsed.data;
  let body = parsed.data.body;

  return runMutation(async () => {
    const existing = id
      ? ((
          await db
            .select()
            .from(knowledgeNotes)
            .where(eq(knowledgeNotes.id, id))
            .limit(1)
        )[0] ?? null)
      : null;

    if (id && !existing) throw new Error("That note no longer exists.");

    const upload = formData.get("document");
    const hasUpload = upload instanceof File && upload.size > 0;
    const removeDocument = formData.get("removeDocument") === "on";
    // Unchecked on an edit means "I've hand-corrected this text, leave it".
    const replaceText = formData.get("replaceText") === "on";

    let filePath = existing?.filePath ?? null;
    let fileName = existing?.fileName ?? null;
    let fileType = existing?.fileType ?? null;
    let fileSize = existing?.fileSize ?? null;
    let supersededPath: string | null = null;

    if (hasUpload) {
      const uploaded = upload as File;
      const path = await uploadDocument(uploaded);

      if (replaceText || body.trim() === "") {
        try {
          body = await extractDocumentText(uploaded);
        } catch (error: unknown) {
          // The note isn't written, so the file it would have belonged
          // to has no owner — take it back out.
          await deleteDocument(path);
          throw error;
        }
      }

      supersededPath = filePath;
      filePath = path;
      fileName = uploaded.name;
      fileType = uploaded.type;
      fileSize = uploaded.size;
    } else if (removeDocument) {
      supersededPath = filePath;
      filePath = null;
      fileName = null;
      fileType = null;
      fileSize = null;
    }

    const values = {
      kind,
      title,
      body,
      tags,
      visibility,
      filePath,
      fileName,
      fileType,
      fileSize,
      updatedAt: new Date(),
    };

    let noteId: string;
    if (existing) {
      await db
        .update(knowledgeNotes)
        .set(values)
        .where(eq(knowledgeNotes.id, existing.id));
      noteId = existing.id;
    } else {
      const inserted = await db
        .insert(knowledgeNotes)
        .values(values)
        .returning({ id: knowledgeNotes.id });
      noteId = inserted[0].id;
    }

    // Replace the note's skill links wholesale — the picker posts the
    // full set every time, so a removed chip has to disappear here too.
    const skillIds = await resolveSkillIds(skillSelections);
    await db
      .delete(knowledgeNoteSkills)
      .where(eq(knowledgeNoteSkills.noteId, noteId));
    if (skillIds.length > 0) {
      await db.insert(knowledgeNoteSkills).values(
        skillIds.map((skillId, index) => ({
          noteId,
          skillId,
          sortOrder: index,
        })),
      );
    }

    // Only once the row is safely written: a delete before the update
    // would strand the note pointing at a file that no longer exists.
    await deleteDocument(supersededPath);
    await revalidateMatch();
  });
}

export async function deleteKnowledgeNote(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = idSchema.safeParse(formData.get("id"));
  if (!parsed.success) return { ok: false, error: "Invalid note id" };

  return runMutation(async () => {
    const rows = await db
      .select({ filePath: knowledgeNotes.filePath })
      .from(knowledgeNotes)
      .where(eq(knowledgeNotes.id, parsed.data))
      .limit(1);

    await db.delete(knowledgeNotes).where(eq(knowledgeNotes.id, parsed.data));
    await deleteDocument(rows[0]?.filePath ?? null);
    await revalidateMatch();
  });
}
