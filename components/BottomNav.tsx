"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Briefcase, Megaphone, User } from "lucide-react";
import { ICON } from "@/lib/icons";

const TABS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/directory",
    label: "Directory",
    icon: Users,
    match: (p: string) =>
      p.startsWith("/directory") || p.startsWith("/household") || p.startsWith("/person"),
  },
  {
    href: "/business",
    label: "Business",
    icon: Briefcase,
    match: (p: string) => p.startsWith("/business"),
  },
  {
    href: "/feed",
    label: "Feed",
    icon: Megaphone,
    match: (p: string) => p.startsWith("/feed"),
  },
  {
    href: "/me",
    label: "Me",
    icon: User,
    match: (p: string) => p.startsWith("/me") || p.startsWith("/admin"),
  },
] as const;

export function BottomNav({ feedBadge = 0 }: { feedBadge?: number }) {
  const pathname = usePathname();
  const realIndex = TABS.findIndex((tab) => tab.match(pathname));

  /**
   * The tab lights up the instant it is tapped, instead of waiting for the
   * server to respond. Previously the pill only moved once the new route had
   * loaded, so a tap looked ignored for a few hundred milliseconds — the
   * single thing that made navigation feel broken on a real phone.
   */
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  // Once the route catches up, hand control back to the real pathname
  useEffect(() => {
    setPendingIndex(null);
  }, [pathname]);

  const activeIndex = pendingIndex ?? realIndex;

  return (
    <nav
      aria-label="Main"
      className="bar-blur fixed inset-x-0 bottom-0 z-40 border-t border-line-soft"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="safe-x relative mx-auto max-w-2xl px-2">
        {/* One pill that slides between tabs, rather than five that blink on and
            off. The movement is what tells you where you came from. */}
        {activeIndex >= 0 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2 h-9 rounded-chip bg-kesar-pale transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)]"
            style={{
              width: `calc((100% - 1rem) / ${TABS.length})`,
              left: "0.5rem",
              transform: `translateX(${activeIndex * 100}%) scaleX(0.62)`,
            }}
          />
        )}

        <ul className="relative flex items-stretch justify-around">
          {TABS.map((tab, index) => {
            const active = index === activeIndex;
            const Icon = tab.icon;
            const showBadge = tab.href === "/feed" && feedBadge > 0;

            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  prefetch
                  onClick={() => setPendingIndex(index)}
                  aria-current={tab.match(pathname) ? "page" : undefined}
                  className="flex min-h-[3.5rem] flex-col items-center justify-center gap-1 py-2"
                >
                  <span className="relative flex h-9 w-14 items-center justify-center">
                    <Icon
                      size={ICON.lg}
                      strokeWidth={active ? 2.4 : 1.9}
                      className={`transition-all duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] ${
                        active
                          ? "-translate-y-px scale-105 text-kesar-ink"
                          : "text-ink-soft"
                      }`}
                    />
                    {showBadge && (
                      <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-birthday px-1 text-[0.625rem] font-bold tabular-nums text-on-birthday shadow-[var(--shadow-rest)]">
                        {feedBadge > 9 ? "9+" : feedBadge}
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-2xs leading-none transition-colors duration-200 ${
                      active ? "font-semibold text-kesar-ink" : "text-ink-soft"
                    }`}
                  >
                    {tab.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
