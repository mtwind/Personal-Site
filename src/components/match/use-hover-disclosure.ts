import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A small explanatory panel that opens on hover and stays on a click.
 *
 * The two disclosures on this page — "Why this ad?" and "About this
 * result" — are things a reader glances at, so hovering is enough to
 * show one. But glancing isn't always enough: the ad note is a couple of
 * sentences worth reading properly, and reading it means moving the
 * pointer away from the button. Clicking pins the panel open so it
 * survives that, and then it behaves like every other popover on the
 * web — anywhere else you click, or Escape, dismisses it.
 *
 * The alternative, and what this replaces, was click-to-toggle: nothing
 * appeared on hover, and the only way to dismiss a panel was to find the
 * same small button again.
 */

/**
 * How long the panel outlives the pointer leaving it.
 *
 * The button and the panel are separate elements with a gap between
 * them, so a pointer travelling from one to the other is briefly over
 * neither. Closing immediately would put the text behind a gap the
 * reader has to jump, which on a 6px target means missing it.
 */
const CLOSE_DELAY_MS = 120;

export interface HoverDisclosure<T extends HTMLElement> {
  /** Whether to render the panel. */
  open: boolean;
  /**
   * Goes on the positioned wrapper around *both* the button and the
   * panel. It's what an outside click is measured against, so a click
   * on either one counts as inside and doesn't dismiss.
   */
  ref: React.RefObject<T | null>;
  /** Spread onto the button. */
  buttonProps: {
    onClick: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    "aria-expanded": boolean;
  };
  /**
   * Spread onto the panel, so the pointer resting on the text it just
   * opened doesn't count as having left.
   */
  panelProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
}

export function useHoverDisclosure<
  T extends HTMLElement,
>(): HoverDisclosure<T> {
  const [hovering, setHovering] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef<T | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const enter = useCallback(() => {
    cancelClose();
    setHovering(true);
  }, [cancelClose]);

  const leave = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setHovering(false), CLOSE_DELAY_MS);
  }, [cancelClose]);

  // Unpinning also drops the hover, so the button can still dismiss its
  // own panel. Without that, clicking to close would do nothing visible
  // — the pointer is by definition still on the button that opened it.
  const click = useCallback(() => {
    setPinned((value) => {
      if (value) setHovering(false);
      return !value;
    });
  }, []);

  useEffect(() => cancelClose, [cancelClose]);

  useEffect(() => {
    if (!pinned) return;

    // `pointerdown` rather than `click`: a panel that outlives the press
    // and disappears on release reads as a missed click.
    const onPointerDown = (event: PointerEvent) => {
      const node = ref.current;
      if (node && !node.contains(event.target as Node)) {
        setPinned(false);
        setHovering(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPinned(false);
      setHovering(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pinned]);

  const open = hovering || pinned;

  return {
    open,
    ref,
    buttonProps: {
      onClick: click,
      onMouseEnter: enter,
      onMouseLeave: leave,
      "aria-expanded": open,
    },
    panelProps: { onMouseEnter: enter, onMouseLeave: leave },
  };
}
