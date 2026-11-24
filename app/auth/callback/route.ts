import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getDb, savePerson } from "@/lib/db";
import { grantGoogleEmail, setSession } from "@/lib/session";

/**
 * Where Google sends the member back.
 *
 * Google proves an email address. That is enough to recognise somebody we have
 * seen before, but not enough to know which of the 452 members a newcomer is —
 * the directory arrived from a spreadsheet with almost no email addresses. So
 * this route sorts arrivals into two: a known address signs straight in, an
 * unknown one goes to the mobile gate once and is recorded on the way through.
 *
 * Supabase's own auth session is used for exactly one thing — reading the
 * verified address — and then discarded. The app's session stays the signed
 * cookie it already was, so nothing downstream of sign-in has to know that
 * Google is involved at all.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const home = new URL("/", url.origin);
  const login = new URL("/login", url.origin);

  // The member tapped "Cancel" on Google's consent screen
  if (url.searchParams.get("error")) {
    login.searchParams.set("error", "cancelled");
    return NextResponse.redirect(login);
  }

  const code = url.searchParams.get("code");
  if (!code) {
    login.searchParams.set("error", "failed");
    return NextResponse.redirect(login);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    login.searchParams.set("error", "config");
    return NextResponse.redirect(login);
  }

  const jar = await cookies();
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) jar.set(name, value, options);
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  // Only a Google-verified address counts. Admin rights hang off the email, so
  // an address arriving through any other Supabase provider (email sign-up is
  // on by default) must never be taken at its word.
  const fromGoogle =
    data?.user?.app_metadata?.provider === "google" ||
    Boolean(data?.user?.identities?.some((i) => i.provider === "google"));
  const email = fromGoogle ? data?.user?.email?.toLowerCase() ?? null : null;

  // Supabase is asked not to return users without an address, but a provider
  // that misbehaves must not become an anonymous way in
  if (error || !email) {
    login.searchParams.set("error", "failed");
    return NextResponse.redirect(login);
  }

  // The address is all we wanted; the app's own signed cookie is the session
  await supabase.auth.signOut();

  const db = await getDb();
  let person = db.people.find(
    (p) => p.claimedByEmail && p.claimedByEmail.toLowerCase() === email
  );

  // The paper form asks for an email, and the committee types it into the
  // sheet. Where exactly one unclaimed member carries this address, the form
  // has already introduced them: link it now and skip the mobile step. A
  // family address shared by several members proves nothing about which one
  // is holding the phone, so those still answer the mobile question.
  if (!person) {
    const unclaimed = db.people.filter(
      (p) =>
        !p.deceased &&
        p.email.toLowerCase() === email &&
        (!p.claimedByEmail || p.claimedByEmail === "verified-by-mobile")
    );
    if (unclaimed.length === 1) {
      person = { ...unclaimed[0], claimedByEmail: email };
      await savePerson(person);
    }
  }
  const isAdmin = db.admins.includes(email);

  if (person || isAdmin) {
    await setSession(isAdmin ? email : null, person ?? null);
    return NextResponse.redirect(home);
  }

  // First time here: prove which member this is, then we remember the address
  await grantGoogleEmail(email);
  return NextResponse.redirect(new URL("/verify", url.origin));
}
