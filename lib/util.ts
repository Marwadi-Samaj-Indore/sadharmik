import type { Household, Person } from "./types";

/* --------------------------------------------------------------------- names */

/**
 * The spreadsheet arrived with names typed every which way — "Rajesh kumar",
 * "JAIN" — and the serif hero is the proudest typography in the app, so raw
 * casing there reads as neglect. Words typed all-lower or ALL-CAPS get a
 * capital; anything mixed-case ("McDonald") is someone's deliberate spelling
 * and passes through untouched.
 */
const properWord = (w: string) => {
  const lower = w.toLowerCase();
  if (w === lower || w === w.toUpperCase())
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  return w;
};

export const properCase = (value: string) =>
  value.split(/\s+/).map(properWord).join(" ");

export const fullName = (p: Person) =>
  properCase([p.firstName, p.middleName, p.lastName].filter(Boolean).join(" "));

export const shortName = (p: Person) =>
  properCase([p.firstName, p.lastName].filter(Boolean).join(" "));

/** First letter of each name — skipping stray punctuation the import left
    behind ("& Veera" must not monogram as "&"). */
const firstLetter = (s: string) => s.match(/[A-Za-z]/)?.[0] ?? "";

export const initials = (p: Person) =>
  `${firstLetter(p.firstName)}${firstLetter(p.lastName)}`.toUpperCase() || "?";

export const RELATIONSHIP_LABEL: Record<string, string> = {
  self: "Head of household",
  spouse: "Spouse",
  child: "Son / Daughter",
  parent: "Parent",
  other: "Family member",
};

/** Son/Daughter or Father/Mother where gender is known, else the generic label. */
export function relationshipLabel(person: Person): string {
  if (person.relationship === "child") {
    if (person.gender === "male") return "Son";
    if (person.gender === "female") return "Daughter";
  }
  if (person.relationship === "parent") {
    if (person.gender === "male") return "Father";
    if (person.gender === "female") return "Mother";
  }
  return RELATIONSHIP_LABEL[person.relationship] ?? "Family member";
}

