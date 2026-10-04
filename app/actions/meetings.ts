"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  appendChange,
  clone,
  deleteMeeting as deleteMeetingRow,
  deleteMeetingRsvp,
  getDb,
  newId,
  saveMeeting,
  saveMeetingRsvp,
} from "@/lib/db";
import { actorName, getSession } from "@/lib/session";
import { removeImage, storeFile } from "@/lib/storage";
import { withSavedFlag } from "@/lib/nav";
import { shortName } from "@/lib/util";
import type { Meeting } from "@/lib/types";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Organised by the committee — the same posture as an announcement. */
export async function createMeeting(formData: FormData) {
  const session = await getSession();
  if (!session.isAdmin) redirect("/feed?tab=meetings");

  const title = text(formData, "title");
  const meetingDate = text(formData, "meetingDate");
  if (!title || !meetingDate) redirect("/feed/meetings/new");

  const id = newId("mt");
  const photoInput = text(formData, "photo");
  const photo = photoInput.startsWith("data:image/")
    ? await storeFile(photoInput, { folder: `meetings/${id}`, name: "cover" })
    : null;

  const meeting: Meeting = {
    id,
    title: title.slice(0, 120),
    description: text(formData, "description").slice(0, 1000),
    location: text(formData, "location").slice(0, 160),
    mapsUrl: text(formData, "mapsUrl") || null,
    organisers: text(formData, "organisers").slice(0, 300),
    meetingDate,
    meetingTime: text(formData, "meetingTime").slice(0, 60),
    photo,
    kwikPicUrl: text(formData, "kwikPicUrl").slice(0, 300) || null,
    driveUrl: text(formData, "driveUrl").slice(0, 500) || null,
    authorName: session.person ? shortName(session.person) : "Samaj Karyakarini",
    authorEmail: session.email,
    createdAt: new Date().toISOString(),
  };

  await saveMeeting(meeting);
  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: "Created meeting",
    target: meeting.title,
    before: null,
    after: meeting,
  });
  revalidatePath("/", "layout");
  redirect(withSavedFlag(`/feed/meetings/${id}`, "meeting"));
}

/** Also how the Kwik Pic link gets added once photos are ready. */
export async function updateMeeting(meetingId: string, formData: FormData) {
  const session = await getSession();
  if (!session.isAdmin) redirect(`/feed/meetings/${meetingId}`);

  const db = await getDb();
  const existing = db.meetings.find((m) => m.id === meetingId);
  if (!existing) redirect("/feed?tab=meetings");

  const title = text(formData, "title");
  const meetingDate = text(formData, "meetingDate");
  if (!title || !meetingDate) redirect(`/feed/meetings/${meetingId}/edit`);

  const meeting = clone(existing);
  meeting.title = title.slice(0, 120);
  meeting.description = text(formData, "description").slice(0, 1000);
  meeting.location = text(formData, "location").slice(0, 160);
  meeting.mapsUrl = text(formData, "mapsUrl") || null;
  meeting.organisers = text(formData, "organisers").slice(0, 300);
  meeting.meetingDate = meetingDate;
  meeting.meetingTime = text(formData, "meetingTime").slice(0, 60);
  meeting.kwikPicUrl = text(formData, "kwikPicUrl").slice(0, 300) || null;
  meeting.driveUrl = text(formData, "driveUrl").slice(0, 500) || null;

  // The replaced cover is deleted only after the save lands — a failed save
  // must leave an orphaned file, not a meeting pointing at a deleted one
  const photoInput = text(formData, "photo");
  let obsolete: string | null = null;
  if (text(formData, "removePhoto") === "on") {
    obsolete = existing.photo;
    meeting.photo = null;
  } else if (photoInput.startsWith("data:image/")) {
    meeting.photo = await storeFile(photoInput, {
      folder: `meetings/${meetingId}`,
      name: "cover",
    });
    obsolete = existing.photo;
  }

  await saveMeeting(meeting);
  await removeImage(obsolete);
  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: "Updated meeting",
    target: meeting.title,
    before: existing,
    after: meeting,
  });
  revalidatePath("/", "layout");
  redirect(withSavedFlag(`/feed/meetings/${meetingId}`, "meeting"));
}

export async function removeMeeting(meetingId: string) {
  const session = await getSession();
  if (!session.isAdmin) return;

  const db = await getDb();
  const meeting = db.meetings.find((m) => m.id === meetingId);
  if (!meeting) return;

  // Row first, file second — the reverse order could leave a live meeting
  // with a dead cover if the delete failed halfway
  await deleteMeetingRow(meetingId);
  await removeImage(meeting.photo);
  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: "Deleted meeting",
    target: meeting.title,
    before: meeting,
    after: null,
  });
  revalidatePath("/", "layout");
  redirect("/feed?tab=meetings");
}

/* ------------------------------------------------------------- attendance */

/**
 * "3 of us are coming" — one row per member, upserted when they change their
 * mind. Called from the optimistic stepper in components/RsvpCard.tsx, so it
 * returns instead of redirecting: the UI has already moved on, and the
 * revalidate only has to reconcile it.
 */
export async function setRsvpCount(meetingId: string, count: number) {
  const session = await getSession();
  if (!session.isSignedIn || !session.person) return;

  const db = await getDb();
  if (!db.meetings.some((m) => m.id === meetingId)) return;

  const attendeeCount = Number.isFinite(count)
    ? Math.min(20, Math.max(1, Math.round(count)))
    : 1;

  const existing = db.meetingRsvps.find(
    (r) => r.meetingId === meetingId && r.personId === session.person!.id
  );

  await saveMeetingRsvp({
    id: existing?.id ?? newId("rsvp"),
    meetingId,
    personId: session.person.id,
    householdId: session.person.householdId,
    attendeeCount,
    responderName: shortName(session.person),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  revalidatePath("/", "layout");
}

export async function clearRsvp(meetingId: string) {
  const session = await getSession();
  if (!session.isSignedIn || !session.person) return;

  const db = await getDb();
  const existing = db.meetingRsvps.find(
    (r) => r.meetingId === meetingId && r.personId === session.person!.id
  );
  if (existing) await deleteMeetingRsvp(existing.id);

  revalidatePath("/", "layout");
}
