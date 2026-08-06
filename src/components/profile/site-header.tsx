import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { EditModeToggle } from "@/components/edit/edit-mode";
import { ThemeToggle } from "@/components/theme-toggle";
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
  /** Secret team-match slug — only passed when the viewer is the editor. */
  matchSlug?: string | null;
}

const GOOGLE_DOTS = ["#4285F4", "#EA4335", "#FBBC04", "#34A853"];

export function SiteHeader({ name, auth, matchSlug }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-(--line) bg-(--header-bg) backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-4 px-5">
        <a href="#about" className="text-lg text-(--title)">
          {name}
        </a>
        <nav className="hidden gap-6 font-sans text-[11px] font-semibold tracking-[0.18em] text-(--dim) uppercase sm:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition-colors duration-200 hover:text-(--accent)"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          {matchSlug ? (
            <Link
              href={`/match/${matchSlug}`}
              title="Team-matching page (only you can see this link)"
              className="flex items-center gap-1.5 rounded-full border border-(--line) px-3 py-1.5 font-sans text-[11px] font-semibold tracking-[0.14em] text-(--dim) uppercase transition-colors duration-200 hover:border-(--accent) hover:text-(--accent)"
            >
              <span className="flex items-center gap-0.5" aria-hidden>
                {GOOGLE_DOTS.map((color) => (
                  <span
                    key={color}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: color }}
                  />
                ))}
              </span>
              Google
            </Link>
          ) : null}
          {auth.isEditor ? <EditModeToggle /> : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ name, auth }: SiteHeaderProps) {
  return (
    <footer className="relative z-[1] border-t border-(--line) py-8">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 font-sans text-[11px] tracking-[0.12em] text-(--dim) uppercase">
        <span>
          © {new Date().getFullYear()} {name}
        </span>
        {auth.email ? (
          <SignOutButton />
        ) : (
          <Link
            href="/login"
            className="text-(--accent) underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        )}
      </div>
    </footer>
  );
}
