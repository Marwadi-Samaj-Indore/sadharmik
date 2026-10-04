"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  appendChange,
  clone,
  deleteCommentRow,
  deleteDemoPosts,
  deletePostRow,
  getChangeLog,
  getDb,
  markChangeUndone,
  newId,
  resolveIssues,
  saveComment,
  saveCommitteeMember,
  saveHousehold,
  saveMeeting,
  savePerson,
  savePost,
  unpinAllAnnouncements,
} from "@/lib/db";
import { actorName, canEdit, getSession } from "@/lib/session";
import { removeImage, storeFile, storeImage } from "@/lib/storage";
import { safeReturnTo, withSavedFlag } from "@/lib/nav";
import {
  householdIssueSettled,
  isStoredPath,
  personIssueSettled,
  shortName,
} from "@/lib/util";
import type {
  Comment,
  CommitteeMember,
  Household,
  Meeting,
  Person,
  Post,
} from "@/lib/types";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const bool = (fd: FormData, key: string) => fd.get(key) === "on";
const digits = (fd: FormData, key: string) =>
  String(fd.get(key) ?? "").replace(/\D/g, "").slice(-10) || null;

/** Refresh every route — the whole app reads from one directory. */
const refresh = () => revalidatePath("/", "layout");

async function requireSession() {
  const session = await getSession();
  if (!session.isSignedIn) redirect("/login");
  return session;
}

/* ------------------------------------------------------------------- people */

export async function updatePerson(personId: string, formData: FormData) {
  const session = await requireSession();
  const db = await getDb();

  const existing = db.people.find((p) => p.id === personId);
  if (!existing || !canEdit(session, existing)) redirect("/me");

  const before = clone(existing);
  const person: Person = clone(existing);

  person.firstName = text(formData, "firstName");
  person.middleName = text(formData, "middleName");
  person.lastName = text(formData, "lastName");
  person.gender = text(formData, "gender");
  person.mobile = digits(formData, "mobile");
  person.whatsapp = digits(formData, "whatsapp") ?? person.mobile;
  person.email = text(formData, "email");
  person.dob = text(formData, "dob") || null;
  person.bloodGroup = text(formData, "bloodGroup");
  person.maritalStatus = text(formData, "maritalStatus");
  person.livingIn = text(formData, "livingIn");
  person.education = text(formData, "education");
  person.occupationType = text(formData, "occupationType") as Person["occupationType"];

  // Photos arrive already downscaled by the browser (see PhotoPicker), then go
  // into file storage. The database keeps only a short path. Replaced files
  // are deleted only AFTER the row saves: if the save fails, the wrong
  // leftover is an orphaned file, never a profile pointing at a deleted one.
  const obsolete: (string | null)[] = [];
  if (bool(formData, "removePhoto")) {
    obsolete.push(before.photo);
    person.photo = null;
  } else {
    const uploaded = text(formData, "photo");
    if (uploaded.startsWith("data:image/")) {
      person.photo = await storeImage(uploaded, { personId, kind: "photo" });
      obsolete.push(before.photo);
    }
  }

  const submittedCard = text(formData, "businessVisitingCard");
  let visitingCard: string | null = null;
  if (submittedCard.startsWith("data:image/")) {
    visitingCard = await storeImage(submittedCard, { personId, kind: "card" });
    obsolete.push(before.business.visitingCard);
  } else if (submittedCard) {
    visitingCard = submittedCard; // unchanged — already a stored path
  } else {
    obsolete.push(before.business.visitingCard);
  }

  person.business = {
    name: text(formData, "businessName"),
    category: text(formData, "businessCategory"),
    description: text(formData, "businessDescription"),
    keywords: text(formData, "businessKeywords"),
    address: text(formData, "businessAddress"),
    phone: text(formData, "businessPhone"),
    website: text(formData, "businessWebsite"),
    instagram: text(formData, "businessInstagram"),
    visitingCard,
  };

  person.privacy = {
    hideMobile: bool(formData, "hideMobile"),
    hideWhatsapp: bool(formData, "hideWhatsapp"),
    hideEmail: bool(formData, "hideEmail"),
    hideDobYear: bool(formData, "hideDobYear"),
    hidePhoto: bool(formData, "hidePhoto"),
  };

  if (session.person?.id === personId && session.email) {
    person.claimedByEmail = session.email;
  }

  await savePerson(person);
  for (const path of obsolete) await removeImage(path);

  // Any field the member has now filled in stops being an open issue
  const settled = db.issues
    .filter((issue) => issue.personId === personId && !issue.resolved)
    .filter((issue) => personIssueSettled(issue.field, person))
    .map((issue) => issue.id);
  await resolveIssues(settled);

  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: "Updated profile",
    target: shortName(person),
    before,
    after: person,
  });

  refresh();
  // Return to whichever screen opened the form, so the member stays in the
  // tab they were using
  redirect(
    withSavedFlag(safeReturnTo(formData.get("returnTo"), `/person/${personId}`), "profile")
  );
}

