import type { Metadata, Viewport } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy — Marwadi Samaj Indore" };
export const viewport: Viewport = { themeColor: "#fdf8f1" };

/**
 * The one page anyone can read without signing in.
 *
 * Google won't let an app's sign-in leave "Testing" without a public privacy
 * policy on the app's own domain, and every other page here is behind the
 * sign-in. It lives outside the (main) group for exactly that reason — that
 * group's layout is what sends visitors to /login.
 *
 * Written to describe what the code actually does. If the app starts doing
 * something new with members' data, this page changes in the same commit.
 */
export default function PrivacyPage() {
  return (
    <main
      className="on-cream mx-auto max-w-xl px-6 pb-16 text-sm leading-relaxed text-ink-soft"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 2.5rem)" }}
    >
      <h1 className="font-serif text-tab-title font-semibold text-ink">Privacy</h1>
      <p className="mt-1 text-xs text-ink-faint">
        Marwadi Samaj Indore app · Shri Jain Shwetambar Murtipujak Marwadi Samaj, Indore
      </p>

      <h2 className="mt-7 font-display text-base font-bold text-ink">What this app is</h2>
      <p className="mt-2">
        A private member directory for the samaj. Only members can sign in, and
        nothing in it is public or listed by search engines.
      </p>

      <h2 className="mt-6 font-display text-base font-bold text-ink">What it holds</h2>
      <p className="mt-2">
        The details families gave the samaj on its directory forms — names,
        relations, ages, mobile numbers, addresses, gotra and native place — and
        anything members add themselves, such as a photo, date of birth, wedding
        anniversary, education and business details.
      </p>

      <h2 className="mt-6 font-display text-base font-bold text-ink">Signing in with Google</h2>
      <p className="mt-2">
        If you choose Google, the app receives only your name and email address.
        It uses the email address to recognise you on later visits, and nothing
        else. It cannot see your Gmail, contacts, Drive or anything in your Google
        account.
      </p>

      <h2 className="mt-6 font-display text-base font-bold text-ink">Who can see it</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Signed-in members of the samaj can see the directory.</li>
        <li>
          You can hide your mobile, WhatsApp, email, birth year and photo from other
          members in your profile.
        </li>
        <li>The samaj committee can edit records to keep the directory correct.</li>
      </ul>

      <h2 className="mt-6 font-display text-base font-bold text-ink">What it never does</h2>
      <p className="mt-2">
        No advertising, no tracking, and your details are never sold or shared
        outside the samaj. The only cookies are the ones that keep you signed in
        and remember your light or dark setting.
      </p>

      <h2 className="mt-6 font-display text-base font-bold text-ink">Where it is stored</h2>
      <p className="mt-2">
        In a private database and photo store run by Supabase, in Mumbai, India.
        The app itself runs on Vercel.
      </p>

      <h2 className="mt-6 font-display text-base font-bold text-ink">Changing or removing your details</h2>
      <p className="mt-2">
        Edit your profile at any time under the Me tab. To have your record or
        your family&apos;s removed, write to{" "}
        <a className="font-semibold text-kesar-text" href="mailto:marwadisamajindore@gmail.com">
          marwadisamajindore@gmail.com
        </a>
        .
      </p>

      <p className="mt-10">
        <Link href="/login" className="font-semibold text-kesar-text">
          ← Back to sign in
        </Link>
      </p>
    </main>
  );
}
