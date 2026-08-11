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
  subscribeTabs,
} from "@/lib/match-tab-store";
import {
  HOME_KEY,
  resolveTab,
  type MatchSection,
  type MatchTab,
} from "@/lib/match-tabs";
import { TabStrip } from "./tab-strip";

export const GOOGLE_DOTS = ["#4285F4", "#EA4335", "#FBBC04", "#34A853"];

export const FOUR_COLOR_GRADIENT =
  "linear-gradient(90deg,#4285F4 0%,#4285F4 25%,#EA4335 25%,#EA4335 50%,#FBBC04 50%,#FBBC04 75%,#34A853 75%,#34A853 100%)";

/** Material elevation-on-hover for content cards. */
export const CARD =
  "rounded-2xl border border-[#dadce0] bg-white p-6 transition-shadow duration-300 hover:shadow-[0_1px_3px_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]";

interface MatchContextValue {
  /** Page root, e.g. `/match/ab12…`. Every href is built from this. */
  base: string;
  index: MatchReferenceIndex;
  resolver: ReferenceResolver;
  sections: MatchSection[];
  ownerName: string;
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
  sections: MatchSection[];
  ownerName: string;
  /** Title of the home tab — the page's own headline. */
  homeTitle: string;
  isEditor: boolean;
  /** Roboto class from next/font, applied to this page only. */
  fontClass: string;
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
  sections,
  ownerName,
  homeTitle,
  isEditor,
  fontClass,
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
  // the strip never flickers a tab into place after hydration.
  const keys = useMemo(
    () => [...new Set([HOME_KEY, ...stored, active])],
    [stored, active],
  );

  // Navigating anywhere new opens a tab rather than taking one over.
  useEffect(() => {
    openTab(base, active);
  }, [base, active]);

  const resolver = useMemo(() => createReferenceResolver(index), [index]);

  const context = useMemo(
    () => ({ base, index, resolver, sections, ownerName }),
    [base, index, resolver, sections, ownerName],
  );

  // Keys whose entry has since been renamed or deleted resolve to null
  // and quietly drop out of the strip.
  const tabs = useMemo(
    () =>
      keys
        .map((key) => resolveTab(base, key, resolver, sections, homeTitle))
        .filter((tab): tab is MatchTab => tab !== null),
    [keys, base, resolver, sections, homeTitle],
  );

  /** Close a tab, handing focus to its right-hand neighbour like Chrome. */
  const onCloseTab = useCallback(
    (key: string) => {
      const successor = closeTab(base, key);
      if (key === active) router.push(base + successor);
    },
    [active, base, router],
  );

  return (
    <MatchContext.Provider value={context}>
      <div
        className={`${fontClass} min-h-screen flex-1 bg-[#f8f9fa] text-[#3c4043] [--accent:#1a73e8] [--bg:#f8f9fa] [--bg-elev:#ffffff] [--danger:#d93025] [--dim:#5f6368] [--hover-bg:rgba(26,115,232,0.05)] [--line:#dadce0] [--title:#202124]`}
      >
        <FloatingOrbs />

        <div className="sticky top-0 z-30">
          <header className="border-b border-[#dadce0] bg-white/85 backdrop-blur">
            <div
              className="h-[3px] w-full"
              style={{ background: FOUR_COLOR_GRADIENT }}
            />
            <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
              <Link
                href={base}
                className="flex items-center gap-3 rounded-full outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#1a73e8]"
              >
                <span className="flex items-center gap-1" aria-hidden>
                  {GOOGLE_DOTS.map((color) => (
                    <span
                      key={color}
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: color }}
                    />
                  ))}
                </span>
                <span className="text-[17px] text-[#5f6368]">
                  Team Matching ·{" "}
                  <span className="font-medium text-[#202124]">
                    {ownerName}
                  </span>
                </span>
              </Link>
              {isEditor ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/admin/feedback"
                    className="rounded-full border border-[#dadce0] px-4 py-1.5 text-sm font-medium text-[#1a73e8] transition-colors hover:bg-[#f1f6fe]"
                  >
                    Feedback
                  </Link>
                  <Link
                    href={`${base}?edit=1`}
                    className="rounded-full border border-[#dadce0] px-4 py-1.5 text-sm font-medium text-[#1a73e8] transition-colors hover:bg-[#f1f6fe]"
                  >
                    Edit page
                  </Link>
                </div>
              ) : null}
            </div>
          </header>

          <TabStrip tabs={tabs} activeKey={active} onClose={onCloseTab} />
        </div>

        <main className="relative z-10 mx-auto max-w-3xl px-5 py-10">
          {children}
        </main>
      </div>
    </MatchContext.Provider>
  );
}
