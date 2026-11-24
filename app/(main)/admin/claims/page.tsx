import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Search } from "lucide-react";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { setSignInLink } from "@/app/actions/data";
import { BackBar, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { fullName } from "@/lib/util";
import { ICON } from "@/lib/icons";
import { requireMember } from "@/lib/guard";

const MOBILE_ONLY = "verified-by-mobile";

const ERRORS: Record<string, string> = {
  format: "That doesn't look like an email address. Nothing was changed.",
  taken: "That address already signs in as someone else. Unlink it there first.",
};

/**
 * Who signs in as whom, and the committee's way to put a wrong link right.
 *
 * Without a search it lists every claimed profile, newest problems being the
 * ones a member reports, so the admin arrives here with a name to type. With
 * a search it covers everyone, claimed or not, so an address can be linked
 * BEFORE the member's first sign-in: the profile is then reserved for that
 * Google account and the mobile number can't be used to take it.
 */
export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  await requireMember();
  const [db, session, params] = await Promise.all([getDb(), getSession(), searchParams]);
  if (!session.isAdmin) redirect("/me");

  const q = (params.q ?? "").trim().toLowerCase();
  const familyOf = new Map(db.households.map((h) => [h.id, h.familyName]));

  const living = db.people.filter((p) => !p.deceased);
  const rows = (
    q
      ? living.filter((p) =>
          [fullName(p), familyOf.get(p.householdId), p.mobile, p.claimedByEmail, p.email]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : living.filter((p) => p.claimedByEmail)
  )
    .sort((a, b) => fullName(a).localeCompare(fullName(b)))
    .slice(0, 60);

  const claimedCount = living.filter((p) => p.claimedByEmail).length;
  const error = params.error ? ERRORS[params.error] : null;

  return (
    <>
      <BackBar label="Sign-in links" href="/admin" />

      <div className="px-4 pt-5">
        <h1 className="text-title">Sign-in links</h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Which Google account opens which profile. If a member says someone
          else is signed in as them, find them here and unlink it, or type
          their own Gmail address. Any phone signed in under the old link is
          signed out.
        </p>

        <form action="/admin/claims" className="mt-4 flex gap-2">
          <label htmlFor="q" className="sr-only">
            Search members
          </label>
          <input
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Name, family, mobile or email"
            className="field flex-1"
          />
          <button type="submit" className="btn btn-secondary" aria-label="Search">
            <Search size={ICON.sm} />
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-3 flex items-start gap-1.5 rounded-inner bg-danger-soft px-3 py-2 text-sm text-danger">
            <AlertCircle size={ICON.sm} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <p className="mt-4 text-xs text-ink-faint">
          {q ? (
            <>
              {rows.length === 60 ? "First 60 matches" : `${rows.length} found`} for
              &ldquo;{params.q}&rdquo;.{" "}
              <Link href="/admin/claims" className="underline underline-offset-2">
                Show claimed profiles
              </Link>
            </>
          ) : (
            <>
              <span className="tnum">{claimedCount}</span> claimed profiles
              {claimedCount > 60 && ", first 60 shown. Search to find one"}.
            </>
          )}
        </p>

        <ul className="mt-2 space-y-2 pb-6">
          {rows.map((p) => {
            const claim = p.claimedByEmail;
            const google = claim && claim !== MOBILE_ONLY ? claim : null;
            return (
              <li key={p.id} className="card p-3.5">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <Link href={`/person/${p.id}`} className="block truncate text-sm font-semibold">
                      {fullName(p)}
                    </Link>
                    <p className="truncate text-xs text-ink-soft">
                      {familyOf.get(p.householdId)}
                    </p>
                  </div>
                  {google ? (
                    <Badge tone="success">Google</Badge>
                  ) : claim ? (
                    <Badge tone="warn">Mobile only</Badge>
                  ) : (
                    <Badge>Not linked</Badge>
                  )}
                </div>

                <p className="mt-1.5 break-all text-xs text-ink-soft">
                  {google
                    ? google
                    : claim
                      ? "Signed in with the mobile number only, no Google account yet"
                      : "Nobody has signed in as this member"}
                </p>

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-clay-text">
                    Change
                  </summary>
                  <form action={setSignInLink.bind(null, p.id)} className="mt-2 space-y-2">
                    <input type="hidden" name="q" value={params.q ?? ""} />
                    <label htmlFor={`email-${p.id}`} className="label">
                      Their own Gmail address (leave blank to unlink)
                    </label>
                    <input
                      id={`email-${p.id}`}
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="off"
                      defaultValue={google ?? ""}
                      placeholder="name@gmail.com"
                      className="field"
                    />
                    <SubmitButton pendingLabel="Saving…" className="btn btn-primary w-full">
                      Save link
                    </SubmitButton>
                  </form>
                </details>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
