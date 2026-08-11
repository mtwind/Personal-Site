"use client";

import { useSyncExternalStore } from "react";

import {
  dayKey,
  doodleForKey,
  NO_DAY,
  type Doodle,
} from "@/lib/match-doodle";
import { GOOGLE_DOTS } from "./match-shell";

/** Nothing to subscribe to: the date doesn't change while you look. */
const staticSource = () => () => {};

/**
 * The four dots — or, on a day that has one, a doodle in their place.
 *
 * The day is read as an external value rather than rendered directly,
 * because it belongs to the reader's clock: rendering it on the server
 * would pin the date to whatever timezone the server thinks it is in,
 * and then disagree with the browser on hydration. The server snapshot
 * is "no day", so the first paint everywhere is the plain four dots.
 */
export function useDoodle(): Doodle | null {
  const today = useSyncExternalStore(
    staticSource,
    () => dayKey(),
    () => NO_DAY,
  );
  return doodleForKey(today);
}

interface DoodleMarkProps {
  /** Diameter of one dot, in pixels; the doodle scales with it. */
  size?: number;
  className?: string;
}

export function DoodleMark({ size = 10, className = "" }: DoodleMarkProps) {
  const doodle = useDoodle();

  if (doodle) {
    return (
      <span
        className={`inline-flex items-center leading-none ${className}`}
        style={{ fontSize: size * 2.2 }}
        title={doodle.title}
        role="img"
        aria-label={doodle.title}
      >
        {doodle.art}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-hidden>
      {GOOGLE_DOTS.map((color) => (
        <span
          key={color}
          className="rounded-full"
          style={{ background: color, width: size, height: size }}
        />
      ))}
    </span>
  );
}