/* --------------------------------------------------------------------- dates */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Parses an ISO date without timezone drift. */
export function parts(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

export function formatDate(iso: string | null, opts: { year?: boolean } = {}) {
  const p = parts(iso);
  if (!p) return "";
  const base = `${p.day} ${MONTHS[p.month - 1].slice(0, 3)}`;
  return opts.year === false ? base : `${base} ${p.year}`;
}

export function formatDateLong(iso: string | null) {
  const p = parts(iso);
  if (!p) return "";
  return `${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
}

/**
 * A <input type="time"> value ("19:00") said the way a person would say it
 * ("7:00 PM"). Meeting times written before the picker existed are free text
 * ("6:30 PM onwards") and don't match the HH:MM shape, so they pass through
 * unchanged — old meetings keep displaying exactly as they were typed.
 */
export function formatTime(value: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const hours = Number(match[1]);
  const period = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${match[2]} ${period}`;
}

export function ageFrom(iso: string | null, today = new Date()): number | null {
  const p = parts(iso);
  if (!p) return null;
  let age = today.getFullYear() - p.year;
  const beforeBirthday =
    today.getMonth() + 1 < p.month ||
    (today.getMonth() + 1 === p.month && today.getDate() < p.day);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

export function relativeTime(iso: string, now = new Date()) {
  const diff = now.getTime() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(new Date(iso).toISOString().slice(0, 10));
}

/* -------------------------------------------------------------------- photos */

/** A stored value is either a bucket path we wrote, or a legacy data URL. */
export const isStoredPath = (value: string | null | undefined): value is string =>
  Boolean(value && !value.startsWith("data:") && !value.startsWith("http"));

/**
 * Turns whatever is in the database into something an <img> can load.
 * Bucket paths go through /api/photo, which checks the session first.
 * Legacy embedded images still render, so nothing breaks mid-migration.
 */
export function photoUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  return isStoredPath(value) ? `/api/photo/${value}` : value;
}

/* --------------------------------------------------------------------- links */

/**
 * A committee member sometimes pastes a Google Maps link into a plain-text
 * field (a post's "area", say) instead of a location name. Catching that
 * lets the UI offer it as a link instead of showing the raw URL in a tag.
 */
export const isUrl = (value: string) => /^https?:\/\//i.test(value.trim());

/**
 * A condolence notice is an announcement whose category is "Condolence" —
 * the one announcement kind that must never share the feed's celebratory
 * visual language. The kind lives in the existing category field (unused on
 * announcements until now), so no schema change was needed.
 */
export const isCondolence = (post: { type: string; category: string }) =>
  post.type === "announcement" && post.category === "Condolence";

export const telLink = (phone: string) => `tel:+91${phone}`;

export const whatsappLink = (phone: string, message?: string) =>
  `https://wa.me/91${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

export const mapsLink = (household: Household) =>
  household.mapsUrl ||
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [household.address, household.area, household.city].filter(Boolean).join(", ")
  )}`;

export const displayPhone = (phone: string) =>
  `${phone.slice(0, 5)} ${phone.slice(5)}`;

/* ---------------------------------------------------------------- completion */

/**
 * Profile completeness. Weighted towards the fields that make the app useful:
 * a photo, a contact number, a birthday, and what the person does for a living.
 */
const WEIGHTS: { key: string; weight: number; has: (p: Person) => boolean }[] = [
  { key: "name", weight: 1, has: (p) => Boolean(p.firstName && p.lastName) },
  { key: "photo", weight: 2, has: (p) => Boolean(p.photo) },
  { key: "mobile", weight: 2, has: (p) => Boolean(p.mobile) },
  { key: "whatsapp", weight: 1, has: (p) => Boolean(p.whatsapp) },
  { key: "dob", weight: 2, has: (p) => Boolean(p.dob) },
  { key: "gender", weight: 1, has: (p) => Boolean(p.gender) },
  { key: "bloodGroup", weight: 1, has: (p) => Boolean(p.bloodGroup) },
  { key: "education", weight: 1, has: (p) => Boolean(p.education) },
  { key: "livingIn", weight: 1, has: (p) => Boolean(p.livingIn) },
  { key: "occupation", weight: 2, has: (p) => Boolean(p.occupationType) },
  { key: "businessCategory", weight: 2, has: (p) => Boolean(p.business.category) },
  { key: "businessName", weight: 1, has: (p) => Boolean(p.business.name) },
  { key: "keywords", weight: 1, has: (p) => Boolean(p.business.keywords) },
];

export function completion(p: Person) {
  const total = WEIGHTS.reduce((a, w) => a + w.weight, 0);
  const got = WEIGHTS.filter((w) => w.has(p)).reduce((a, w) => a + w.weight, 0);
  return Math.round((got / total) * 100);
}

export function missingFields(p: Person): string[] {
  const labels: Record<string, string> = {
    photo: "Photo",
    mobile: "Mobile number",
    whatsapp: "WhatsApp number",
    dob: "Date of birth",
    gender: "Gender",
    bloodGroup: "Blood group",
    education: "Education",
    livingIn: "Currently living in",
    occupation: "Occupation type",
    businessCategory: "Business category",
    businessName: "Business name",
    keywords: "Products & services",
  };
  return WEIGHTS.filter((w) => !w.has(p) && labels[w.key]).map((w) => labels[w.key]);
}

/* ------------------------------------------------------------------- issues */

/**
 * Whether a save settles an open data-quality issue from the import. The
 * field names are the ones the importer writes into `issues.field`. One map,
 * shared by the person and household actions — adding an issue kind means
 * one edit here, not one per action.
 */
export const personIssueSettled = (field: string, p: Person): boolean =>
  (field === "mobile" && Boolean(p.mobile)) ||
  (field === "whatsapp" && Boolean(p.whatsapp)) ||
  (field === "dob" && Boolean(p.dob)) ||
  (field === "name" && Boolean(p.firstName && p.lastName));

export const householdIssueSettled = (field: string, h: Household): boolean =>
  (field === "address" && Boolean(h.address)) ||
  (field === "area" && Boolean(h.area)) ||
  (field === "anniversary" && Boolean(h.anniversary));

/* ------------------------------------------------------------------- search */

/**
 * Spelling-tolerant matching. Jain surnames get transliterated many ways, so
 * "Sanghavi" has to find "Sanghvi" and "Jain" has to find "JAIN".
 */
export function normalizeForSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\bchh/g, "ch")
    .replace(/\bkh/g, "k")
    .replace(/\bgh/g, "g")
    .replace(/\bph/g, "f")
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/([a-z])\1+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export const matchesQuery = (haystack: string, query: string) => {
  const q = normalizeForSearch(query);
  if (!q) return true;
  const h = normalizeForSearch(haystack);
  return q.split(" ").every((term) => h.includes(term));
};
