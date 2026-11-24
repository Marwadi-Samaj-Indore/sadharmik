import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./session";

/**
 * The sign-in gate. EVERY page under app/(main) calls this first.
 *
 * The (main) layout checks too, but a layout check is not a gate: Next.js
 * renders only the segments a navigation changes, decided from headers the
 * client sends, so a crafted request that claims the layout is already on
 * screen gets the page rendered without the layout running — on 24 Nov 2026
 * that returned the whole directory to a visitor with no cookie. The page
 * itself always runs, so the check lives here.
 *
 * (middleware.ts would be the natural single gate, but with Next.js 15.5.29
 * any middleware made the Vercel deployment fail; see CLAUDE.md.) Forgetting
 * this call is caught by scripts/check-guards.mjs, which `npm run typecheck`
 * runs.
 */
export async function requireMember() {
  const session = await getSession();
  if (!session.isSignedIn) redirect("/login");
  return session;
}
