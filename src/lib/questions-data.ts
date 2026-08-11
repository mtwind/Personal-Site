import "server-only";

import { cache } from "react";

import type { InferSelectModel } from "drizzle-orm";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { relatedQuestions } from "@/db/schema";

export type RelatedQuestionRow = InferSelectModel<typeof relatedQuestions>;

/** The part of a question the page ships to the browser. */
export interface RelatedQuestion {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

/** Everything, active or not — the admin list. */
export async function getAllQuestions(): Promise<RelatedQuestionRow[]> {
  return db
    .select()
    .from(relatedQuestions)
    .orderBy(asc(relatedQuestions.sortOrder), asc(relatedQuestions.createdAt));
}

/**
 * The questions the page may show, in authored order.
 *
 * Cached per request: the layout and the page below it both render from
 * the same visit, and a question list is small enough that shipping it
 * whole beats asking the server which ones match.
 */
export const getActiveQuestions = cache(
  async (): Promise<RelatedQuestion[]> => {
    const rows = await db
      .select({
        id: relatedQuestions.id,
        question: relatedQuestions.question,
        answer: relatedQuestions.answer,
        keywords: relatedQuestions.keywords,
      })
      .from(relatedQuestions)
      .where(eq(relatedQuestions.active, true))
      .orderBy(asc(relatedQuestions.sortOrder), asc(relatedQuestions.createdAt));

    return rows;
  },
);
