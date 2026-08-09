import "server-only";

import type { InferSelectModel } from "drizzle-orm";
import { desc } from "drizzle-orm";

import { db } from "@/db";
import { feedbackSubmissions } from "@/db/schema";

export type FeedbackSubmission = InferSelectModel<typeof feedbackSubmissions>;

/**
 * All feedback submissions, newest first. The direct Drizzle connection
 * bypasses RLS, so callers must gate on editor status themselves.
 */
export async function getFeedbackSubmissions(): Promise<FeedbackSubmission[]> {
  return db
    .select()
    .from(feedbackSubmissions)
    .orderBy(desc(feedbackSubmissions.createdAt));
}
