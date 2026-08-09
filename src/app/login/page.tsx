import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthState } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/**
 * Owner sign-in. Not linked from public navigation — you just know the
 * URL. Non-editors who sign in see the public site with no edit access.
 */
export default async function LoginPage() {
  const { email } = await getAuthState();

  if (email) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-10">
      <div className="text-center">
        <p className="font-sans text-[11.5px] font-bold tracking-[0.3em] text-(--accent) uppercase">
          Editor Access
        </p>
        <h1 className="mt-4 text-4xl text-(--title)">Sign in</h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-6 text-(--text) italic">
          Sign in with the Google account on the allowlist to edit the
          site.
        </p>
      </div>
      <GoogleSignInButton />
      <Link
        href="/"
        className="font-sans text-[11px] font-semibold tracking-[0.18em] text-(--dim) uppercase transition-colors duration-200 hover:text-(--accent)"
      >
        ← Back to site
      </Link>
    </main>
  );
}
