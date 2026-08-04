import { redirect } from "next/navigation";

import { getAuthState } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="max-w-sm text-center text-sm opacity-70">
        Editor access only. Sign in with the Google account on the
        allowlist to edit the site.
      </p>
      <GoogleSignInButton />
    </main>
  );
}
