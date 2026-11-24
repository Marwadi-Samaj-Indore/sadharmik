"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "node:crypto";
import { getDb, savePerson } from "@/lib/db";
import {
  clearGoogleEmail,
  clearSession,
  clearVerifiedHouseholds,
  getSession,
  googleEmail,
  grantVerifiedHouseholds,
  setSession,
  verifiedHouseholds,
} from "@/lib/session";
import { checkSignInRate, recordFailedSignIn } from "@/lib/ratelimit";
import { shortName } from "@/lib/util";
import { COMMITTEE_CODE_SIGN_IN, MOBILE_SIGN_IN } from "@/lib/signin";

/**
 * Answering the mobile gate is itself proof of ownership, so record the
 * profile as claimed. Where the member arrived through Google, the address
 * recorded here is the one they proved — which is what lets every later visit
 * skip the gate entirely. This is also what the admin completion dashboard
 * counts to see who has actually opened the app.
 *
 * An address already on the row is never overwritten: a second person in the
 * household signing in must not take over the first one's claim.
 */
const MOBILE_ONLY = "verified-by-mobile";

/** Returns the profile as it stands afterwards, for the session fingerprint. */
async function claimProfile(personId: string, email: string | null) {
  const db = await getDb();
  const person = db.people.find((p) => p.id === personId);
  if (!person) return null;
  // The mobile-only placeholder gives way to a real address, so a member who
  // signed in before Google was switched on is still recognised after it
  const placeholder = person.claimedByEmail === MOBILE_ONLY;
  if (person.claimedByEmail && !(placeholder && email)) return person;

  const claimed = { ...person, claimedByEmail: email ?? MOBILE_ONLY };
  await savePerson(claimed);
  return claimed;
}

/**
 * True when this profile already belongs to a different Google account.
 *
 * The mobile number is an introduction, not proof: numbers are printed in the
 * samaj's book. Before this check, anyone with a Google account and a member's
 * number could sign in AS that member even after the member had linked their
 * own Google address — the claim was left alone but the session was still
 * handed over. A profile linked to someone else's address is now out of reach
 * by number; its owner signs in with their own Google account.
 */
function linkedElsewhere(person: { claimedByEmail: string | null }, proven: string | null) {
  const claim = person.claimedByEmail;
  if (!claim || claim === MOBILE_ONLY) return false;
  return claim.toLowerCase() !== (proven ?? "").toLowerCase();
}

export interface VerifyState {
  error?: string;
  candidates?: { id: string; name: string; household: string }[];
}

/**
 * The identity gate: a member proves which profile is theirs by entering the
 * full mobile number the committee already holds for them.
 *
 * This deliberately asks for all ten digits rather than the last four. With
 * 147 numbers in the directory, a four-digit answer means roughly one in
 * sixty-eight random guesses would land on a real member — far too weak for a
 * publicly reachable link. Ten digits means an outsider must already know a
 * member's number, which makes guessing pointless.
 */
export async function verifyMobile(
  _prev: VerifyState,
  formData: FormData
): Promise<VerifyState> {
  const rate = await checkSignInRate();
  if (!rate.allowed) {
    return {
      error: `Too many attempts. Please try again in ${rate.minutesUntilReset} minute${
        rate.minutesUntilReset === 1 ? "" : "s"
      }.`,
    };
  }

  // When the number isn't a way in by itself, it only follows Google
  if (!MOBILE_SIGN_IN && !(await googleEmail())) {
    return { error: "Please continue with Google first." };
  }

  let digits = String(formData.get("mobile") ?? "").replace(/\D/g, "");
  // Accept 0XXXXXXXXX and +91XXXXXXXXXX as well as the plain ten digits
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);

  if (digits.length !== 10) {
    await recordFailedSignIn();
    return { error: "Please enter your full 10-digit mobile number." };
  }

  const db = await getDb();
  const directMatches = db.people.filter((p) => p.mobile === digits);

  if (directMatches.length === 0) {
    await recordFailedSignIn();
    return {
      error:
        "That number isn't in the directory yet. Ask a committee member to add it to your profile, then try again.",
    };
  }

  // The number usually belongs to just the head of household, but everyone
  // living there — spouse, parents, children — should be able to sign in
  // with it and then pick which of them they are.
  const householdIds = new Set(directMatches.map((p) => p.householdId));
  const proven = await googleEmail();
  const matches = db.people.filter(
    (p) => householdIds.has(p.householdId) && !p.deceased && !linkedElsewhere(p, proven)
  );

  if (matches.length === 0) {
    await recordFailedSignIn();
    return {
      error:
        "Everyone on this number has already linked a Google account. If one of them is you, sign in with that Google account instead, or ask a committee member.",
    };
  }

  if (matches.length > 1) {
    // The pick happens in a later request, so leave proof of THIS step with
    // the browser — chooseIdentity refuses any person outside these households
    await grantVerifiedHouseholds([...householdIds]);
    return {
      candidates: matches.map((p) => ({
        id: p.id,
        name: shortName(p),
        household:
          db.households.find((h) => h.id === p.householdId)?.familyName ?? "",
      })),
    };
  }

  const claimed = await claimProfile(matches[0].id, proven);
  await clearGoogleEmail();
  await setSession(null, claimed);
  redirect("/");
}

