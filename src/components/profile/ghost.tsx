import {
  GHOST_MARKS,
  type GhostMark,
  type GhostMarkId,
} from "./ghost-marks";

interface GhostBackgroundProps {
  /** Usually the owner's initials, e.g. "MW". */
  initials: string;
}

/** Rendered as the initials monogram rather than an SVG mark. */
const MONOGRAM = "monogram";

interface GhostRowSpec {
  /** Left to right, or right to left. Alternates down the page. */
  direction: "ltr" | "rtl";
  /** One full loop, in seconds. Staggered so rows never march in step. */
  duration: number;
  /** Mark height; also drives the gap between marks. */
  size: string;
  items: (GhostMarkId | typeof MONOGRAM)[];
}

/**
 * Five drifting bands behind the page, one mark each, alternating
 * direction down the page. Every mark is an unfilled hairline in
 * --ghost-stroke, so the whole background is one colour that follows the
 * theme.
 */
const ROWS: GhostRowSpec[] = [
  {
    direction: "ltr",
    duration: 95,
    size: "clamp(88px, 13vw, 150px)",
    items: [MONOGRAM],
  },
  {
    direction: "rtl",
    duration: 130,
    size: "clamp(78px, 11vw, 132px)",
    items: ["chelsea"],
  },
  {
    direction: "ltr",
    duration: 85,
    size: "clamp(74px, 10vw, 124px)",
    items: ["cards"],
  },
  {
    direction: "rtl",
    duration: 110,
    size: "clamp(84px, 12vw, 142px)",
    items: ["ski"],
  },
  {
    direction: "ltr",
    duration: 145,
    size: "clamp(80px, 11vw, 136px)",
    items: ["purdue"],
  },
];

/** Every mark used above, defined once and referenced with <use>. */
const USED_MARKS = [
  ...new Set(ROWS.flatMap((row) => row.items).filter((id) => id !== MONOGRAM)),
] as GhostMarkId[];

/**
 * A single pass has to be at least as wide as the viewport, or the loop
 * shows a bare stretch when the seam comes round. Marks cap at ~124-150px
 * with a matching gap, so twelve of them span ~3000px — past that the
 * sparsest row would need more.
 */
const MIN_MARKS_PER_PASS = 12;

function pass(items: GhostRowSpec["items"]): GhostRowSpec["items"] {
  const repeats = Math.ceil(MIN_MARKS_PER_PASS / items.length);
  return Array.from({ length: repeats }, () => items).flat();
}

export function GhostBackground({ initials }: GhostBackgroundProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 flex flex-col justify-around overflow-hidden text-(--ghost-stroke) select-none"
    >
      {/* Sprite sheet: each mark's geometry is emitted once, however many
          times it drifts past. */}
      <svg
        width="0"
        height="0"
        className="absolute"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      >
        <defs>
          {USED_MARKS.map((id) => {
            // Widened from the `as const` literal, which drops `opaque` on
            // the marks that don't declare it.
            const mark: GhostMark = GHOST_MARKS[id];
            return (
              <symbol key={id} id={`ghost-${id}`} viewBox={mark.viewBox}>
                {mark.d.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    vectorEffect="non-scaling-stroke"
                    // Opaque paths are filled with the page background so
                    // they hide what they overlap — without it the cards
                    // read as two outlines crossing, not a stack.
                    style={
                      mark.opaque?.includes(i) ? { fill: "var(--bg)" } : undefined
                    }
                  />
                ))}
              </symbol>
            );
          })}
        </defs>
      </svg>

      {ROWS.map((row, index) => (
        <div key={index} className="flex w-full">
          <div
            className="flex w-max shrink-0 items-center"
            style={{
              gap: `calc(${row.size} * 1.1)`,
              paddingRight: `calc(${row.size} * 1.1)`,
              animation: `ghost-drift-${row.direction} ${row.duration}s linear infinite`,
              willChange: "transform",
            }}
          >
            {/* Two identical passes: the track scrolls exactly half its
                width, so the seam never lands in view. */}
            {[0, 1].map((copy) =>
              pass(row.items).map((id, i) => (
                <Mark
                  key={`${copy}-${i}-${id}`}
                  id={id}
                  size={row.size}
                  initials={initials}
                />
              )),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Mark({
  id,
  size,
  initials,
}: {
  id: GhostMarkId | typeof MONOGRAM;
  size: string;
  initials: string;
}) {
  if (id === MONOGRAM) {
    return (
      <span
        className="font-bold whitespace-nowrap text-transparent [-webkit-text-stroke:1.5px_var(--ghost-stroke)]"
        style={{ fontSize: `calc(${size} * 1.15)`, lineHeight: 1 }}
      >
        {initials}
      </span>
    );
  }

  const { viewBox } = GHOST_MARKS[id];
  const [, , vw, vh] = viewBox.split(" ").map(Number);

  return (
    <svg
      // Height is fixed per row; width follows the mark's own aspect ratio
      // so wide marks (the Purdue P) aren't squashed into a square.
      style={{ height: size, width: `calc(${size} * ${vw / vh})` }}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <use href={`#ghost-${id}`} />
    </svg>
  );
}
