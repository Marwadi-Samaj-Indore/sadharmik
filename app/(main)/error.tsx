"use client";

import { useEffect } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { ICON } from "@/lib/icons";

/**
 * Recovery screen.
 *
 * A momentary database hiccup previously dumped a raw stack trace on the
 * screen. For a directory used by 400 mostly non-technical members, that reads
 * as "the app is broken" when the truth is usually "try again in a second".
 */
export default function ErrorScreen({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Sadharmik — screen failed to load:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-kesar-pale">
        <WifiOff size={ICON.xxl} className="text-kesar-ink" />
      </span>

      <h1 className="mt-5 text-title">This didn&apos;t load</h1>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
        Something went wrong fetching the directory. It&apos;s usually a brief
        connection problem — trying again normally fixes it.
      </p>

      <button type="button" onClick={reset} className="btn btn-primary mt-6 w-full">
        <RefreshCw size={ICON.sm} />
        Try again
      </button>

      <a href="/" className="btn btn-ghost mt-2 w-full">
        Go to Home
      </a>

      {error.digest && (
        <p className="mt-6 text-2xs text-ink-faint">
          If it keeps happening, tell the committee this code:{" "}
          <span className="tnum font-semibold">{error.digest}</span>
        </p>
      )}
    </main>
  );
}
