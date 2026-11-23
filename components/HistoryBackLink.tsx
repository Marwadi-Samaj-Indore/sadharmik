"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * A back link that steps back through the browser's history rather than
 * opening `href` afresh, so the screen behind comes back exactly as it was
 * left — filters set, scrolled to the same row. Used where the previous
 * screen holds state a fresh visit would lose (the matrimony list).
 *
 * With nothing to go back to (the profile was opened from a shared link),
 * it falls through to `href` like an ordinary link.
 */
export function HistoryBackLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Link
      href={href}
      aria-label="Go back"
      className={className}
      onClick={(e) => {
        if (window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
    >
      {children}
    </Link>
  );
}
