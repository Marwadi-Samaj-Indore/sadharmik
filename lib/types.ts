/**
 * Appearance preference. Declared here rather than in lib/theme.ts because
 * that module is `server-only`, and a client component importing anything from
 * it — even a type — pulls the poison import into the client bundle and stops
 * the whole page hydrating.
 */
export type Theme = "light" | "dark" | "system";

export type Relationship = "self" | "spouse" | "child" | "parent" | "other";

export type OccupationType =
  | "Business owner"
  | "Professional"
  | "Salaried"
  | "Student"
  | "Retired"
  | "Homemaker"
  | "";

export interface Business {
  name: string;
  category: string;
  description: string;
  keywords: string;
  address: string;
  phone: string;
  website: string;
  instagram: string;
  /** Photo of the member's visiting card, uploaded from their phone */
  visitingCard: string | null;
}

export interface Privacy {
  hideMobile: boolean;
  hideWhatsapp: boolean;
  hideEmail: boolean;
  hideDobYear: boolean;
  hidePhoto: boolean;
}

export interface Person {
  id: string;
  householdId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  relationship: Relationship;
  gender: string;
  photo: string | null;
  mobile: string | null;
  whatsapp: string | null;
  email: string;
  dob: string | null;
  bloodGroup: string;
  maritalStatus: string;
  livingIn: string;
  education: string;
  occupationType: OccupationType;
  business: Business;
  privacy: Privacy;
  deceased: boolean;
  claimedByEmail: string | null;
  /** Only present for children imported with an age but no birth date */
  age: number | null;
  birthYear: number | null;
}

export interface Household {
  id: string;
  familyName: string;
  surname: string;
  gotra: string;
  nativePlace: string;
  address: string;
  area: string;
  city: string;
  pincode: string;
  mapsUrl: string;
  photo: string | null;
  anniversary: string | null;
  headPersonId: string | null;
  sourceRow: number;
}

/**
 * Marriage biodata shared by a member.
 *
 * Deliberately not linked to a member record: families share biodata for
 * cousins, nieces and nephews who may live anywhere and often aren't in the
 * samaj at all. The subject is simply a name the uploader types, and one
 * member can share as many as they like.
 *
 * The uploader is the point of contact — the person another family messages.
 */
export interface Biodata {
  id: string;
  /** Name of the person the biodata is for; shown as the title in the feed */
  title: string;
  filePath: string;
  fileType: "pdf" | "image";
  fileName: string;
  note: string;
  uploaderPersonId: string | null;
  uploaderName: string;
  uploaderEmail: string | null;
  createdAt: string;
}

/**
 * A committee circular — the notice that used to go round the WhatsApp group
 * as a PDF and was unfindable by Friday.
 *
 * Deliberately a document rather than a post: circulars are typed on
 * letterhead, signed, and often referred back to months later, so the file
 * itself is the thing. The title and the short note exist to make it findable
 * without opening it.
 *
 * Only the committee posts these. That is the whole point of the word.
 */
export interface Circular {
  id: string;
  title: string;
  /** A line or two on what it says, so members can triage without downloading */
  note: string;
  filePath: string;
  fileType: "pdf" | "image";
  fileName: string;
  authorPersonId: string | null;
  authorName: string;
  authorEmail: string | null;
  createdAt: string;
}

/**
 * A group meeting — monthly get-togethers, outings, themed evenings.
 *
 * Posted by the committee, like an announcement. The Kwik Pic link is added
 * afterwards, once photos from the meeting are ready to share.
 */
export interface Meeting {
  id: string;
  title: string;
  description: string;
  location: string;
  mapsUrl: string | null;
  /** Comma-separated names, e.g. "Suresh & Rekha Jain, Anand Jain" — not necessarily people in the directory */
  organisers: string;
  /** ISO date (yyyy-mm-dd) */
  meetingDate: string;
  /** HH:MM from the time picker. Meetings created before the picker existed
   * may still hold free text like "6:30 PM onwards" — see formatTime(). */
  meetingTime: string;
  photo: string | null;
  kwikPicUrl: string | null;
  /** A Drive folder for the meeting — photos too large for Kwik Pic, or papers */
  driveUrl: string | null;
  authorName: string;
  authorEmail: string | null;
  createdAt: string;
}

/**
 * One member's attendance count for a meeting — "3 of us are coming".
 * One per (meeting, person), upserted if they change their mind.
 */
export interface MeetingRsvp {
  id: string;
  meetingId: string;
  personId: string;
  householdId: string;
  attendeeCount: number;
  responderName: string;
  createdAt: string;
  updatedAt: string;
}

/** A committee office bearer shown on Home — president, patrons, secretaries. */
export interface CommitteeMember {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  photo: string | null;
  sortOrder: number;
}

export type PostType = "announcement" | "requirement";

export interface Post {
  id: string;
  type: PostType;
  authorPersonId: string | null;
  authorName: string;
  authorEmail: string | null;
  title: string;
  body: string;
  category: string;
  area: string;
  photo: string | null;
  pinned: boolean;
  commentsLocked: boolean;
  createdAt: string;
  expiresAt: string | null;
  isDemo?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorPersonId: string | null;
  authorName: string;
  authorEmail: string | null;
  body: string;
  createdAt: string;
}

export type IssueKind =
  | "missing"
  | "review"
  | "unreadable"
  | "extra-value"
  | "child-unreadable"
  | "child-phone"
  | "child-age-order";

export interface Issue {
  id: string;
  householdId: string;
  personId: string | null;
  field: string;
  kind: IssueKind;
  message: string;
  raw: string;
  resolved: boolean;
}

export interface ChangeEntry {
  id: string;
  at: string;
  byEmail: string | null;
  byName: string;
  action: string;
  target: string;
  /** Snapshot of what changed, so an admin can undo it */
  before: unknown;
  after: unknown;
  undone: boolean;
}

export interface Database {
  version: number;
  importedAt: string;
  source: string;
  admins: string[];
  households: Household[];
  people: Person[];
  announcements: Post[];
  requirements: Post[];
  comments: Comment[];
  issues: Issue[];
  biodata: Biodata[];
  circulars: Circular[];
  meetings: Meeting[];
  meetingRsvps: MeetingRsvp[];
  committeeMembers: CommitteeMember[];
}
