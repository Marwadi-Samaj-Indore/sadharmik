import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { BackBar } from "@/components/ui";
import { MeetingForm } from "@/components/MeetingForm";
import { createMeeting } from "@/app/actions/meetings";
import { requireMember } from "@/lib/guard";

export default async function NewMeetingPage() {
  await requireMember();
  const session = await getSession();
  if (!session.isAdmin) redirect("/feed?tab=meetings");

  return (
    <>
      <BackBar label="New meeting" href="/feed?tab=meetings" />
      <MeetingForm
        action={createMeeting}
        cancelHref="/feed?tab=meetings"
        submitLabel="Post meeting"
      />
    </>
  );
}
