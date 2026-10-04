"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X, Users, Briefcase, CalendarDays, UserRound, ArrowRight } from "lucide-react";
import { ICON } from "@/lib/icons";

/**
 * The welcome sheet a signed-in member sees when the app opens.
 *
 * It shows every time rather than once a day: the committee wants it to read
 * as the app's front door, not as a notice to be got past. That only survives
 * repetition if it is genuinely quick to dismiss and useful when it isn't —
 * hence four routes straight into the app rather than a picture to close.
 *
 * Deliberately built from type and the group's own mark instead of the printed
 * poster. A full-bleed JPEG can't be read at phone size, doesn't follow the
 * member into dark mode, and gives them nothing to tap.
 */
const ROWS = [
  {
    href: "/directory",
    icon: Users,
    title: "Directory",
    detail: "Every family, one search",
  },
  {
    href: "/business",
    icon: Briefcase,
    title: "Business",
    detail: "Find and be found",
  },
  {
    href: "/feed?tab=meetings",
    icon: CalendarDays,
    title: "Meetings",
    detail: "See who's coming",
  },
  {
    href: "/me",
    icon: UserRound,
    title: "Your profile",
    detail: "Keep your details current",
  },
];

export function WelcomeSheet() {
  // Starts closed and opens from an effect, so the server-rendered markup and
  // the first client render agree.
  const [open, setOpen] = useState(false);
  const enterRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // Stop the page behind scrolling while the sheet is up
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    enterRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    // A fixed black scrim rather than a token: --color-ink flips light in dark
    // mode, which would wash the backdrop out instead of dimming it.
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-5 backdrop-blur-md"
      style={{ animation: "fade-in var(--dur-base) linear both" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        onClick={(e) => e.stopPropagation()}
        className="rise relative max-h-full w-full max-w-[22rem] overflow-y-auto rounded-[1.75rem] bg-surface p-6 shadow-[var(--shadow-float)]"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-cream-deep text-ink-soft transition-transform active:scale-90"
        >
          <X size={ICON.sm} />
        </button>

        <div className="pt-3 text-center">
          {/* The samaj's logo, then the app's name beneath it — the artwork
              carries the samaj's name in Devanagari but not "Sadharmik". */}
          <h2 id="welcome-title">
            <span
              role="img"
              aria-label="Shri Jain Shwetambar (Murtipujak) Marwadi Samaj, Indore"
              className="lockup-plain mx-auto block w-full max-w-[7.5rem]"
            />
            <span className="mt-3 block font-serif text-title font-semibold tracking-[-0.01em]">
              Sadharmik
            </span>
          </h2>
          <p className="mt-1.5 text-sm text-ink-soft">
            Every family in the samaj, in one place.
          </p>
        </div>

        <ul className="mt-6 space-y-1">
          {ROWS.map((row) => (
            <li key={row.href}>
              <Link
                href={row.href}
                onClick={() => setOpen(false)}
                className="card-tap -mx-2 flex items-center gap-3.5 rounded-inner px-2 py-2.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.8rem] bg-kesar-mist text-kesar-text">
                  <row.icon size={ICON.md} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold leading-snug">
                    {row.title}
                  </span>
                  <span className="block text-caption leading-snug text-ink-faint">
                    {row.detail}
                  </span>
                </span>
                <ArrowRight size={ICON.sm} className="shrink-0 text-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>

        <button
          ref={enterRef}
          type="button"
          onClick={() => setOpen(false)}
          className="btn btn-primary mt-6 w-full"
        >
          Enter the app
        </button>
      </div>
    </div>
  );
}
