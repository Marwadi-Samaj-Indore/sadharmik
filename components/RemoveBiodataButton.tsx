"use client";

import { Trash2 } from "lucide-react";
import { ICON } from "@/lib/icons";
import { removeBiodata } from "@/app/actions/biodata";
import { SubmitButton } from "./SubmitButton";

/**
 * A biodata is personal, so taking it down must be as easy as putting it up —
 * one tap, visible right on the entry, for whoever shared it (or an admin).
 */
export function RemoveBiodataButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={removeBiodata.bind(null, id)}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Remove the matrimonial profile for ${name}? Members will no longer be able to see or download it.`
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton
        aria-label={`Remove ${name}'s matrimonial profile`}
        className="flex h-11 w-11 items-center justify-center rounded-chip text-ink-faint transition-colors active:bg-danger-soft active:text-danger"
      >
        <Trash2 size={ICON.sm} />
      </SubmitButton>
    </form>
  );
}
