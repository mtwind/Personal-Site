interface GhostMonogramProps {
  /** Usually the owner's initials, e.g. "MW". */
  initials: string;
}

/**
 * Giant outlined monogram sweeping the full viewport behind the page.
 * Fixed + z-0 so it passes under every section at any scroll position;
 * the keyframes and reduced-motion guard live in globals.css.
 */
export function GhostMonogram({ initials }: GhostMonogramProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-[18vh] left-0 z-0 font-bold whitespace-nowrap text-transparent select-none [-webkit-text-stroke:1.5px_var(--ghost-stroke)] [animation:ghost-sweep_16s_linear_infinite] [font-size:clamp(220px,32vw,380px)]"
    >
      {initials}
    </div>
  );
}
