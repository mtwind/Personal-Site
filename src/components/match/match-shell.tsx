"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import type { Ad } from "@/lib/ad-targeting";
import {
  createReferenceResolver,
  type MatchReferenceIndex,
  type ReferenceResolver,
} from "@/lib/match-references";
import {
  closeTab,
  getServerTabs,
  getTabs,
  openTab,
  pruneTabs,
  subscribeTabs,
} from "@/lib/match-tab-store";
import {
  HOME_KEY,
  resolveTab,
  SITE_KEY,
  type MatchTab,
} from "@/lib/match-tabs";
import { SHELL_WIDTH } from "./match-layout";
import { VisitRecorder } from "./shortcut-tiles";
import { TabStrip } from "./tab-strip";

export const GOOGLE_DOTS = ["#4285F4", "#EA4335", "#FBBC04", "#34A853"];

export const FOUR_COLOR_GRADIENT =
  "linear-gradient(90deg,#4285F4 0%,#4285F4 25%,#EA4335 25%,#EA4335 50%,#FBBC04 50%,#FBBC04 75%,#34A853 75%,#34A853 100%)";

/**
 * Gemini's gradient, for the one element on the page that has to be
 * looked at rather than merely found.
 *
 * These are Gemini's own three colours rather than the four-colour bar
 * the header uses, and that difference is the point: the header stripe
 * says "this is the Google-shaped page", while this says "this is the
 * part that wants you". Doubling the run of stops lets a slow slide
 * across it loop without a seam.
 */
export const GEMINI_GRADIENT =
  "linear-gradient(115deg,#4285F4,#9B72CB,#D96570,#9B72CB,#4285F4,#9B72CB,#D96570,#9B72CB,#4285F4)";

/** Material elevation-on-hover for content cards. */
export const CARD =
  "rounded-2xl border border-[#dadce0] bg-white p-6 transition-shadow duration-300 hover:shadow-[0_1px_3px_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]";

interface MatchContextValue {
  /** Page root, e.g. `/match/ab12…`. Every href is built from this. */
  base: string;
  index: MatchReferenceIndex;
  resolver: ReferenceResolver;
  ownerName: string;
  /** Every ad eligible to run; each slot picks its own from this. */
  ads: Ad[];
  /**
   * False for the owner's own sessions. Everything counted — ad
   * impressions, searches — is counted about visitors; the owner
   * browsing his own page would otherwise be most of the data.
   */
  isVisitor: boolean;
}

const MatchContext = createContext<MatchContextValue | null>(null);

/**
 * Index and link-building helpers for anything rendered inside the shell.
 *
 * Server pages below this layout stay thin: they validate their slug and
 * render a client view, which reads the already-shipped index from here
 * rather than having it threaded down as props through every level.
 */
export function useMatch(): MatchContextValue {
  const value = useContext(MatchContext);
  if (!value) throw new Error("useMatch must be used inside MatchShell");
  return value;
}

interface MatchShellProps {
  base: string;
  index: MatchReferenceIndex;
  ownerName: string;
  /** Title of the home tab — the page's own headline. */
  homeTitle: string;
  isEditor: boolean;
  /** Roboto class from next/font, applied to this page only. */
  fontClass: string;
  ads: Ad[];
  /**
   * The right-hand ad column, handed in as an element rather than
   * imported. The rail reads this shell's context, and importing it here
   * would make the two modules import each other.
   */
  rail: React.ReactNode;
  children: React.ReactNode;
}

/** Soft Google-colored orbs drifting behind the page (CSS-only). */
function FloatingOrbs() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <span className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#4285F4] opacity-15 blur-3xl [animation:g-float_18s_ease-in-out_infinite_alternate]" />
      <span className="absolute top-1/3 -right-28 h-[26rem] w-[26rem] rounded-full bg-[#EA4335] opacity-10 blur-3xl [animation:g-float_23s_ease-in-out_infinite_alternate-reverse]" />
      <span
        className="absolute bottom-8 left-1/4 h-80 w-80 rounded-full bg-[#FBBC04] opacity-15 blur-3xl [animation:g-float_20s_ease-in-out_infinite_alternate]"
        style={{ animationDelay: "-6s" }}
      />
      <span
        className="absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-[#34A853] opacity-15 blur-3xl [animation:g-float_26s_ease-in-out_infinite_alternate-reverse]"
        style={{ animationDelay: "-10s" }}
      />
    </div>
  );
}

/**
 * Google-styled shell for the hidden team-matching page: the header, the
 * tab strip beneath it, and whichever page is in front.
 *
 * Tabs are not a widget with its own contents — each one is a real route,
 * and the strip is simply the set of paths this visit has opened. That
 * makes every browser affordance work for free: back and forward walk the
 * history, cmd-click opens a genuine second window, and a link can be
 * copied and sent to someone. Following a link never *replaces* what the
 * reader was looking at; the page they came from is still a tab.
 *
 * The wrapper overrides the site's CSS variables to a Google-light
 * palette so the shared form components blend in when editing.
 */
