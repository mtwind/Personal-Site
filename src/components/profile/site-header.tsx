import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import type { AuthState } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "#about", label: "About" },
  { href: "#experience", label: "Experience" },
  { href: "#projects", label: "Projects" },
  { href: "#contact", label: "Contact" },
];

interface SiteHeaderProps {
  name: string;
  auth: AuthState;
}

export function SiteHeader({ name, auth }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <span className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {name}
        </span>
        <div className="flex items-center gap-5">
          <nav className="hidden gap-5 text-sm text-zinc-600 sm:flex dark:text-zinc-400">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {item.label}
              </a>
            ))}
          </nav>
          {auth.isEditor ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              Editor
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ name, auth }: SiteHeaderProps) {
  return (
    <footer className="border-t border-zinc-200 py-8 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 text-xs text-zinc-400 dark:text-zinc-500">
        <span>
          © {new Date().getFullYear()} {name}
        </span>
        {auth.email ? (
          <SignOutButton />
        ) : (
          <Link href="/login" className="underline-offset-2 hover:underline">
            Sign in
          </Link>
        )}
      </div>
    </footer>
  );
}