/** Adds a new person to a household — a parent adding a child, most often. */
export async function addFamilyMember(householdId: string, formData: FormData) {
  const session = await requireSession();
  const db = await getDb();

  const household = db.households.find((h) => h.id === householdId);
  if (!household) redirect("/me");
  if (!session.isAdmin && session.person?.householdId !== householdId) redirect("/me");

  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  if (!firstName || !lastName) redirect(`/me/household/${householdId}/add-member`);

  // "son"/"daughter"/"father"/"mother" are gendered pairs of the same two
  // underlying relationships ("child"/"parent") — the split is so the form
  // asks for gender only once, not as a separate field
  const relationshipInput = text(formData, "relationship");
  const validRelationship: Person["relationship"] =
    relationshipInput === "son" || relationshipInput === "daughter"
      ? "child"
      : relationshipInput === "father" || relationshipInput === "mother"
        ? "parent"
        : "other";
  const inferredGender =
    relationshipInput === "son" || relationshipInput === "father"
      ? "male"
      : relationshipInput === "daughter" || relationshipInput === "mother"
        ? "female"
        : "";

  const person: Person = {
    id: newId("p"),
    householdId,
    firstName,
    middleName: text(formData, "middleName"),
    lastName,
    relationship: validRelationship,
    gender: text(formData, "gender") || inferredGender,
    photo: null,
    mobile: digits(formData, "mobile"),
    whatsapp: null,
    email: "",
    dob: text(formData, "dob") || null,
    bloodGroup: "",
    maritalStatus: "",
    livingIn: "",
    education: "",
    occupationType: "",
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
    },
    privacy: {
      hideMobile: false,
      hideWhatsapp: false,
      hideEmail: false,
      hideDobYear: false,
      hidePhoto: false,
    },
    deceased: false,
    claimedByEmail: null,
    age: null,
    birthYear: null,
  };
  person.whatsapp = person.mobile;

  await savePerson(person);

  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: "Added family member",
    target: shortName(person),
    before: null,
    after: person,
  });

  refresh();
  redirect(withSavedFlag(safeReturnTo(formData.get("returnTo"), "/me"), "member"));
}

export async function updateHousehold(householdId: string, formData: FormData) {
  const session = await requireSession();
  const db = await getDb();

  const existing = db.households.find((h) => h.id === householdId);
  if (!existing) redirect("/me");
  if (!session.isAdmin && session.person?.householdId !== householdId) redirect("/me");

  const before = clone(existing);
  const household = clone(existing);

  household.address = text(formData, "address");
  household.area = text(formData, "area");
  household.city = text(formData, "city") || "Indore";
  household.pincode = text(formData, "pincode");
  household.gotra = text(formData, "gotra");
  household.nativePlace = text(formData, "nativePlace");
  household.mapsUrl = text(formData, "mapsUrl");
  household.anniversary = text(formData, "anniversary") || null;

  await saveHousehold(household);

  const settled = db.issues
    .filter((issue) => issue.householdId === householdId && !issue.resolved)
    .filter((issue) => householdIssueSettled(issue.field, household))
    .map((issue) => issue.id);
  await resolveIssues(settled);

  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: "Updated household",
    target: household.familyName,
    before,
    after: household,
  });

  refresh();
  redirect(
    withSavedFlag(
      safeReturnTo(formData.get("returnTo"), `/household/${householdId}`),
      "household"
    )
  );
}

