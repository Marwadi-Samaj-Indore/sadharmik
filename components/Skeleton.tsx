/**
 * Loading placeholders.
 *
 * These matter more than they look. Without them a member taps Directory and
 * stares at a blank cream screen, then the whole page slams in at once — which
 * reads as a glitch even when it's fast. A skeleton that matches the real
 * layout means the page appears to fill in rather than jump.
 *
 * Shapes deliberately mirror the true content, so nothing shifts when the data
 * lands.
 */

export function SkeletonLine({
  w = "100%",
  h = "0.75rem",
  className = "",
}: {
  w?: string;
  h?: string;
  className?: string;
}) {
  return <div className={`skeleton ${className}`} style={{ width: w, height: h }} />;
}

export function SkeletonTitle() {
  return (
    <header className="px-4 pt-5 pb-3">
      <SkeletonLine w="7rem" h="0.8rem" />
      <SkeletonLine w="12rem" h="1.6rem" className="mt-2.5" />
    </header>
  );
}

/** A person or household row, matching the real list item's geometry. */
export function SkeletonRow() {
  return (
    <div className="card flex items-center gap-3.5 p-3">
      <div className="skeleton h-14 w-14 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <SkeletonLine w="60%" h="0.95rem" />
        <SkeletonLine w="40%" h="0.7rem" className="mt-2" />
      </div>
    </div>
  );
}

/** The sticky letter landmark above a directory group. */
export function SkeletonLetter() {
  return (
    <div className="px-5 pb-1 pt-3">
      <SkeletonLine w="0.75rem" h="0.85rem" />
    </div>
  );
}

export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <ul className="space-y-2 px-4">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <SkeletonRow />
        </li>
      ))}
    </ul>
  );
}

/** Birthday / announcement card on the Home screen. */
export function SkeletonCard() {
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-3">
        <div className="skeleton h-16 w-16 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <SkeletonLine w="5rem" h="0.65rem" />
          <SkeletonLine w="70%" h="0.95rem" className="mt-2" />
          <SkeletonLine w="50%" h="0.7rem" className="mt-2" />
        </div>
      </div>
      <SkeletonLine h="2.75rem" className="mt-3 rounded-chip" />
    </div>
  );
}

export function SkeletonSearchBar() {
  return (
    <div className="px-4">
      <SkeletonLine h="2.75rem" className="rounded-chip" />
    </div>
  );
}
