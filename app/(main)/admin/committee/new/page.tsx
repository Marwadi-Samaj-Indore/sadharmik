import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { BackBar } from "@/components/ui";
import { CommitteeMemberForm } from "@/components/CommitteeMemberForm";
import { createCommitteeMember } from "@/app/actions/committee";

export default async function NewCommitteeMemberPage() {
  const session = await getSession();
  if (!session.isAdmin) redirect("/me");

  return (
    <>
      <BackBar label="Add committee member" href="/admin/committee" />
      <CommitteeMemberForm
        action={createCommitteeMember}
        cancelHref="/admin/committee"
        submitLabel="Add member"
      />
    </>
  );
}
