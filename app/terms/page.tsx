import type { Metadata, Viewport } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms | Marwadi Samaj Indore" };
export const viewport: Viewport = { themeColor: "#f6ece2" };

/**
 * Public, like /privacy, because Google's sign-in branding page asks for both
 * links on the app's own domain. Kept short and true to how the app is run:
 * a free directory for one samaj's members, run by its committee.
 */
export default function TermsPage() {
  return (
    <main
      className="on-cream mx-auto max-w-xl px-6 pb-16 text-sm leading-relaxed text-ink-soft"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 2.5rem)" }}
    >
      <h1 className="font-serif text-tab-title font-semibold text-ink">Terms of use</h1>
      <p className="mt-1 text-xs text-ink-faint">
        Marwadi Samaj Indore app · Shri Jain Shwetambar Murtipujak Marwadi Samaj, Indore
      </p>

      <ul className="mt-7 list-disc space-y-3 pl-5">
        <li>
          The app is free, and is only for members of Shri Jain Shwetambar Murtipujak
          Marwadi Samaj, Indore. It is run by the samaj committee.
        </li>
        <li>
          Members&apos; details are shared in trust. Use them to stay in touch within the
          samaj, not for advertising, bulk messages, or passing on to anyone outside it.
        </li>
        <li>
          Keep your own details correct, and add or change a family member&apos;s only
          with their agreement.
        </li>
        <li>
          Posts, matrimonial profiles and circulars must be respectful. The committee
          may edit or remove anything that isn&apos;t, and may remove access from anyone
          who misuses the directory.
        </li>
        <li>
          The committee does its best to keep the directory accurate, but cannot
          promise every entry is complete or up to date.
        </li>
        <li>
          How members&apos; details are kept is set out in the{" "}
          <Link href="/privacy" className="font-semibold text-clay-text">
            privacy page
          </Link>
          . Questions: {" "}
          <a className="font-semibold text-clay-text" href="mailto:marwadisamajindore@gmail.com">
            marwadisamajindore@gmail.com
          </a>
          .
        </li>
      </ul>

      <p className="mt-10">
        <Link href="/login" className="font-semibold text-clay-text">
          ← Back to sign in
        </Link>
      </p>
    </main>
  );
}
