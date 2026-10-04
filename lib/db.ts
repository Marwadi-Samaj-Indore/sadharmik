import "server-only";
import { cache } from "react";
import { getSupabase } from "./supabase";
import type {
  Biodata,
  ChangeEntry,
  Circular,
  Comment,
  CommitteeMember,
  Database,
  Household,
  Issue,
  Meeting,
  MeetingRsvp,
  Person,
  Post,
} from "./types";

/**
 * THE ONLY FILE THAT TOUCHES THE DATABASE TABLES. The full storage boundary
 * is three files with one lane each: this one owns Postgres, lib/storage.ts
 * owns the file bucket, and the scripts in scripts/ are offline ETL with
 * their own client. Nothing else talks to Supabase.
 *
 * Reads: `getDb()` loads the whole directory in one pass. It is small — 107
 * households and 363 people, well under a megabyte — and React's `cache()`
 * dedupes it to a single fetch per request, so a page rendering six components
 * hits the database once. The change log is the exception: it grows forever
 * and only the admin panel reads it, so it has its own read below.
 *
 * Writes: targeted functions per record, never a whole-table rewrite. Two
 * members editing at the same time must not overwrite each other.
 */

/* --------------------------------------------------------------- row mapping */

/* eslint-disable @typescript-eslint/no-explicit-any */

const blankToEmpty = (v: any) => v ?? "";

function toHousehold(row: any): Household {
  return {
    id: row.id,
    familyName: row.family_name,
    surname: blankToEmpty(row.surname),
    gotra: blankToEmpty(row.gotra),
    nativePlace: blankToEmpty(row.native_place),
    address: blankToEmpty(row.address),
    area: blankToEmpty(row.area),
    city: row.city || "Indore",
    pincode: blankToEmpty(row.pincode),
    mapsUrl: blankToEmpty(row.maps_url),
    photo: row.photo ?? null,
    anniversary: row.anniversary ?? null,
    headPersonId: row.head_person_id ?? null,
    sourceRow: row.source_row ?? 0,
  };
}

function fromHousehold(h: Household) {
  return {
    id: h.id,
    family_name: h.familyName,
    surname: h.surname,
    gotra: h.gotra,
    native_place: h.nativePlace,
    address: h.address,
    area: h.area,
    city: h.city || "Indore",
    pincode: h.pincode,
    maps_url: h.mapsUrl,
    photo: h.photo,
    anniversary: h.anniversary,
    head_person_id: h.headPersonId,
    source_row: h.sourceRow,
  };
}

function toPerson(row: any): Person {
  return {
    id: row.id,
    householdId: row.household_id,
    firstName: blankToEmpty(row.first_name),
    middleName: blankToEmpty(row.middle_name),
    lastName: blankToEmpty(row.last_name),
    relationship: row.relationship ?? "other",
    gender: blankToEmpty(row.gender),
    photo: row.photo ?? null,
    mobile: row.mobile ?? null,
    whatsapp: row.whatsapp ?? null,
    email: blankToEmpty(row.email),
    dob: row.dob ?? null,
    bloodGroup: blankToEmpty(row.blood_group),
    maritalStatus: blankToEmpty(row.marital_status),
    livingIn: blankToEmpty(row.living_in),
    education: blankToEmpty(row.education),
    occupationType: blankToEmpty(row.occupation_type),
    business: {
      name: "",
      category: "",
      description: "",
      keywords: "",
      address: "",
      phone: "",
      website: "",
      instagram: "",
      visitingCard: null,
      ...(row.business ?? {}),
    },
    privacy: {
      hideMobile: false,
      hideWhatsapp: false,
      hideEmail: false,
      hideDobYear: false,
      hidePhoto: false,
      ...(row.privacy ?? {}),
    },
    deceased: Boolean(row.deceased),
    claimedByEmail: row.claimed_by_email ?? null,
    age: row.age ?? null,
    birthYear: row.birth_year ?? null,
  };
}

function fromPerson(p: Person) {
  return {
    id: p.id,
    household_id: p.householdId,
    first_name: p.firstName,
    middle_name: p.middleName,
    last_name: p.lastName,
    relationship: p.relationship,
    gender: p.gender,
    photo: p.photo,
    mobile: p.mobile,
    whatsapp: p.whatsapp,
    email: p.email,
    dob: p.dob,
    blood_group: p.bloodGroup,
    marital_status: p.maritalStatus,
    living_in: p.livingIn,
    education: p.education,
    occupation_type: p.occupationType,
    business: p.business,
    privacy: p.privacy,
    deceased: p.deceased,
    claimed_by_email: p.claimedByEmail,
    age: p.age,
    birth_year: p.birthYear,
  };
}

