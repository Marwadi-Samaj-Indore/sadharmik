"use client";

import { Trash2 } from "lucide-react";
import { ICON } from "@/lib/icons";
import { removeCommitteeMember } from "@/app/actions/committee";
import { SubmitButton } from "./SubmitButton";

export function RemoveCommitteeMemberButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={removeCommitteeMember.bind(null, id)}
      onSubmit={(event) => {
        if (!window.confirm(`Remove ${name} from the committee section?`)) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton pendingLabel="Removing…" className="btn btn-danger w-full">
        <Trash2 size={ICON.sm} />
        Remove from committee section
      </SubmitButton>
    </form>
  );
}
