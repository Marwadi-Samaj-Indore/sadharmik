import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { shortName } from "./util";
import type { Person } from "./types";

/**
 * Session handling.
 *
 * Signing in sets a cookie holding the member's email and person id. The real
 * flow is identical from the app's point of view — swapping in Supabase's
 * Google auth means replacing `signIn` and reading the verified email from
 * Supabase instead of the cookie. Everything downstream is unchanged.
 *
 * Every identity cookie is HMAC-signed. A cookie is client-controlled storage:
 * without a signature, typing `sdm_person=p1` into devtools would sign the
 * visitor in as member p1, and a guessed committee email would grant admin —
 * the ten-digit mobile gate walked around entirely. The signature makes a
 * cookie only settable by us. The key comes from SESSION_SECRET, falling back
 * to the Supabase service key so no new configuration is needed anywhere;
 * rotating either key simply signs everyone out to the mobile gate again.
 */

const EMAIL_COOKIE = "sdm_email";
const PERSON_COOKIE = "sdm_person";
/** Proof that this browser just answered the mobile gate — see verifiedHouseholds. */
const VERIFY_COOKIE = "sdm_verify";
const VERIFY_WINDOW_MS = 5 * 60 * 1000;
/** The Google address this browser just proved it owns — see googleEmail. */
const GOOGLE_COOKIE = "sdm_google";
const GOOGLE_WINDOW_MS = 15 * 60 * 1000;

function secret(): string {
  const key = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Sessions are not configured. Set SESSION_SECRET (or SUPABASE_SERVICE_ROLE_KEY) in .env.local."
    );
  }
  return key;
}

const signatureOf = (value: string) =>
  createHmac("sha256", secret()).update(value).digest("base64url").slice(0, 32);

const signed = (value: string) => `${value}.${signatureOf(value)}`;

/** Returns the cookie's payload only if the signature checks out. Emails
    contain dots, so the signature is everything after the LAST dot. */
function unsign(raw: string | undefined): string | null {
  if (!raw) return null;
  const at = raw.lastIndexOf(".");
  if (at <= 0) return null;
  const value = raw.slice(0, at);
  const sig = Buffer.from(raw.slice(at + 1));
  const expected = Buffer.from(signatureOf(value));
  if (sig.length !== expected.length) return null;
  return timingSafeEqual(sig, expected) ? value : null;
}

export interface Session {
  email: string | null;
  person: Person | null;
  isAdmin: boolean;
  isSignedIn: boolean;
}

export async function getSession(): Promise<Session> {
  const jar = await cookies();
  const email = unsign(jar.get(EMAIL_COOKIE)?.value);
  const personId = unsign(jar.get(PERSON_COOKIE)?.value);

  if (!email && !personId) {
    return { email: null, person: null, isAdmin: false, isSignedIn: false };
  }

  const db = await getDb();
  const person = personId ? db.people.find((p) => p.id === personId) ?? null : null;
  const isAdmin = Boolean(email && db.admins.includes(email.toLowerCase()));

  return { email, person, isAdmin, isSignedIn: Boolean(email || person) };
}

/**
 * Signature check only — no database read. For hot paths that need "is this
 * a member?" and nothing else, like the photo route, where the full
 * `getSession` would load the entire directory once per image request.
 */
export async function getSessionLite(): Promise<{ isSignedIn: boolean }> {
  const jar = await cookies();
  const email = unsign(jar.get(EMAIL_COOKIE)?.value);
  const personId = unsign(jar.get(PERSON_COOKIE)?.value);
  return { isSignedIn: Boolean(email || personId) };
}

export async function setSession(email: string | null, personId: string | null) {
  const jar = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  };

  if (email) jar.set(EMAIL_COOKIE, signed(email), options);
  else jar.delete(EMAIL_COOKIE);

  if (personId) jar.set(PERSON_COOKIE, signed(personId), options);
  else jar.delete(PERSON_COOKIE);
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(EMAIL_COOKIE);
  jar.delete(PERSON_COOKIE);
  jar.delete(GOOGLE_COOKIE);
  jar.delete(VERIFY_COOKIE);
}

/**
 * The mobile gate is a two-step flow when a number is shared: verify the
 * number, then pick which household member you are. The pick arrives in a
 * later request, so the proof from step one has to travel with the browser —
 * a short-lived signed cookie naming the household(s) the number matched.
 * Without it, the second step would be trusting a person id typed by the
 * client, which is no gate at all.
 */
export async function grantVerifiedHouseholds(householdIds: string[]) {
  const jar = await cookies();
  const payload = `${householdIds.join(",")}|${Date.now() + VERIFY_WINDOW_MS}`;
  jar.set(VERIFY_COOKIE, signed(payload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.ceil(VERIFY_WINDOW_MS / 1000),
  });
}

/** The household ids this browser verified a mobile number for, if the
    five-minute window is still open. */
export async function verifiedHouseholds(): Promise<Set<string> | null> {
  const jar = await cookies();
  const payload = unsign(jar.get(VERIFY_COOKIE)?.value);
  if (!payload) return null;
  const [ids, expires] = payload.split("|");
  if (!ids || Date.now() > Number(expires)) return null;
  return new Set(ids.split(","));
}

export async function clearVerifiedHouseholds() {
  (await cookies()).delete(VERIFY_COOKIE);
}

/**
 * Google proves an email address, not a person: it cannot tell us which of the
 * 452 members is holding the phone, because the directory arrived with almost
 * no email addresses in it. So a first-time member signs in with Google and
 * then answers the mobile gate once, and we record the address on their row —
 * from then on Google alone identifies them and the gate never returns.
 *
 * Between those two steps the proven address has to survive a redirect and a
 * couple of form posts, which means the browser carries it. Signed, so it is
 * ours; short-lived, because it is a step in a flow rather than a session.
 */
export async function grantGoogleEmail(email: string) {
  const jar = await cookies();
  const payload = `${email}|${Date.now() + GOOGLE_WINDOW_MS}`;
  jar.set(GOOGLE_COOKIE, signed(payload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.ceil(GOOGLE_WINDOW_MS / 1000),
  });
}

/** The Google address this browser proved, while the window is still open. */
export async function googleEmail(): Promise<string | null> {
  const jar = await cookies();
  const payload = unsign(jar.get(GOOGLE_COOKIE)?.value);
  if (!payload) return null;
  const at = payload.lastIndexOf("|");
  if (at <= 0) return null;
  const email = payload.slice(0, at);
  return Date.now() > Number(payload.slice(at + 1)) ? null : email;
}

export async function clearGoogleEmail() {
  (await cookies()).delete(GOOGLE_COOKIE);
}

/** Who is allowed to edit this person: themselves, their household, or an admin. */
export function canEdit(session: Session, target: Person): boolean {
  if (session.isAdmin) return true;
  if (!session.person) return false;
  if (session.person.id === target.id) return true;
  return session.person.householdId === target.householdId;
}

/** How a change-log entry names its actor. */
export const actorName = (session: Session) =>
  session.person
    ? shortName(session.person)
    : session.isAdmin
      ? "Committee admin"
      : "A member";