/**
 * Used when several members share a number — usually a husband and wife.
 * Only honoured while the signed proof from verifyMobile is fresh, and only
 * for a person inside the household that proof names. Person ids are
 * sequential ("p187"), so an unverified id here would be an open door.
 */
export async function chooseIdentity(formData: FormData) {
  const rate = await checkSignInRate();
  if (!rate.allowed) redirect("/verify");

  const verified = await verifiedHouseholds();
  if (!verified) redirect("/verify");

  const personId = String(formData.get("personId") ?? "");
  const db = await getDb();
  const person = db.people.find((p) => p.id === personId);
  const proven = await googleEmail();
  if (!person || !verified.has(person.householdId) || linkedElsewhere(person, proven)) {
    await recordFailedSignIn();
    redirect("/verify");
  }

  await clearVerifiedHouseholds();
  const claimed = await claimProfile(person.id, proven);
  await clearGoogleEmail();
  await setSession(null, claimed);
  redirect("/");
}

/**
 * Hands the app to another member of your own household.
 *
 * Google gives us one address per account, and one address can only name one
 * person — so where a family shares a single Gmail, whoever signs in first
 * claims it and everyone else arrives as them. This is the way back out:
 * the wife using her husband's account taps her own name and the app is hers
 * for the rest of the session.
 *
 * It grants nothing new. Household members can already edit each other's
 * profiles (`canEdit`), so the only thing changing hands is which profile the
 * app treats as "you". Admin rights are deliberately not carried across —
 * those live on the email cookie, which this leaves exactly as it found it,
 * so switching can never be a way to become a committee member.
 */
export async function switchToHouseholdMember(personId: string) {
  const session = await getSession();
  if (!session.person) redirect("/me");

  const db = await getDb();
  const target = db.people.find((p) => p.id === personId);
  if (
    !target ||
    target.deceased ||
    target.householdId !== session.person.householdId
  ) {
    redirect("/me");
  }

  await setSession(session.email, target);
  revalidatePath("/", "layout");
  redirect("/me?saved=switched");
}

export interface AdminState {
  error?: string;
}

/**
 * Interim committee sign-in, protected by a shared code held in the
 * ADMIN_ACCESS_CODE environment variable. Without this the live site would
 * hand full admin rights to anyone who tapped the button.
 *
 * Closed on the live site (COMMITTEE_CODE_SIGN_IN in lib/signin.ts): admin
 * status now comes from the committee's own Google accounts. The check here,
 * not just the hidden form, is what closes it — a server action can be called
 * without the page that renders its form.
 */
export async function signInAsAdmin(
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  if (!COMMITTEE_CODE_SIGN_IN) {
    return { error: "Committee members sign in with Google." };
  }

  const rate = await checkSignInRate();
  if (!rate.allowed) {
    return {
      error: `Too many attempts. Please try again in ${rate.minutesUntilReset} minutes.`,
    };
  }

  const expected = process.env.ADMIN_ACCESS_CODE;
  if (!expected) {
    return {
      error:
        "Committee sign-in is not configured. Set ADMIN_ACCESS_CODE in the site settings.",
    };
  }

  const supplied = String(formData.get("code") ?? "").trim();
  // Compared as fixed-length digests in constant time, so response timing
  // reveals nothing about how much of a guess was right
  const digest = (v: string) => createHash("sha256").update(v).digest();
  if (!timingSafeEqual(digest(supplied), digest(expected))) {
    await recordFailedSignIn();
    return { error: "That code is not correct." };
  }

  const db = await getDb();
  const email = db.admins[0];
  const linked = db.people.find((p) => p.claimedByEmail === email) ?? null;

  await setSession(email, linked);
  redirect("/");
}

export async function signOut() {
  await clearSession();
  redirect("/login");
}