/* --------------------------------------------------------------------- feed */

const WEEK = 7 * 86400000;
const POSTS_PER_WEEK = 2;

export async function createPost(formData: FormData) {
  const session = await requireSession();
  const type = text(formData, "type") === "announcement" ? "announcement" : "requirement";

  // Only admins may post announcements
  if (type === "announcement" && !session.isAdmin) redirect("/feed");

  const title = text(formData, "title");
  const body = text(formData, "body");
  // Back to the form they were on, not the other one
  if (!title || !body) {
    redirect(type === "announcement" ? "/feed/new?type=announcement" : "/feed/new");
  }

  const db = await getDb();

  // Spam control: no moderator needed
  if (type === "requirement" && session.person) {
    const recent = db.requirements.filter(
      (r) =>
        r.authorPersonId === session.person!.id &&
        Date.now() - new Date(r.createdAt).getTime() < WEEK
    );
    if (recent.length >= POSTS_PER_WEEK) redirect("/feed?limit=1");
  }

  // The id has to exist before the upload does — the file is filed under it
  const id = newId(type === "announcement" ? "a" : "r");
  const uploaded = text(formData, "photo");
  const photo =
    type === "announcement" && uploaded.startsWith("data:image/")
      ? await storeFile(uploaded, { folder: `posts/${id}`, name: "image" })
      : null;

  const post: Post = {
    id,
    type,
    authorPersonId: session.person?.id ?? null,
    authorName: session.person ? shortName(session.person) : "Samaj Karyakarini",
    authorEmail: session.email,
    title,
    body,
    category: text(formData, "category"),
    area: text(formData, "area"),
    photo,
    pinned: false,
    // A condolence starts with comments off — the committee locks them for
    // condolences as a rule (SPEC §6), so posting one shouldn't need a second
    // step to get there. Any admin can still unlock afterwards.
    commentsLocked:
      type === "announcement" && text(formData, "category") === "Condolence",
    createdAt: new Date().toISOString(),
    // Requirements expire so the feed stays current with no admin effort
    expiresAt:
      type === "requirement"
        ? new Date(Date.now() + 30 * 86400000).toISOString()
        : null,
    isDemo: false,
  };

  await savePost(post);
  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: type === "announcement" ? "Posted announcement" : "Posted requirement",
    target: title,
    before: null,
    after: post,
  });

  refresh();
  redirect(`/feed/${post.id}`);
}

export async function addComment(postId: string, formData: FormData) {
  const session = await requireSession();
  const body = text(formData, "body");
  if (!body) return;

  const db = await getDb();
  const post =
    db.announcements.find((p) => p.id === postId) ??
    db.requirements.find((p) => p.id === postId);
  if (!post || post.commentsLocked) return;

  await saveComment({
    id: newId("cm"),
    postId,
    authorPersonId: session.person?.id ?? null,
    authorName: actorName(session),
    authorEmail: session.email,
    body,
    createdAt: new Date().toISOString(),
  });

  refresh();
}

export async function deleteComment(commentId: string) {
  const session = await requireSession();
  const db = await getDb();
  const comment = db.comments.find((c) => c.id === commentId);
  if (!comment) return;

  // A member may remove their own comment; admins may remove any
  const own = session.person && comment.authorPersonId === session.person.id;
  if (!session.isAdmin && !own) return;

  await deleteCommentRow(commentId);
  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: "Deleted comment",
    target: comment.authorName,
    before: comment,
    after: null,
  });

  refresh();
}

export async function deletePost(postId: string) {
  const session = await requireSession();
  if (!session.isAdmin) return;

  const db = await getDb();
  const post =
    db.announcements.find((p) => p.id === postId) ??
    db.requirements.find((p) => p.id === postId);

  // Row first, file second — the reverse order could leave a live post
  // pointing at an image that is already gone
  await deletePostRow(postId);
  await removeImage(post?.photo);
  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: "Deleted post",
    target: post?.title ?? postId,
    before: post ?? null,
    after: null,
  });

  refresh();
  redirect("/feed");
}

