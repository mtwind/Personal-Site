import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Sign-in failed</h1>
      <p className="text-sm opacity-70">
        Something went wrong during authentication. Please try again.
      </p>
      <Link href="/" className="text-sm underline underline-offset-4">
        Back to home
      </Link>
    </main>
  );
}
