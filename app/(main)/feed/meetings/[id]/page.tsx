import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Pencil,
  Camera,
  ExternalLink,
  FolderOpen,
  Users,
  UserRound,
} from "lucide-react";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { BackBar, Badge } from "@/components/ui";
import { RemoveMeetingButton } from "@/components/RemoveMeetingButton";
import { RsvpCard } from "@/components/RsvpCard";
import { formatDateLong, formatTime, photoUrl } from "@/lib/util";
import { ICON } from "@/lib/icons";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [db, session] = await Promise.all([getDb(), getSession()]);

  const meeting = db.meetings.find((m) => m.id === id);
  if (!meeting) notFound();

  const isPast = new Date(meeting.meetingDate) < new Date(new Date().toDateString());
  const cover = photoUrl(meeting.photo);

  const rsvps = db.meetingRsvps.filter((r) => r.meetingId === meeting.id);
  const totalAttendees = rsvps.reduce((sum, r) => sum + r.attendeeCount, 0);
  const myRsvp = session.person
    ? rsvps.find((r) => r.personId === session.person!.id)
    : undefined;

  return (
    <>
      <BackBar label="Meeting" href="/feed?tab=meetings" />

      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="aspect-video w-full object-cover" />
      )}

      <div className="px-4 pt-5">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {isPast && <Badge>Past</Badge>}
        </div>
        <h1 className="text-title">{meeting.title}</h1>

        <div className="mt-3 space-y-2 text-sm text-ink-soft">
          <p className="flex items-center gap-2">
            <Calendar size={ICON.sm} className="shrink-0 text-ink-faint" />
            {formatDateLong(meeting.meetingDate)}
            {meeting.meetingTime && (
              <>
                <span className="text-ink-faint">·</span>
                <Clock size={ICON.sm} className="shrink-0 text-ink-faint" />
                {formatTime(meeting.meetingTime)}
              </>
            )}
          </p>
          {meeting.location && (
            <p className="flex items-center gap-2">
              <MapPin size={ICON.sm} className="shrink-0 text-ink-faint" />
              {meeting.location}
            </p>
          )}
          {meeting.organisers && (
            <p className="flex items-center gap-2">
              <UserRound size={ICON.sm} className="shrink-0 text-ink-faint" />
              {meeting.organisers}
            </p>
          )}
        </div>

        {meeting.mapsUrl && (
          <a
            href={meeting.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary mt-4 w-full"
          >
            <MapPin size={ICON.sm} />
            Open in Maps
          </a>
        )}

        {meeting.description && (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {meeting.description}
          </p>
        )}

        {meeting.kwikPicUrl && (
          <a
            href={meeting.kwikPicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary mt-5 w-full"
          >
            <Camera size={ICON.sm} />
            View photos on Kwik Pic
            <ExternalLink size={ICON.sm} />
          </a>
        )}

        {/* Secondary to Kwik Pic even when it stands alone: a Drive folder is
            a place to go and look through, not the photos themselves. */}
        {meeting.driveUrl && (
          <a
            href={meeting.driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn btn-secondary w-full ${meeting.kwikPicUrl ? "mt-2.5" : "mt-5"}`}
          >
            <FolderOpen size={ICON.sm} />
            Open the Google Drive folder
            <ExternalLink size={ICON.sm} />
          </a>
        )}

        {!isPast && (
          <RsvpCard
            meetingId={meeting.id}
            myCount={myRsvp?.attendeeCount ?? null}
            othersTotal={totalAttendees - (myRsvp?.attendeeCount ?? 0)}
            otherFamilies={rsvps.length - (myRsvp ? 1 : 0)}
            responders={rsvps
              .filter((r) => r.personId !== session.person?.id)
              .map((r) => ({
                name: r.responderName || "A member",
                count: r.attendeeCount,
              }))}
            canRespond={Boolean(session.person)}
          />
        )}

        {isPast && totalAttendees > 0 && (
          <p className="mt-5 flex items-center gap-1.5 text-xs text-ink-soft">
            <Users size={ICON.xs} />
            <span className="tnum">{totalAttendees}</span> members said they were
            coming
          </p>
        )}

        <p className="mt-5 text-xs text-ink-faint">
          Posted by {meeting.authorName || "Samaj Karyakarini"}
        </p>

        {session.isAdmin && (
          <div className="mt-6 flex gap-2 border-t border-line-soft pt-5">
            <Link
              href={`/feed/meetings/${meeting.id}/edit`}
              className="btn btn-ghost flex-1"
            >
              <Pencil size={ICON.sm} />
              Edit
            </Link>
            <RemoveMeetingButton id={meeting.id} title={meeting.title} />
          </div>
        )}
      </div>
    </>
  );
}