export async function togglePin(postId: string) {
  const session = await requireSession();
  if (!session.isAdmin) return;

  const db = await getDb();
  const post = db.announcements.find((p) => p.id === postId);
  if (!post) return;

  const shouldPin = !post.pinned;
  // Only one pinned announcement at a time — it occupies the Home screen
  await unpinAllAnnouncements();
  if (shouldPin) await savePost({ ...post, pinned: true });

  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: shouldPin ? "Pinned announcement" : "Unpinned announcement",
    target: post.title,
    before: post,
    after: { ...post, pinned: shouldPin },
  });

  refresh();
}

export async function toggleCommentsLock(postId: string) {
  const session = await requireSession();
  if (!session.isAdmin) return;

  const db = await getDb();
  const post =
    db.announcements.find((p) => p.id === postId) ??
    db.requirements.find((p) => p.id === postId);
  if (!post) return;

  await savePost({ ...post, commentsLocked: !post.commentsLocked });

  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: post.commentsLocked ? "Unlocked comments" : "Locked comments",
    target: post.title,
    before: post,
    after: { ...post, commentsLocked: !post.commentsLocked },
  });

  refresh();
}

/* -------------------------------------------------------------------- admin */

export async function resolveIssue(issueId: string) {
  const session = await requireSession();
  if (!session.isAdmin) return;

  await resolveIssues([issueId]);
  refresh();
}

/**
 * One-click undo for the change log. Dispatch is an explicit action → restore
 * map, not a guess from the record's shape — an action this map doesn't name
 * simply isn't undoable, which is a decision the log entry itself makes
 * visible rather than one discovered by a failed click.
 */
export async function undoChange(changeId: string) {
  const session = await requireSession();
  if (!session.isAdmin) return;

  const [db, changeLog] = await Promise.all([getDb(), getChangeLog()]);
  const entry = changeLog.find((c) => c.id === changeId);
  if (!entry || entry.undone || !entry.before) return;

  const before = entry.before as { id?: string };
  if (!before.id) return;

  // A restore brings back the ROW. Files replaced or deleted since are gone
  // from the bucket, so a stored path that no longer matches the live row
  // restores as "no photo" rather than as a permanently broken image.
  // Legacy data URLs are embedded in the row and always survive.
  const liveFile = (
    path: string | null,
    current: string | null | undefined
  ): string | null => (path && (!isStoredPath(path) || path === current) ? path : null);

  switch (entry.action) {
    case "Updated profile": {
      const p = entry.before as Person;
      const current = db.people.find((x) => x.id === p.id);
      await savePerson({
        ...p,
        photo: liveFile(p.photo, current?.photo),
        business: {
          ...p.business,
          visitingCard: liveFile(
            p.business.visitingCard,
            current?.business.visitingCard
          ),
        },
      });
      break;
    }
    case "Updated household":
      await saveHousehold(entry.before as Household);
      break;
    case "Deleted post":
    case "Pinned announcement":
    case "Unpinned announcement":
    case "Locked comments":
    case "Unlocked comments": {
      const p = entry.before as Post;
      const current = [...db.announcements, ...db.requirements].find(
        (x) => x.id === p.id
      );
      await savePost({ ...p, photo: liveFile(p.photo, current?.photo) });
      break;
    }
    case "Deleted comment":
      await saveComment(entry.before as Comment);
      break;
    case "Updated meeting":
    case "Deleted meeting": {
      const m = entry.before as Meeting;
      const current = db.meetings.find((x) => x.id === m.id);
      await saveMeeting({ ...m, photo: liveFile(m.photo, current?.photo) });
      break;
    }
    case "Updated committee member":
    case "Deleted committee member": {
      const c = entry.before as CommitteeMember;
      const current = db.committeeMembers.find((x) => x.id === c.id);
      await saveCommitteeMember({ ...c, photo: liveFile(c.photo, current?.photo) });
      break;
    }
    default:
      // Biodata (its file is gone with it) and anything unrecognised
      return;
  }

  await markChangeUndone(changeId);
  refresh();
}

export async function clearDemoContent() {
  const session = await requireSession();
  if (!session.isAdmin) return;

  await deleteDemoPosts();
  refresh();
  redirect("/feed");
}
