import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { BackBar } from "@/components/ui";
import { CommitteeMemberForm } from "@/components/CommitteeMemberForm";
import { RemoveCommitteeMemberButton } from "@/components/RemoveCommitteeMemberButton";
import { updateCommitteeMember } from "@/app/actions/committee";
import { photoUrl } from "@/lib/util";

export default async function EditCommitteeMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [db, session] = await Promise.all([getDb(), getSession()]);
  if (!session.isAdmin) redirect("/me");

  const member = db.committeeMembers.find((m) => m.id === id);
  if (!member) notFound();

  return (
    <>
      <BackBar label="Edit committee member" href="/admin/committee" />
      <CommitteeMemberForm
        action={updateCommitteeMember.bind(null, id)}
        cancelHref="/admin/committee"
        submitLabel="Save changes"
        defaultValues={{
          name: member.name,
          role: member.role,
          phone: member.phone ?? "",
          sortOrder: member.sortOrder,
          photoUrl: photoUrl(member.photo),
        }}
      />
      <div className="px-4 pb-8">
        <RemoveCommitteeMemberButton id={member.id} name={member.name} />
      </div>
    </>
  );
}
