"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface NavItem {
  href: string;
  label: string;
}

interface HeaderNavProps {
  name: string;
  /** Rendered in this order — it mirrors the order of sections on the page. */
  items: NavItem[];
  /**
   * Hrefs ordered by importance. When the row is too narrow for all of
   * them, links are dropped from the tail of this list, so the survivors
   * are the first N the viewer cares about (still shown in page order).
   */
  priority: string[];
  /** Theme toggle, edit toggle, match link — always visible. */
  children: ReactNode;
}

/** Key used for the name in the measurement mirror. */
const NAME_KEY = "__name";

// useLayoutEffect logs a warning when React renders on the server; the
// measurement only means anything in the browser anyway.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const LINK_CLASS =
  "whitespace-nowrap font-sans text-[11px] font-semibold tracking-[0.18em] text-(--dim) uppercase";
const NAME_CLASS = "whitespace-nowrap text-lg text-(--title)";
/** Kept identical on the nav and the mirror so measured gaps match reality. */
const NAV_GAP_CLASS = "gap-4 sm:gap-6";

interface Layout {
  /** Hrefs that fit, in page order. */
  visible: string[];
  /** The name only earns its spot when every link fits beside it. */
  withName: boolean;
}

function sameLayout(a: Layout, b: Layout): boolean {
  return (
    a.withName === b.withName &&
    a.visible.length === b.visible.length &&
    a.visible.every((href, i) => href === b.visible[i])
  );
}

/**
 * Header row that fits as many nav links as the viewport allows. Widths are
 * measured from a hidden mirror of every link, so the breakpoint is the real
 * text width rather than a guessed screen size.
 */
export function HeaderNav({ name, items, priority, children }: HeaderNavProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  // The server renders the full set; the first layout pass trims it to fit.
  const [layout, setLayout] = useState<Layout>(() => ({
    visible: items.map((item) => item.href),
    withName: true,
  }));

  const measure = useCallback(() => {
    const row = rowRef.current;
    const controls = controlsRef.current;
    const mirror = mirrorRef.current;
    if (!row || !controls || !mirror) return;

    const rowStyle = getComputedStyle(row);
    const rowGap = Number.parseFloat(rowStyle.columnGap) || 0;
    const padding =
      Number.parseFloat(rowStyle.paddingLeft) +
      Number.parseFloat(rowStyle.paddingRight);
    const navGap = Number.parseFloat(getComputedStyle(mirror).columnGap) || 0;

    const widths = new Map<string, number>();
    for (const child of Array.from(mirror.children) as HTMLElement[]) {
      widths.set(child.dataset.measure ?? "", child.getBoundingClientRect().width);
    }

    // Space left for the links once padding, the controls, and the gap
    // before them are accounted for.
    const available =
      row.clientWidth -
      padding -
      controls.getBoundingClientRect().width -
      rowGap;

    const navWidth = (hrefs: string[]) =>
      hrefs.reduce((sum, href) => sum + (widths.get(href) ?? 0), 0) +
      navGap * Math.max(hrefs.length - 1, 0);

    const allHrefs = items.map((item) => item.href);
    const nameWidth = widths.get(NAME_KEY) ?? 0;

    const fitInPriorityOrder = (): string[] => {
      const kept: string[] = [];
      for (const href of priority) {
        if (navWidth([...kept, href]) > available) break;
        kept.push(href);
      }
      // Render the survivors in page order, not priority order.
      return allHrefs.filter((href) => kept.includes(href));
    };

    const next: Layout =
      navWidth(allHrefs) + rowGap + nameWidth <= available
        ? { visible: allHrefs, withName: true }
        : { visible: fitInPriorityOrder(), withName: false };

    setLayout((prev) => (sameLayout(prev, next) ? prev : next));
  }, [items, priority]);

  useIsomorphicLayoutEffect(() => {
    measure();

    const observer = new ResizeObserver(measure);
    if (rowRef.current) observer.observe(rowRef.current);
    // The controls change width when the editor toggles or the match link
    // appears, which changes how much room the links have.
    if (controlsRef.current) observer.observe(controlsRef.current);

    // Web fonts land after first paint and change every measured width.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [measure]);

  const visible = new Set(layout.visible);

  return (
    <div
      ref={rowRef}
      className="relative mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-4 overflow-hidden px-5"
    >
      {layout.withName ? (
        <a href="#about" className={NAME_CLASS}>
          {name}
        </a>
      ) : null}
      <nav className={`flex items-center ${NAV_GAP_CLASS} ${LINK_CLASS}`}>
        {items
          .filter((item) => visible.has(item.href))
          .map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition-colors duration-200 hover:text-(--accent)"
            >
              {item.label}
            </a>
          ))}
      </nav>
      <div ref={controlsRef} className="flex shrink-0 items-center gap-4">
        {children}
      </div>

      {/* Off-layout copy of every link, measured to decide what fits. */}
      <div
        ref={mirrorRef}
        aria-hidden
        className={`pointer-events-none invisible absolute top-0 left-0 flex w-max items-center ${NAV_GAP_CLASS}`}
      >
        <span data-measure={NAME_KEY} className={NAME_CLASS}>
          {name}
        </span>
        {items.map((item) => (
          <span key={item.href} data-measure={item.href} className={LINK_CLASS}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
