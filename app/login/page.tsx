import type { Viewport } from "next";
import { redirect } from "next/navigation";
import { AlertCircle, Lock, Users } from "lucide-react";
import { getSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { ICON } from "@/lib/icons";
import { AdminSignIn } from "./AdminSignIn";
import { GoogleSignIn } from "./GoogleSignIn";

/**
 * The page is cream whatever the phone is set to, so the browser chrome has to
 * be told the same thing — otherwise a dark status bar sits on a cream page.
 */
export const viewport: Viewport = { themeColor: "#fdf8f1" };

/** Anything that can go wrong on the round trip to Google, said plainly. */
const SIGN_IN_ERRORS: Record<string, string> = {
  cancelled: "Sign-in was cancelled. Tap the button to try again.",
  failed: "Google sign-in didn't complete. Please try again.",
  config: "Sign-in is not configured yet. Please tell the committee.",
};

/**
 * The one screen every member sees before they see anything else.
 *
 * It reads top to bottom in a single unbroken run — mark, welcome, what the
 * app is for, how big the samaj already is, then the button. An earlier
 * version centred the top half and pinned the button to the bottom, which
 * opened a hole in the middle of the page on a tall phone and cost the run its
 * momentum. Whatever slack a screen has now falls below the button, where
 * empty space costs nothing.
 *
 * The size of the directory used to sit in 11px grey under the committee link,
 * which is the least prominent spot on the page for the most reassuring fact
 * on it. It now sits directly above the button it is meant to justify.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session.isSignedIn) redirect("/");

  const [db, { error }] = await Promise.all([getDb(), searchParams]);
  const message = error ? SIGN_IN_ERRORS[error] ?? SIGN_IN_ERRORS.failed : null;

  return (
    <main
      className="on-cream mx-auto flex min-h-dvh max-w-md flex-col px-6"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 3rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)",
      }}
    >
      {/* The samaj's logo carries the samaj's name; the app's name is set
          beneath it in the serif that names people and families throughout.
          The logo's accessible name says what its lettering says. */}
      <h1 className="text-center">
        <span
          role="img"
          aria-label="Shri Jain Shwetambar (Murtipujak) Marwadi Samaj, Indore"
          className="lockup mx-auto block w-full max-w-[10.5rem]"
        />
        <span className="mt-4 block font-serif text-tab-title font-semibold tracking-[-0.01em] text-ink">
          Sadharmik
        </span>
      </h1>

      <p className="mx-auto mt-6 max-w-[19rem] text-center text-sm leading-relaxed text-ink-soft">
        Our own member directory. Find any member, see what they do, and never
        miss a birthday or anniversary.
      </p>

      {/* The samaj's own size, said once and said where it counts: the last
          thing read before the button. Members recognise these numbers. */}
      <p className="mx-auto mt-8 max-w-[19rem] text-center text-caption text-ink-soft">
        <Users
          size={ICON.xs}
          className="mr-1.5 inline-block -translate-y-px text-kesar-deep"
        />
        <strong className="tnum font-semibold text-ink">
          {db.people.length}
        </strong>{" "}
        members in{" "}
        <strong className="tnum font-semibold text-ink">
          {db.households.length}
        </strong>{" "}
        households
      </p>

      <div className="mt-8">
        {message && (
          <p
            role="alert"
            className="mb-3 flex items-start gap-1.5 rounded-inner bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            <AlertCircle size={ICON.sm} className="mt-0.5 shrink-0" />
            {message}
          </p>
        )}

        <GoogleSignIn />

        <p className="mx-auto mt-4 max-w-[18rem] text-center text-caption leading-relaxed text-ink-soft">
          The first time, you&apos;ll enter your mobile number once so we can
          find your profile.
        </p>
      </div>

      {/* The promise that matters to somebody being asked for their Google
          account. It is the same promise the Me tab makes, made earlier. */}
      <p className="mx-auto mb-9 mt-7 max-w-[12.5rem] text-center text-xs leading-relaxed text-ink-faint">
        <Lock size={ICON.xs} className="mr-1.5 inline-block -translate-y-px" />
        Private to samaj members. Nothing here is public.
      </p>

      {/* Five people on a committee of 452 need this; everyone else needs it
          out of the way of the button. Below the fold of the decision, in the
          quietest type on the page. */}
      <div className="mt-auto border-t border-line-soft pt-4">
        <AdminSignIn />
      </div>
    </main>
  );
}
