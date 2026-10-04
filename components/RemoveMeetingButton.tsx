"use client";

import { Trash2 } from "lucide-react";
import { ICON } from "@/lib/icons";
import { removeMeeting } from "@/app/actions/meetings";
import { SubmitButton } from "./SubmitButton";

export function RemoveMeetingButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={removeMeeting.bind(null, id)}
      onSubmit={(event) => {
        if (!window.confirm(`Remove "${title}"? Members will no longer see it.`)) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton pendingLabel="Deleting…" className="btn btn-danger">
        <Trash2 size={ICON.sm} />
        Delete meeting
      </SubmitButton>
    </form>
  );
}
