/**
 * The person the whole page is about, in the shape the knowledge panel
 * needs: a name, a face, and the handful of links a reader might want
 * once they've decided they're interested.
 *
 * Pure and client-safe. Assembled on the server from the profile and the
 * team-matching page, because the two disagree on purpose — the résumé
 * shown here is the team-matching edition when there is one, and the
 * public one otherwise.
 */
import type { ProfileData } from "@/lib/profile-data";

export interface MatchOwner {
  name: string;
  /** One line: what he is, not what he wants. */
  headline: string;
  photoUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  email: string | null;
  resumeUrl: string | null;
}

export function buildMatchOwner(
  profile: ProfileData,
  page: { resumeUrl: string | null },
): MatchOwner {
  return {
    name: profile.about?.name ?? "",
    headline: profile.about?.headline ?? "",
    photoUrl: profile.about?.photoUrl ?? null,
    linkedinUrl: profile.contact?.linkedinUrl ?? null,
    githubUrl: profile.contact?.githubUrl ?? null,
    email: profile.contact?.email ?? null,
    resumeUrl: page.resumeUrl ?? profile.contact?.resumeUrl ?? null,
  };
}
