import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 py-10 text-center">
      <p className="font-sans text-[11.5px] font-bold tracking-[0.3em] text-(--danger) uppercase">
        Sign-in failed
      </p>
      <p className="max-w-sm text-[15px] leading-6 text-(--text) italic">
        Something went wrong during authentication. Please try again.
      </p>
      <Link
        href="/login"
        className="font-sans text-[11px] font-semibold tracking-[0.18em] text-(--dim) uppercase transition-colors duration-200 hover:text-(--accent)"
      >
        ← Try again
      </Link>
    </main>
  );
}
