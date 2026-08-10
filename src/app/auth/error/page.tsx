import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 py-10 text-center">
      <p className="font-sans text-[11.5px] font-bold tracking-[0.3em] text-(--danger) uppercase">
        Sign-in failed
      </p>
      <p className="max-w-sm text-[15px] leading-6 text-(--text) italic">
        Something went wrong during authentication. Please try again.
      </p>
      {reason ? (
        <p className="max-w-sm font-sans text-[13px] leading-5 text-(--dim)">
          {reason}
        </p>
      ) : null}
      <Link
        href="/login"
        className="font-sans text-[11px] font-semibold tracking-[0.18em] text-(--dim) uppercase transition-colors duration-200 hover:text-(--accent)"
      >
        ← Try again
      </Link>
    </main>
  );
}
