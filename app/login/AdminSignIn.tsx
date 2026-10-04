"use client";

import { useState } from "react";
import { useActionState } from "react";
import { AlertCircle, Shield } from "lucide-react";
import { ICON } from "@/lib/icons";
import { signInAsAdmin, type AdminState } from "@/app/actions/auth";

/**
 * Interim committee sign-in, hidden behind a code. Before this, the button
 * granted full admin rights to anyone who tapped it — fine on a laptop,
 * unacceptable on a public link. Retired once Google sign-in lands.
 */
export function AdminSignIn() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    signInAsAdmin,
    {}
  );

  if (!open) {
    return (
      // Quiet on purpose. Five of the 452 need this door; for everyone else it
      // must not read as a second way in, competing with the button above it.
      // Still underlined, and still a full 44px to hit.
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 text-xs font-medium text-ink-faint underline underline-offset-2"
      >
        <Shield size={ICON.xs} className="shrink-0" />
        Committee sign-in
      </button>
    );
  }

  return (
    <form action={formAction} className="card p-4">
      <p className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold">
        <Shield size={ICON.sm} />
        Committee sign-in
      </p>

      <label htmlFor="code" className="label">
        Access code
      </label>
      {/* The form opens below the fold on a phone, so without this the tap
          looks like it did nothing. Focusing the field scrolls it into view
          and opens the keyboard, which is what was asked for anyway. */}
      {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
      <input
        id="code"
        name="code"
        type="password"
        autoComplete="off"
        autoFocus
        required
        placeholder="Enter the committee code"
        aria-invalid={state.error ? true : undefined}
        className="field"
      />

      {state.error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-danger">
          <AlertCircle size={ICON.sm} className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn btn-ghost flex-1"
        >
          Cancel
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary flex-[2]">
          {pending ? "Checking…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
