"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { ICON } from "@/lib/icons";
import { verifyMobile, chooseIdentity, type VerifyState } from "@/app/actions/auth";

export function VerifyForm() {
  const [state, formAction, pending] = useActionState<VerifyState, FormData>(
    verifyMobile,
    {}
  );

  // Husbands and wives often share a number, so ask which one they are
  if (state.candidates?.length) {
    return (
      <div className="mt-6">
        <p className="mb-3 text-sm font-semibold">
          That number is shared by {state.candidates.length} members. Which one are
          you?
        </p>
        <div className="space-y-2">
          {state.candidates.map((c) => (
            <form key={c.id} action={chooseIdentity}>
              <input type="hidden" name="personId" value={c.id} />
              <button
                type="submit"
                className="card flex w-full items-center justify-between px-4 py-3 text-left transition-colors active:bg-kesar-mist"
              >
                <span>
                  <span className="block font-semibold">{c.name}</span>
                  <span className="block text-xs text-ink-soft">{c.household}</span>
                </span>
                <ArrowRight size={ICON.md} className="text-ink-soft" />
              </button>
            </form>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6">
      <label htmlFor="mobile" className="label">
        Your mobile number
      </label>
      <div className="flex items-center gap-2">
        <span className="tnum flex h-11 shrink-0 items-center rounded-inner bg-kesar-mist px-3 text-sm font-semibold text-ink-soft">
          +91
        </span>
        <input
          id="mobile"
          name="mobile"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={14}
          required
          placeholder="98765 43210"
          aria-describedby={state.error ? "mobile-error" : "mobile-help"}
          aria-invalid={state.error ? true : undefined}
          className="field tnum flex-1 text-lg tracking-wide"
        />
      </div>

      <p id="mobile-help" className="mt-1.5 text-2xs text-ink-faint">
        The number the committee has for you in the directory.
      </p>

      {state.error && (
        <p
          id="mobile-error"
          role="alert"
          className="mt-2 flex items-start gap-1.5 text-sm text-danger"
        >
          <AlertCircle size={ICON.sm} className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary mt-4 w-full">
        {pending ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}
