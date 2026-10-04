import Link from "next/link";
import {
  Pencil,
  Shield,
  Share2,
  LogOut,
  Home,
  EyeOff,
  Info,
  UserPlus,
  ArrowLeftRight,
} from "lucide-react";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { signOut, switchToHouseholdMember } from "@/app/actions/auth";
import { getTheme } from "@/lib/theme";
import { ThemeChoice } from "@/components/ThemeChoice";
import { Avatar } from "@/components/Avatar";
import { PageTitle, Meter, SectionHeading, Badge, DetailRow } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { completion, fullName, missingFields, relationshipLabel } from "@/lib/util";
import { ICON } from "@/lib/icons";

export default async function MePage() {
  const [db, session, theme] = await Promise.all([
    getDb(),
    getSession(),
    getTheme(),
  ]);
  const me = session.person;

  const household = me
    ? db.households.find((h) => h.id === me.householdId) ?? null
    : null;
  // Head, then spouse, then parents, then children — the order a family would
  // read it in. Raw database order put the spouse above "you", which looked
  // like a bug.
  const RELATION_ORDER = { self: 0, spouse: 1, parent: 2, child: 3, other: 4 };
  const family = me
    ? db.people
        .filter((p) => p.householdId === me.householdId)
        .sort(
          (a, b) =>
            RELATION_ORDER[a.relationship] - RELATION_ORDER[b.relationship]
        )
    : [];

  // Everyone in the household except you — the people this phone could be
  // handed to. The deceased are remembered on the household page, not offered
  // here as someone to become.
  const others = family.filter((p) => p.id !== me?.id && !p.deceased);

  const myCompletion = me ? completion(me) : 0;
  const missing = me ? missingFields(me) : [];
  const hiddenCount = me
    ? Object.values(me.privacy).filter(Boolean).length
    : 0;

  return (
    <>
      <PageTitle title="Me" subtitle={household?.familyName ?? "Committee admin"} />

      {me ? (
        <>
          {/* My profile */}
          <div className="px-4">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <Avatar person={me} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-bold">
                    {fullName(me)}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {relationshipLabel(me)}
                    {session.isAdmin && " · Committee admin"}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <Meter value={myCompletion} />
              </div>

              {missing.length > 0 && (
                <div className="mt-3 rounded-inner bg-kesar-mist px-3 py-2.5">
                  <p className="text-xs font-semibold text-ink-soft">Still missing</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {missing.slice(0, 6).map((field) => (
                      <Badge key={field}>{field}</Badge>
                    ))}
                    {missing.length > 6 && <Badge>+{missing.length - 6} more</Badge>}
                  </div>
                </div>
              )}

              <Link
                href={`/me/edit/${me.id}?from=me`}
                className="btn btn-primary mt-4 w-full"
              >
                <Pencil size={ICON.sm} />
                Edit my profile
              </Link>
            </div>
          </div>

          {/* Household */}
          {household && (
            <>
              <section className="mt-6">
                <SectionHeading>My household</SectionHeading>
                <div className="mx-4">
                  <Link
                    href={`/me/household/${household.id}?from=me`}
                    className="card card-tap mb-2 flex items-center gap-3.5 p-3.5"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-kesar-pale">
                      <Home size={ICON.md} className="text-kesar-ink" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        Household details
                      </span>
                      <span className="block truncate text-xs text-ink-soft">
                        {household.area || "Area not set"} · {household.city}
                      </span>
                    </span>
                  </Link>

                  <ul className="card divide-y divide-line-soft">
                    {family.map((person) => {
                      // A parent managing a child's profile should see at a
                      // glance that something is hidden without opening it
                      const hidden = Object.values(person.privacy).filter(Boolean).length;
                      return (
                        <li key={person.id}>
                          <Link
                            href={`/me/edit/${person.id}?from=me`}
                            className="flex min-h-[3rem] items-center gap-3.5 px-3.5 py-2.5"
                          >
                            <Avatar person={person} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">
                                {fullName(person)}
                                {person.id === me.id && (
                                  <span className="ml-1.5 text-xs text-ink-faint">(you)</span>
                                )}
                              </span>
                              <span className="block text-xs text-ink-soft">
                                {relationshipLabel(person)} ·{" "}
                                <span className="tnum">{completion(person)}</span>% complete
                                {hidden > 0 && (
                                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-ink-faint">
                                    <EyeOff size={ICON.micro} />
                                    <span className="tnum">{hidden}</span> hidden
                                  </span>
                                )}
                              </span>
                            </span>
                            <Pencil size={ICON.sm} className="shrink-0 text-ink-faint" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 px-1 text-xs leading-relaxed text-ink-soft">
                    You can edit anyone in your household — useful for parents and
                    children who don&apos;t use the app themselves.
                  </p>
                </div>
              </section>

              <div className="mt-2 px-5">
                <Link
                  href={`/me/household/${household.id}/add-member?from=me`}
                  className="btn btn-secondary min-h-0 px-3.5 py-2 text-xs"
                >
                  <UserPlus size={ICON.xs} />
                  Add a family member
                </Link>
              </div>

              {/* The way out of a shared Google account. One account can only
                  name one person, so whoever signs in first claims it and the
                  rest of the family arrives as them. Said in those words —
                  "if you are not X" — because the member who needs this is
                  looking at the wrong name and wondering what went wrong. */}
              {others.length > 0 && (
                <section className="mt-6">
                  <SectionHeading>Not you?</SectionHeading>
                  <div className="card mx-4 p-4">
                    <p className="text-xs leading-relaxed text-ink-soft">
                      If your family shares one phone number or account, the app
                      opens as whoever signed in first. Tap your own name to use it
                      as yourself — it stays that way on this phone until you switch
                      back or sign out.
                    </p>
                    <ul className="mt-3 space-y-2">
                      {others.map((person) => (
                        <li key={person.id}>
                          <form
                            action={switchToHouseholdMember.bind(null, person.id)}
                          >
                            <SubmitButton
                              pendingLabel="Switching…"
                              className="btn btn-secondary w-full justify-start"
                            >
                              <Avatar person={person} size="sm" />
                              <span className="min-w-0 flex-1 text-left">
                                <span className="block truncate text-sm font-semibold">
                                  I am {person.firstName}
                                </span>
                                <span className="block truncate text-2xs font-normal text-ink-soft">
                                  {relationshipLabel(person)}
                                </span>
                              </span>
                              <ArrowLeftRight
                                size={ICON.sm}
                                className="shrink-0 text-ink-faint"
                              />
                            </SubmitButton>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}
            </>
          )}

          {/* Privacy */}
          <section className="mt-6">
            <SectionHeading>Privacy</SectionHeading>
            <div className="card mx-4 overflow-hidden">
              <DetailRow
                label="Fields you are hiding"
                value={
                  hiddenCount === 0 ? (
                    <span className="text-ink-faint">None</span>
                  ) : (
                    `${hiddenCount} hidden`
                  )
                }
                href={`/me/edit/${me.id}?from=me`}
                icon={<EyeOff size={ICON.sm} />}
              />
            </div>
            <p className="mt-2 px-5 text-xs leading-relaxed text-ink-soft">
              Everything in this app is visible only to signed-in samaj members.
              Nothing is public and search engines are blocked.
            </p>
          </section>
        </>
      ) : (
        <div className="card-mist mx-4 p-4">
          <p className="flex items-center gap-2 font-display text-sm font-bold">
            <Shield size={ICON.sm} />
            Signed in as committee admin
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
            {session.email} is not linked to a member profile yet. You can still manage
            every household from the admin panel. To get your own profile, sign out and
            sign in with your full mobile number.
          </p>
        </div>
      )}

      {/* Admin */}
      {session.isAdmin && (
        <section className="mt-6">
          <SectionHeading>Committee</SectionHeading>
          <div className="mx-4">
            <Link href="/admin" className="card-fill card-tap flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/70">
                <Shield size={ICON.md} className="text-kesar-ink" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-sm font-bold">
                  Admin panel
                </span>
                <span className="block text-xs text-kesar-ink/80">
                  {db.issues.filter((i) => !i.resolved).length} items need attention
                </span>
              </span>
            </Link>
          </div>
        </section>
      )}

      {/* Appearance */}
      <section className="mt-6">
        <SectionHeading>Settings</SectionHeading>
        <ThemeChoice current={theme} />
      </section>

      {/* Install */}
      <section className="mt-6">
        <SectionHeading>Install the app</SectionHeading>
        <div className="card mx-4 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Share2 size={ICON.sm} />
            Add the app to your home screen
          </p>
          <ol className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-ink-soft">
            <li>
              <strong>iPhone:</strong> tap the Share button in Safari, then{" "}
              <em>Add to Home Screen</em>.
            </li>
            <li>
              <strong>Android:</strong> tap the three-dot menu in Chrome, then{" "}
              <em>Add to Home screen</em>.
            </li>
          </ol>
          <p className="mt-2.5 text-xs leading-relaxed text-ink-faint">
            It then opens like any other app, with no browser bars.
          </p>
        </div>
      </section>

      {/* About + sign out */}
      <section className="mt-6 px-4">
        <div className="card-mist flex items-start gap-2 p-3.5 text-xs leading-relaxed text-ink-soft">
          <Info size={ICON.xs} className="mt-0.5 shrink-0" />
          <span>
            {db.households.length} households and {db.people.length} members, imported
            from <strong>{db.source}</strong>.
          </span>
        </div>

        <form action={signOut} className="mt-4">
          <SubmitButton pendingLabel="Signing out…" className="btn btn-ghost w-full">
            <LogOut size={ICON.sm} />
            Sign out
          </SubmitButton>
        </form>
      </section>

      <p className="mt-8 px-4 text-center text-2xs text-ink-faint">
        Made with ❤️ by Anand Jain
      </p>
    </>
  );
}
