"use client";

import { usePathname } from "next/navigation";

/**
 * Gives every navigation a single, coherent entrance.
 *
 * Keying on the pathname restarts the animation on each route change, so a
 * screen arrives as one piece. Animating individual sections instead produced
 * the worst of both worlds — a header fading in above content that was already
 * solid.
 *
 * Transform and opacity only, so it composites on the GPU and stays smooth on
 * the mid-range Android phones most members use. Disabled entirely under
 * prefers-reduced-motion by the rule in globals.css.
 */
export function ScreenTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="screen-enter">
      {children}
    </div>
  );
}