export function MatchShell({
  base,
  index,
  ownerName,
  homeTitle,
  isEditor,
  fontClass,
  ads,
  rail,
  children,
}: MatchShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  /** The path of the page in front, relative to the page root. */
  const active = useMemo(() => {
    if (!pathname.startsWith(base)) return HOME_KEY;
    return pathname.slice(base.length).replace(/\/$/, "");
  }, [pathname, base]);

  const stored = useSyncExternalStore(
    useCallback((listener) => subscribeTabs(base, listener), [base]),
    useCallback(() => getTabs(base), [base]),
    getServerTabs,
  );

  // The page being viewed is a tab whether or not the store has caught
  // up yet, so the server and the first client render agree on it and
  // the strip never flickers a tab into place after hydration. The site
  // tab is in that same set of always-present keys: it is open before
  // anyone opens it, which is the whole point of it.
  const keys = useMemo(
    () => [...new Set([HOME_KEY, SITE_KEY, ...stored, active])],
    [stored, active],
  );

  // Navigating anywhere new opens a tab rather than taking one over.
  useEffect(() => {
    openTab(base, active);
  }, [base, active]);

  const resolver = useMemo(() => createReferenceResolver(index), [index]);

  const context = useMemo(
    () => ({
      base,
      index,
      resolver,
      ownerName,
      ads,
      isVisitor: !isEditor,
    }),
    [base, index, resolver, ownerName, ads, isEditor],
  );

  // Keys whose entry has since been renamed or deleted resolve to null
  // and quietly drop out of the strip.
  const tabs = useMemo(
    () =>
      keys
        .map((key) => resolveTab(base, key, resolver, homeTitle))
        .filter((tab): tab is MatchTab => tab !== null),
    [keys, base, resolver, homeTitle],
  );

  // Storage outlives the entries it points at: a renamed project leaves
  // a tab whose path now 404s. The strip already hides those; this takes
  // them out of storage too, so they can't be navigated to.
  useEffect(() => {
    pruneTabs(
      base,
      (key) =>
        key === active ||
        resolveTab(base, key, resolver, homeTitle) !== null,
    );
  }, [base, active, resolver, homeTitle]);

  /**
   * Close a tab. Closing the one you're on returns to the page's home
   * rather than to a neighbour — home is the one tab that always exists
   * and always resolves, so it is the only landing spot that can't be a
   * dead link.
   */
  const onCloseTab = useCallback(
    (key: string) => {
      closeTab(base, key);
      if (key === active) router.push(base);
    },
    [active, base, router],
  );

  return (
    <MatchContext.Provider value={context}>
      <div
        className={`${fontClass} min-h-screen flex-1 bg-[#f8f9fa] text-[#3c4043] [--accent:#1a73e8] [--bg:#f8f9fa] [--bg-elev:#ffffff] [--danger:#d93025] [--dim:#5f6368] [--hover-bg:rgba(26,115,232,0.05)] [--line:#dadce0] [--title:#202124]`}
      >
        <FloatingOrbs />
        <VisitRecorder />

        <div className="sticky top-0 z-30">
          <header className="border-b border-[#dadce0] bg-white/85 backdrop-blur">
            <div
              className="h-[3px] w-full"
              style={{ background: FOUR_COLOR_GRADIENT }}
            />
            {/* Wrapping rather than a fixed row: the editor's six tools
                don't fit beside the title until the shell itself widens,
                so below that they take a row of their own beneath it —
                and on a phone they wrap again within that row. The
                breakpoint is the shell's own, because that is exactly
                where the header stops being a 3xl column. A visit
                without the tools stays the single row it always was. */}
            <div
              className={`${SHELL_WIDTH} flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2 sm:px-5 min-[1100px]:flex-nowrap min-[1100px]:py-0`}
            >
              <Link
                href={base}
                className="flex min-w-0 items-center gap-2 rounded-full outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#1a73e8] sm:gap-3"
              >
                <span className="flex shrink-0 items-center gap-1" aria-hidden>
                  {GOOGLE_DOTS.map((color) => (
                    <span
                      key={color}
                      className="h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5"
                      style={{ background: color }}
                    />
                  ))}
                </span>
                <span className="truncate text-[15px] text-[#5f6368] sm:text-[17px]">
                  Team Matching ·{" "}
                  <span className="font-medium text-[#202124]">
                    {ownerName}
                  </span>
                </span>
              </Link>
              {isEditor ? (
                <nav
                  aria-label="Editor tools"
                  className="flex w-full flex-wrap items-center gap-1.5 min-[1100px]:w-auto min-[1100px]:flex-nowrap min-[1100px]:justify-end"
                >
                  {[
                    { href: "/admin/pages", label: "Pages" },
                    { href: "/admin/questions", label: "Q&A" },
                    { href: "/admin/ads", label: "Ads" },
                    { href: "/admin/search-console", label: "Searches" },
                    { href: "/admin/feedback", label: "Feedback" },
                    { href: `${base}?edit=1`, label: "Edit page" },
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="rounded-full border border-[#dadce0] px-3 py-1.5 text-[13px] font-medium text-[#1a73e8] transition-colors hover:bg-[#f1f6fe]"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              ) : null}
            </div>
          </header>

          <TabStrip tabs={tabs} activeKey={active} onClose={onCloseTab} />
        </div>

        {/* The site tab carries a whole website of its own, so it gets
            the column the ads would have taken and the reading width
            they were sized against.

            `items-start` keeps the two columns from stretching to each
            other's height. The rail sizes itself by measuring the
            content beside it, so a stretching main column would be
            reporting the rail's own height back to it — a loop that can
            only ever ratchet upwards, since every card added makes the
            column it was measured against taller. */}
        <div
          className={`${SHELL_WIDTH} relative z-10 flex items-start gap-8 px-5 ${
            active === SITE_KEY ? "py-5" : "py-10"
          }`}
        >
          <main
            className={`w-full min-w-0 ${
              active === SITE_KEY ? "" : "max-w-3xl"
            }`}
          >
            {children}
          </main>
          {active === SITE_KEY ? null : rail}
        </div>
      </div>
    </MatchContext.Provider>
  );
}
