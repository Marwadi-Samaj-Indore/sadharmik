"use client";

import Link from "next/link";
import { useEffect, useRef, type ComponentProps, type MouseEvent } from "react";

/**
 * The shared-element transition: a tapped avatar grows into the profile hero
 * instead of cutting.
 *
 * The View Transitions API wants same-document navigation, and App Router
 * navigations stream server components in on their own schedule — wrapping
 * router.push in startViewTransition stalls on that unpredictability. So this
 * is classic FLIP with sessionStorage as the courier between routes:
 *
 *   1. Tapping a row records the avatar's viewport rect under one key.
 *   2. The destination hero mounts, finds the key, paints a clone of itself
 *      at the recorded rect, and animates transform-only to its real place.
 *
 * The real element sits underneath throughout, so every failure mode — a
 * stale key, a mid-flight resize, sessionStorage denied — degrades to
 * exactly the old behaviour: a plain cut. The clone reuses the same photo
 * URL the list already loaded, so it can never flash empty.
 *
 * Reduced motion is a real alternate path, not a shorter tween: the key is
 * written but never read, and the profile simply appears.
 */

const KEY = "sdm-flip";
/** A tap older than this is a back-navigation or a reload, not a transition. */
const FRESH_MS = 3000;

interface FlipRecord {
  id: string;
  t: number;
  rect: { top: number; left: number; width: number; height: number };
}

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Call from a row's onClick. Finds the avatar inside the tapped card. */
export function recordFlip(e: MouseEvent<HTMLElement>, id: string) {
  const avatar = e.currentTarget.querySelector("[data-avatar]");
  if (!avatar) return;
  const r = avatar.getBoundingClientRect();
  const record: FlipRecord = {
    id,
    t: Date.now(),
    rect: { top: r.top, left: r.left, width: r.width, height: r.height },
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // Storage denied means no transition, never no navigation
  }
}

/** A Link whose tap records the avatar it contains as the flip source. */
export function FlipLink({
  flipId,
  onClick,
  ...rest
}: ComponentProps<typeof Link> & { flipId: string }) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        recordFlip(e, flipId);
        onClick?.(e);
      }}
    />
  );
}

/**
 * Wraps the destination hero avatar. When a matching flip record exists, the
 * hero animates from the tapped rect into place.
 */
export function FlipTarget({
  flipId,
  className = "",
  children,
}: {
  flipId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let settle: (() => void) | null = null;
    let cancelled = false;
    let record: FlipRecord | null = null;

    // Everything — including reading the record — waits for a frame. Dev
    // StrictMode mounts, cleans up and remounts effects synchronously; doing
    // work inline meant the first invocation consumed the record and its
    // cleanup destroyed the clone, leaving the replay with nothing. The
    // cleanup cancels the rAF, so only the invocation that survives to a
    // real frame ever consumes anything.
    const start = () => {
      try {
        const raw = sessionStorage.getItem(KEY);
        if (raw) record = JSON.parse(raw);
        sessionStorage.removeItem(KEY);
      } catch {
        return;
      }
      if (!record || record.id !== flipId) return;
      if (Date.now() - record.t > FRESH_MS) return;
      if (reducedMotion()) return;

      const img = el.querySelector("img");
      if (!img || img.complete) {
        begin();
      } else {
        const cap = setTimeout(() => {
          cancelled = true;
        }, 400);
        img
          .decode()
          .then(() => {
            clearTimeout(cap);
            begin();
          })
          .catch(() => clearTimeout(cap));
      }
    };

    const begin = () => {
      if (cancelled) return;
      const target = el.getBoundingClientRect();
      if (!target.width || !record!.rect.width) return;

      const clone = el.cloneNode(true) as HTMLElement;
      // Lets tooling (scripts/record-flip.mjs) find the in-flight clone
      clone.dataset.flipClone = "";
      Object.assign(clone.style, {
        position: "fixed",
        top: `${target.top}px`,
        left: `${target.left}px`,
        width: `${target.width}px`,
        height: `${target.height}px`,
        margin: "0",
        zIndex: "70",
        pointerEvents: "none",
        transformOrigin: "top left",
        willChange: "transform",
      });

      const dx = record!.rect.left - target.left;
      const dy = record!.rect.top - target.top;
      const scale = record!.rect.width / target.width;

      document.body.appendChild(clone);
      el.style.visibility = "hidden";

      settle = () => {
        el.style.visibility = "";
        clone.remove();
      };
      const animation = clone.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
          { transform: "none" },
        ],
        { duration: 340, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
      animation.finished.then(settle, settle);
    };

    // A clone of an image that hasn't decoded yet flies as an empty circle
    // and the photo pops in at the end — worse than no transition, hence the
    // decode wait in start(). Past 400ms the profile simply appears: on a
    // slow connection a late animation reads as the app stuttering.
    const raf = requestAnimationFrame(start);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      settle?.();
    };
  }, [flipId]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
