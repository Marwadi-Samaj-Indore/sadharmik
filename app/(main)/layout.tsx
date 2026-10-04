import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { Suspense } from "react";
import { BottomNav } from "@/components/BottomNav";
import { ScreenTransition } from "@/components/ScreenTransition";
import { SaveToast } from "@/components/SaveToast";
import { WelcomeSheet } from "@/components/WelcomeSheet";

export default async function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session.isSignedIn) redirect("/login");

  // Anything posted in the last week counts as unread for the tab badge.
  // Becomes a real per-member "last seen" timestamp once there's a database.
  const db = await getDb();
  const weekAgo = Date.now() - 7 * 86400000;
  const feedBadge = [...db.announcements, ...db.requirements].filter(
    (p) => new Date(p.createdAt).getTime() > weekAgo
  ).length;

  return (
    <div
      className="safe-x mx-auto min-h-dvh max-w-2xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Hidden until focused — lets a keyboard or switch-control user jump
          past the navigation straight to the screen's content */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-chip focus:bg-kesar-deep focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      {/* Bottom padding clears the fixed nav so content is never hidden behind it */}
      <main id="main" className="pb-28">
        <ScreenTransition>{children}</ScreenTransition>
      </main>
      <Suspense fallback={null}>
        <SaveToast />
      </Suspense>
      <BottomNav feedBadge={feedBadge} />
      {/* Inside this layout, so it only ever greets a signed-in member —
          never someone still on the login screen. It mounts once per app
          launch; switching tabs is a client navigation and leaves it alone. */}
      <WelcomeSheet />
    </div>
  );
}