function toPost(row: any): Post {
  return {
    id: row.id,
    type: row.type,
    authorPersonId: row.author_person_id ?? null,
    authorName: blankToEmpty(row.author_name),
    authorEmail: row.author_email ?? null,
    title: row.title,
    body: blankToEmpty(row.body),
    category: blankToEmpty(row.category),
    area: blankToEmpty(row.area),
    photo: row.photo ?? null,
    pinned: Boolean(row.pinned),
    commentsLocked: Boolean(row.comments_locked),
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? null,
    isDemo: Boolean(row.is_demo),
  };
}

function fromPost(p: Post) {
  return {
    id: p.id,
    type: p.type,
    author_person_id: p.authorPersonId,
    author_name: p.authorName,
    author_email: p.authorEmail,
    title: p.title,
    body: p.body,
    category: p.category,
    area: p.area,
    photo: p.photo,
    pinned: p.pinned,
    comments_locked: p.commentsLocked,
    is_demo: Boolean(p.isDemo),
    created_at: p.createdAt,
    expires_at: p.expiresAt,
  };
}

function toComment(row: any): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    authorPersonId: row.author_person_id ?? null,
    authorName: blankToEmpty(row.author_name),
    authorEmail: row.author_email ?? null,
    body: row.body,
    createdAt: row.created_at,
  };
}

function fromComment(c: Comment) {
  return {
    id: c.id,
    post_id: c.postId,
    author_person_id: c.authorPersonId,
    author_name: c.authorName,
    author_email: c.authorEmail,
    body: c.body,
    created_at: c.createdAt,
  };
}

function toIssue(row: any): Issue {
  return {
    id: row.id,
    householdId: row.household_id ?? "",
    personId: row.person_id ?? null,
    field: blankToEmpty(row.field),
    kind: row.kind,
    message: blankToEmpty(row.message),
    raw: blankToEmpty(row.raw),
    resolved: Boolean(row.resolved),
  };
}

function toBiodata(row: any): Biodata {
  return {
    id: row.id,
    title: row.title,
    filePath: row.file_path,
    fileType: row.file_type === "image" ? "image" : "pdf",
    fileName: blankToEmpty(row.file_name),
    note: blankToEmpty(row.note),
    uploaderPersonId: row.uploader_person_id ?? null,
    uploaderName: blankToEmpty(row.uploader_name),
    uploaderEmail: row.uploader_email ?? null,
    createdAt: row.created_at,
  };
}

function toCircular(row: any): Circular {
  return {
    id: row.id,
    title: row.title,
    note: blankToEmpty(row.note),
    filePath: row.file_path,
    fileType: row.file_type === "image" ? "image" : "pdf",
    fileName: blankToEmpty(row.file_name),
    authorPersonId: row.author_person_id ?? null,
    authorName: blankToEmpty(row.author_name),
    authorEmail: row.author_email ?? null,
    createdAt: row.created_at,
  };
}

function toMeeting(row: any): Meeting {
  return {
    id: row.id,
    title: row.title,
    description: blankToEmpty(row.description),
    location: blankToEmpty(row.location),
    mapsUrl: row.maps_url ?? null,
    organisers: blankToEmpty(row.organisers),
    meetingDate: row.meeting_date,
    meetingTime: blankToEmpty(row.meeting_time),
    photo: row.photo ?? null,
    kwikPicUrl: row.kwik_pic_url ?? null,
    driveUrl: row.drive_url ?? null,
    authorName: blankToEmpty(row.author_name),
    authorEmail: row.author_email ?? null,
    createdAt: row.created_at,
  };
}

