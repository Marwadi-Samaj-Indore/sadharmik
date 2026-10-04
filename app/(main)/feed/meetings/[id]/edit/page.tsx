import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { BackBar } from "@/components/ui";
import { MeetingForm } from "@/components/MeetingForm";
import { updateMeeting } from "@/app/actions/meetings";
import { photoUrl } from "@/lib/util";

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [db, session] = await Promise.all([getDb(), getSession()]);
  if (!session.isAdmin) redirect(`/feed/meetings/${id}`);

  const meeting = db.meetings.find((m) => m.id === id);
  if (!meeting) notFound();

  return (
    <>
      <BackBar label="Edit meeting" href={`/feed/meetings/${id}`} />
      <MeetingForm
        action={updateMeeting.bind(null, id)}
        cancelHref={`/feed/meetings/${id}`}
        submitLabel="Save changes"
        defaultValues={{
          title: meeting.title,
          description: meeting.description,
          location: meeting.location,
          mapsUrl: meeting.mapsUrl ?? "",
          organisers: meeting.organisers,
          meetingDate: meeting.meetingDate,
          meetingTime: meeting.meetingTime,
          kwikPicUrl: meeting.kwikPicUrl ?? "",
          driveUrl: meeting.driveUrl ?? "",
          photoUrl: photoUrl(meeting.photo),
        }}
      />
    </>
  );
}
