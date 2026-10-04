"use client";

import { Check, Undo2 } from "lucide-react";
import { ICON } from "@/lib/icons";
import { resolveIssue, undoChange } from "@/app/actions/data";
import { SubmitButton } from "./SubmitButton";

/** Marks an imported-data problem as dealt with, without changing the record. */
export function ResolveIssueButton({ issueId }: { issueId: string }) {
  return (
    <form action={resolveIssue.bind(null, issueId)}>
      <SubmitButton pendingLabel="Working…" className="btn btn-ghost">
        <Check size={ICON.sm} />
        Mark done
      </SubmitButton>
    </form>
  );
}

export function UndoButton({ changeId }: { changeId: string }) {
  return (
    <form
      action={undoChange.bind(null, changeId)}
      onSubmit={(event) => {
        if (!window.confirm("Undo this change and restore the previous values?")) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton
        aria-label="Undo this change"
        className="btn btn-ghost shrink-0 px-3"
      >
        <Undo2 size={ICON.sm} />
      </SubmitButton>
    </form>
  );
}
