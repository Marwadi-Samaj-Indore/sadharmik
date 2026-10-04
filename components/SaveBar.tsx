"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { ICON } from "@/lib/icons";

/**
 * Sticky save footer. Uses the parent form's pending state so the button
 * disables itself while the change is being written.
 */
export function SaveBar({
  cancelHref,
  label = "Save changes",
}: {
  cancelHref: string;
  label?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <div
      className="sticky bottom-0 z-20 mt-8 -mx-4 border-t border-line-soft bg-cream/95 px-4 py-3 backdrop-blur-sm"
      style={{ marginBottom: "calc(-0.25rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex gap-2">
        <Link href={cancelHref} className="btn btn-ghost flex-1">
          Cancel
        </Link>
        <button type="submit" disabled={pending} className="btn btn-primary flex-[2]">
          <Check size={ICON.sm} />
          {pending ? "Saving…" : label}
        </button>
      </div>
      <p className="mt-2 text-center text-2xs text-ink-faint">
        Changes appear to all members immediately.
      </p>
    </div>
  );
}