function toMeetingRsvp(row: any): MeetingRsvp {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    personId: row.person_id,
    householdId: row.household_id,
    attendeeCount: Number(row.attendee_count) || 1,
    responderName: blankToEmpty(row.responder_name),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCommitteeMember(row: any): CommitteeMember {
  return {
    id: row.id,
    name: row.name,
    role: blankToEmpty(row.role),
    phone: row.phone ?? null,
    photo: row.photo ?? null,
    sortOrder: Number(row.sort_order) || 0,
  };
}

function toChange(row: any): ChangeEntry {
  return {
    id: row.id,
    at: row.at,
    byEmail: row.by_email ?? null,
    byName: blankToEmpty(row.by_name),
    action: blankToEmpty(row.action),
    target: blankToEmpty(row.target),
    before: row.before ?? null,
    after: row.after ?? null,
    undone: Boolean(row.undone),
  };
}

/* ---------------------------------------------------------------------- read */

/**
 * Loads the entire directory. Memoised per request by React's `cache()`, so
 * repeated calls inside one page render share a single round trip.
 */
export const getDb = cache(async (): Promise<Database> => {
  const supabase = getSupabase();

  const [
    households,
    people,
    posts,
    comments,
    issues,
    admins,
    biodata,
    circulars,
    meetings,
    meetingRsvps,
    committeeMembers,
  ] = await Promise.all([
    supabase.from("households").select("*"),
    supabase.from("people").select("*"),
    supabase.from("posts").select("*").order("created_at", { ascending: false }),
    // Newest-first with a cap, then flipped back to ascending for display:
    // comments grow without bound, and a plain ascending limit would silently
    // drop the NEWEST ones once it filled
    supabase
      .from("comments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("issues").select("*"),
    supabase.from("admins").select("email"),
    supabase.from("biodata").select("*").order("created_at", { ascending: false }),
    supabase.from("circulars").select("*").order("created_at", { ascending: false }),
    supabase.from("meetings").select("*").order("meeting_date", { ascending: false }),
    supabase.from("meeting_rsvps").select("*"),
    supabase.from("committee_members").select("*").order("sort_order"),
  ]);

  const failed = [households, people, posts, comments, issues, admins].find(
    (r) => r.error
  );
  if (failed?.error) {
    throw new Error(`Could not read the directory: ${failed.error.message}`);
  }

  // Biodata, circulars, meetings, RSVPs and committee members each arrived in
  // a later migration. If a table isn't there yet the rest of the app must
  // still work, so a missing table is treated as "none yet" rather than taking
  // the whole directory down.
  const optional = { biodata, circulars, meetings, meetingRsvps, committeeMembers };
  for (const [name, result] of Object.entries(optional)) {
    if (result.error && !/schema cache|does not exist/i.test(result.error.message)) {
      throw new Error(`Could not read ${name}: ${result.error.message}`);
    }
  }

  const allPosts = (posts.data ?? []).map(toPost);

  return {
    version: 2,
    importedAt: "",
    source: "PM Sample Database.xlsx",
    admins: (admins.data ?? []).map((a: any) => String(a.email).toLowerCase()),
    households: (households.data ?? []).map(toHousehold),
    people: (people.data ?? []).map(toPerson),
    announcements: allPosts.filter((p) => p.type === "announcement"),
    requirements: allPosts.filter((p) => p.type === "requirement"),
    comments: (comments.data ?? []).map(toComment).reverse(),
    issues: (issues.data ?? []).map(toIssue),
    biodata: (biodata.data ?? []).map(toBiodata),
    circulars: (circulars.data ?? []).map(toCircular),
    meetings: (meetings.data ?? []).map(toMeeting),
    meetingRsvps: (meetingRsvps.data ?? []).map(toMeetingRsvp),
    committeeMembers: (committeeMembers.data ?? []).map(toCommitteeMember),
  };
});

/**
 * The admin change log, read separately from `getDb()`. Only the admin panel
 * and the undo action want it, it grows with every edit forever, and folding
 * it into the one-big-read would tax every page for a table one page uses.
 */
export const getChangeLog = cache(async (): Promise<ChangeEntry[]> => {
  const { data, error } = await getSupabase()
    .from("change_log")
    .select("*")
    .order("at", { ascending: false })
    .limit(300);
  if (error) throw new Error(`Could not read the change log: ${error.message}`);
  return (data ?? []).map(toChange);
});

/* ------------------------------------------------------------------ biodata */

export async function saveBiodata(entry: Biodata) {
  const { error } = await getSupabase().from("biodata").upsert({
    id: entry.id,
    title: entry.title,
    file_path: entry.filePath,
    file_type: entry.fileType,
    file_name: entry.fileName,
    note: entry.note,
    uploader_person_id: entry.uploaderPersonId,
    uploader_name: entry.uploaderName,
    uploader_email: entry.uploaderEmail,
  });
  fail("Could not save the biodata", error);
}

export async function deleteBiodata(id: string) {
  const { error } = await getSupabase().from("biodata").delete().eq("id", id);
  fail("Could not remove the biodata", error);
}

/* ---------------------------------------------------------------- circulars */

export async function saveCircular(entry: Circular) {
  const { error } = await getSupabase().from("circulars").upsert({
    id: entry.id,
    title: entry.title,
    note: entry.note,
    file_path: entry.filePath,
    file_type: entry.fileType,
    file_name: entry.fileName,
    author_person_id: entry.authorPersonId,
    author_name: entry.authorName,
    author_email: entry.authorEmail,
  });
  fail("Could not save the circular", error);
}

export async function deleteCircular(id: string) {
  const { error } = await getSupabase().from("circulars").delete().eq("id", id);
  fail("Could not remove the circular", error);
}

/* ----------------------------------------------------------------- meetings */

export async function saveMeeting(entry: Meeting) {
  const { error } = await getSupabase().from("meetings").upsert({
    id: entry.id,
    title: entry.title,
    description: entry.description,
    location: entry.location,
    maps_url: entry.mapsUrl,
    organisers: entry.organisers,
    meeting_date: entry.meetingDate,
    meeting_time: entry.meetingTime,
    photo: entry.photo,
    kwik_pic_url: entry.kwikPicUrl,
    drive_url: entry.driveUrl,
    author_name: entry.authorName,
    author_email: entry.authorEmail,
    created_at: entry.createdAt,
  });
  fail("Could not save the meeting", error);
}

export async function deleteMeeting(id: string) {
  const { error } = await getSupabase().from("meetings").delete().eq("id", id);
  fail("Could not remove the meeting", error);
}

/** One row per (meeting, person) — upserting lets a member change their count. */
export async function saveMeetingRsvp(entry: MeetingRsvp) {
  const { error } = await getSupabase()
    .from("meeting_rsvps")
    .upsert(
      {
        id: entry.id,
        meeting_id: entry.meetingId,
        person_id: entry.personId,
        household_id: entry.householdId,
        attendee_count: entry.attendeeCount,
        responder_name: entry.responderName,
        updated_at: entry.updatedAt,
      },
      { onConflict: "meeting_id,person_id" }
    );
  fail("Could not save your RSVP", error);
}

export async function deleteMeetingRsvp(id: string) {
  const { error } = await getSupabase().from("meeting_rsvps").delete().eq("id", id);
  fail("Could not withdraw your RSVP", error);
}

/* ------------------------------------------------------------- committee */

export async function saveCommitteeMember(entry: CommitteeMember) {
  const { error } = await getSupabase().from("committee_members").upsert({
    id: entry.id,
    name: entry.name,
    role: entry.role,
    phone: entry.phone,
    photo: entry.photo,
    sort_order: entry.sortOrder,
  });
  fail("Could not save the committee member", error);
}

export async function deleteCommitteeMember(id: string) {
  const { error } = await getSupabase().from("committee_members").delete().eq("id", id);
  fail("Could not remove the committee member", error);
}

/* --------------------------------------------------------------------- write */

const fail = (what: string, error: { message: string } | null) => {
  if (error) throw new Error(`${what}: ${error.message}`);
};

export async function savePerson(person: Person) {
  const { error } = await getSupabase().from("people").upsert(fromPerson(person));
  fail("Could not save the profile", error);
}

export async function saveHousehold(household: Household) {
  const { error } = await getSupabase()
    .from("households")
    .upsert(fromHousehold(household));
  fail("Could not save the household", error);
}

export async function savePost(post: Post) {
  const { error } = await getSupabase().from("posts").upsert(fromPost(post));
  fail("Could not save the post", error);
}

export async function deletePostRow(id: string) {
  // Comments are removed automatically by the foreign key cascade
  const { error } = await getSupabase().from("posts").delete().eq("id", id);
  fail("Could not delete the post", error);
}

export async function saveComment(comment: Comment) {
  const { error } = await getSupabase().from("comments").upsert(fromComment(comment));
  fail("Could not post the comment", error);
}

export async function deleteCommentRow(id: string) {
  const { error } = await getSupabase().from("comments").delete().eq("id", id);
  fail("Could not delete the comment", error);
}

/** Only one announcement may be pinned to the Home screen at a time. */
export async function unpinAllAnnouncements() {
  const { error } = await getSupabase()
    .from("posts")
    .update({ pinned: false })
    .eq("type", "announcement");
  fail("Could not update pins", error);
}

export async function resolveIssues(ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await getSupabase()
    .from("issues")
    .update({ resolved: true })
    .in("id", ids);
  fail("Could not update the attention queue", error);
}

export async function deleteDemoPosts() {
  const { error } = await getSupabase().from("posts").delete().eq("is_demo", true);
  fail("Could not remove the sample posts", error);
}

export async function markChangeUndone(id: string) {
  const { error } = await getSupabase()
    .from("change_log")
    .update({ undone: true })
    .eq("id", id);
  fail("Could not update the change log", error);
}

/** Appends to the admin-visible change log, which powers one-click undo. */
export async function appendChange(
  entry: Omit<ChangeEntry, "id" | "at" | "undone">
) {
  const { error } = await getSupabase().from("change_log").insert({
    id: newId("c"),
    at: new Date().toISOString(),
    by_email: entry.byEmail,
    by_name: entry.byName,
    action: entry.action,
    target: entry.target,
    before: entry.before ?? null,
    after: entry.after ?? null,
    undone: false,
  });
  fail("Could not record the change", error);
}

/* ------------------------------------------------------------------------ ids */

/**
 * Collision-free without a round trip. Counting existing rows and adding one
 * would let two members posting at the same moment claim the same id.
 */
export function newId(prefix: string) {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 7);
  return `${prefix}${stamp}${random}`;
}

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
