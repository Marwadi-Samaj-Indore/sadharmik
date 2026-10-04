"use client";

import { Trash2 } from "lucide-react";
import { ICON } from "@/lib/icons";
import { removeCircular } from "@/app/actions/circulars";
import { SubmitButton } from "./SubmitButton";

export function RemoveCircularButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={removeCircular.bind(null, id)}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Take down "${title}"? Members will no longer be able to read or save it.`
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton
        aria-label={`Remove the circular "${title}"`}
        className="flex h-11 w-11 items-center justify-center rounded-chip text-ink-faint transition-colors active:bg-danger-soft active:text-danger"
      >
        <Trash2 size={ICON.sm} />
      </SubmitButton>
    </form>
  );
}
