/**
 * What a tab shows the instant it is clicked.
 *
 * Every page under the team-matching root is rendered on request, and
 * without this the click did nothing visible until the server had
 * answered: the strip stayed on the old tab and the reader clicked
 * again. With it, the router switches tabs at once and draws this in the
 * content column while the page streams in; the shell around it is
 * untouched, so the tab strip is already showing the new tab as active.
 *
 * Shaped like the page it stands in for — a search field and a few
 * results — so the swap is a fill rather than a jump.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="animate-pulse motion-reduce:animate-none"
    >
      <div className="h-11 w-full max-w-xl rounded-full bg-[#e8eaed]" />
      <div className="mt-10 space-y-8">
        {[0, 1, 2].map((row) => (
          <div key={row} className="space-y-2.5">
            <div className="h-3 w-40 rounded bg-[#e8eaed]" />
            <div className="h-5 w-3/4 rounded bg-[#e8eaed]" />
            <div className="h-3 w-full rounded bg-[#e8eaed]" />
            <div className="h-3 w-5/6 rounded bg-[#e8eaed]" />
          </div>
        ))}
      </div>
    </div>
  );
}
