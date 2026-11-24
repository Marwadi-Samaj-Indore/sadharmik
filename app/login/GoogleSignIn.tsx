"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { ICON } from "@/lib/icons";

/**
 * Hands the member to Google and asks to come back at /auth/callback.
 *
 * The return address is built from the window's own origin rather than a
 * configured site URL, so the same build works on localhost, the test link and
 * pmconnect.in without anyone remembering to change a variable. Supabase still
 * refuses any origin that isn't in its redirect allow-list, so this is
 * convenience, not a hole.
 *
 * The anon key used here is public by design: with RLS on and no policies, it
 * can read nothing. It is only the ticket to Supabase's auth endpoint.
 */
/**
 * The Supabase client is ~70 KB and is needed only for the moment the button
 * is pressed, so it is fetched then rather than with the page: the sign-in
 * screen is the first thing every member loads, often on mobile data.
 * Pressing down starts the download, so it has usually arrived by the time
 * the tap completes.
 */
const loadSupabase = () => import("@supabase/ssr");

export function GoogleSignIn() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signIn() {
    setError(null);
    setPending(true);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      setError("Sign-in is not configured yet. Please tell the committee.");
      setPending(false);
      return;
    }

    const { createBrowserClient } = await loadSupabase();
    const supabase = createBrowserClient(url, anonKey);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    // Success navigates away, so reaching here at all means it failed
    if (oauthError) {
      setError("Google sign-in could not start. Please try again.");
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onPointerDown={() => void loadSupabase()}
        onClick={signIn}
        disabled={pending}
        className="btn btn-primary w-full"
      >
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-2 flex items-start justify-center gap-1.5 text-sm text-danger"
        >
          <AlertCircle size={ICON.sm} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </>
  );
}
