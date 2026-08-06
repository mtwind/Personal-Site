import "server-only";

import { getServerEnv } from "@/lib/env";

export interface FeedbackEmailInput {
  role: string | null;
  improvementNote: string | null;
  wantsCall: boolean;
  visitorEmail: string | null;
}

/**
 * Notify the owner about an exit-form submission via Resend's REST API.
 * Best-effort: missing config or send failures log and return false —
 * the submission is already stored in the database either way.
 */
export async function sendFeedbackEmail(
  to: string,
  input: FeedbackEmailInput,
): Promise<boolean> {
  const { RESEND_API_KEY, RESEND_FROM } = getServerEnv();
  if (!RESEND_API_KEY) return false;

  const lines = [
    "New team-matching page feedback:",
    "",
    `Role: ${input.role ?? "not specified"}`,
    `Wants a call: ${input.wantsCall ? "YES" : "no"}`,
    `Visitor email: ${input.visitorEmail ?? "not provided"}`,
    "",
    "Improvement note:",
    input.improvementNote ?? "(none)",
  ];

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM ?? "Team Matching <onboarding@resend.dev>",
        to,
        subject: `Team-matching feedback${input.wantsCall ? " — wants a call!" : ""}`,
        text: lines.join("\n"),
      }),
    });
    if (!response.ok) {
      console.error(`Resend responded ${response.status}`);
      return false;
    }
    return true;
  } catch (error: unknown) {
    console.error("Feedback email failed:", error);
    return false;
  }
}
