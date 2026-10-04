import type { Viewport } from "next";
import { redirect } from "next/navigation";
import { getSession, googleEmail } from "@/lib/session";
import { GOOGLE_SIGN_IN } from "@/lib/signin";
import { VerifyForm } from "./VerifyForm";

/** Cream page, cream chrome — same reason as the sign-in screen before it. */
export const viewport: Viewport = { themeColor: "#fdf8f1" };

export default async function VerifyPage() {
  const session = await getSession();
  if (session.isSignedIn) redirect("/");

  // Google comes first, always. Reaching the gate without having proved an
  // address means a stale link or a bookmark from the old flow — start over
  // rather than offering a way in that skips a required step.
  // With Google off, the mobile form lives on the sign-in page itself
  if (!GOOGLE_SIGN_IN) redirect("/login");
  const proven = await googleEmail();
  if (!proven) redirect("/login");

  return (
    // Cream like the screen before it — the way in is one continuous room,
    // not a cream door opening onto a dark hall.
    <main
      className="on-cream mx-auto flex min-h-dvh max-w-md flex-col px-6"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex flex-1 flex-col justify-center pb-10">
        <h1 className="text-3xl">Which one are you?</h1>
        <p className="mt-2 text-caption leading-relaxed text-ink-soft">
          Signed in as <span className="font-semibold text-ink">{proven}</span>.
          Enter your mobile number so we can find your profile in the directory. You
          only need to do this once. After that you&apos;ll be recognised
          automatically.
        </p>

        <VerifyForm />

        <p className="mt-8 rounded-inner bg-kesar-mist px-4 py-3 text-2xs leading-relaxed text-ink-soft">
          Can&apos;t get in? Your number may not be in the directory yet, or it may be
          recorded differently. Ask a committee member to check your entry.
        </p>
      </div>
    </main>
  );
}
