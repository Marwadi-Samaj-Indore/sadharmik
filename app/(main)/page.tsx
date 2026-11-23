import Link from "next/link";
import { Search, Pin, ChevronRight, Sparkles, CalendarDays, MapPin, Flame } from "lucide-react";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { SectionHeading, Meter, Badge } from "@/components/ui";
import { CelebrationCard } from "@/components/CelebrationCard";
import { celebrations } from "@/lib/celebrations";
import {
  completion,
  formatDateLong,
  formatTime,
  isCondolence,
  photoUrl,
  relativeTime,
} from "@/lib/util";
import { ICON } from "@/lib/icons";

/**
 * "Rajesh-Sunita Shah" → "RS". A committee entry is a couple, so a single
 * first letter under-represents the tile; first-and-surname initials read
 * like a stamped monogram.
 */
function monogram(name: string): string {
  const words = name.split(/[\s-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export default async function HomePage() {
  const [db, session] = await Promise.all([getDb(), getSession()]);

  // The committee's week ahead. Worked out only for admins: members never
  // see it, so there is no reason to compute it on their every visit.
  const UPCOMING_DAYS = 7;
  const upcoming = session.isAdmin ? celebrations(db, UPCOMING_DAYS) : [];

  const pinned = db.announcements.find((a) => a.pinned) ?? null;
  const activeRequirements = db.requirements
    .filter((r) => !r.expiresAt || new Date(r.expiresAt) > new Date())
    .slice(0, 2);

  const startOfToday = new Date(new Date().toDateString());
  const nextMeeting = [...db.meetings]
    .filter((m) => new Date(m.meetingDate) >= startOfToday)
    .sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime())[0];

  const committeeMembers = [...db.committeeMembers].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
  const [committeeHead, ...committeeRest] = committeeMembers;
  const headPhoto = committeeHead ? photoUrl(committeeHead.photo) : null;

  const me = session.person;
  const myCompletion = me ? completion(me) : null;

  const greeting = me ? `Jai Jinendra, ${me.firstName}` : "Jai Jinendra";

  return (
    <>
      <header className="flex items-center gap-3 px-4 pt-5 pb-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-soft">{greeting}</p>
          {/* The serif belongs to names, and this one names the app. Same
              tab-title size as every other tab's masthead — the serif is
              what distinguishes it, not a one-off size of its own. */}
          <h1 className="font-serif text-tab-title font-semibold tracking-[-0.01em]">
            Marwadi Samaj Indore
          </h1>
        </div>
        {/* The samaj's own logo. Decorative — the heading beside it names the
            app, and the logo's lettering is too small here to read aloud. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt=""
          width={112}
          height={112}
          className="h-14 w-14 shrink-0"
        />
      </header>

      {/* Search entry point — leads into the Directory */}
      <div className="px-4">
        <Link
          href="/directory"
          className="flex min-h-[2.75rem] items-center gap-2 rounded-chip border border-line bg-surface px-4 py-2.5 text-sm text-ink-faint"
        >
          <Search size={ICON.sm} />
          Search members, business, area…
        </Link>
      </div>

      {/* Pinned announcement — first, by committee decision. Official notices
          should be the first thing a member sees on opening the app. A pinned
          condolence renders on the plain surface with a quiet label — the
          green fill and PINNED shout belong to happier news. */}
      {pinned &&
        (isCondolence(pinned) ? (
          <section className="mt-4 px-4">
            <Link href={`/feed/${pinned.id}`} className="card card-tap block p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold text-ink-faint">
                <Flame size={ICON.micro} />
                CONDOLENCE
              </div>
              <h2 className="font-display text-base font-bold">{pinned.title}</h2>
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink-soft">
                {pinned.body}
              </p>
              <p className="mt-2 text-xs text-ink-faint">
                {pinned.authorName} · {relativeTime(pinned.createdAt)}
              </p>
            </Link>
          </section>
        ) : (
          <section className="mt-4 px-4">
            <Link href={`/feed/${pinned.id}`} className="card-fill card-tap block p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold text-kesar-text">
                <Pin size={ICON.micro} />
                PINNED ANNOUNCEMENT
              </div>
              {/* h2, not h3 — this is the first heading after the page title, so
                  an h3 skipped a level for screen-reader navigation */}
              <h2 className="font-display text-base font-bold">{pinned.title}</h2>
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-kesar-ink/85">
                {pinned.body}
              </p>
              <p className="mt-2 text-xs text-kesar-ink/70">
                {pinned.authorName} · {relativeTime(pinned.createdAt)}
              </p>
            </Link>
          </section>
        ))}

      {/* Next meeting */}
      {nextMeeting && (
        <section className="mt-4 px-4">
          <Link
            href={`/feed/meetings/${nextMeeting.id}`}
            className="card card-tap block p-4"
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold text-kesar-text">
              <CalendarDays size={ICON.micro} />
              NEXT MEETING
            </div>
            <h2 className="font-display text-base font-bold">{nextMeeting.title}</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {formatDateLong(nextMeeting.meetingDate)}
              {nextMeeting.meetingTime ? ` · ${formatTime(nextMeeting.meetingTime)}` : ""}
            </p>
            {nextMeeting.location && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-faint">
                <MapPin size={ICON.xs} className="shrink-0" />
                {nextMeeting.location}
              </p>
            )}
          </Link>
        </section>
      )}

      {/* Birthdays and anniversaries — for the committee only. The samaj runs
          to thousands of members, and a daily list of strangers' birthdays is
          noise to them; to the committee it is who to greet this week. The
          empty state stays, so an admin knows the section exists before the
          first dates of birth are filled in. */}
      {session.isAdmin && (
        <section className="mt-6">
          <SectionHeading>Birthdays & anniversaries</SectionHeading>
          <p className="-mt-1 px-4 pb-2 text-xs text-ink-faint">
            Next {UPCOMING_DAYS} days · only the committee sees this
          </p>
          {upcoming.length > 0 ? (
            <div className="space-y-3 px-4">
              {upcoming.map((entry) => (
                <CelebrationCard
                  key={
                    entry.kind === "birthday"
                      ? `b-${entry.person.id}`
                      : `a-${entry.couple.map((p) => p.id).join("-")}`
                  }
                  entry={entry}
                />
              ))}
            </div>
          ) : (
            <p className="card-mist mx-4 px-4 py-5 text-center text-sm text-ink-soft">
              None in the next {UPCOMING_DAYS} days. Dates appear here as members add
              their date of birth and anniversary.
            </p>
          )}
        </section>
      )}

      {/* Latest requirements */}
      {activeRequirements.length > 0 && (
        <section className="mt-6">
          <SectionHeading
            action={
              <Link
                href="/feed"
                className="-my-3 -mr-2 px-2 py-3 text-xs font-semibold text-kesar-text"
              >
                See all
              </Link>
            }
          >
            Members need help with
          </SectionHeading>
          <div className="space-y-3 px-4">
            {activeRequirements.map((r) => (
              <Link key={r.id} href="/feed" className="card card-tap block p-4">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  {r.category && <Badge tone="info">{r.category}</Badge>}
                  {r.area && <Badge>{r.area}</Badge>}
                </div>
                <h3 className="font-display text-base font-bold leading-snug">
                  {r.title}
                </h3>
                <p className="mt-1.5 text-xs text-ink-faint">
                  {r.authorName} · {relativeTime(r.createdAt)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Karyakarni */}
      {committeeHead && (
        <section className="mt-6">
          <SectionHeading>Karyakarni</SectionHeading>
          <div className="px-4">
            <div className="card-fill overflow-hidden text-center">
              {headPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={headPhoto}
                  alt=""
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex aspect-video w-full items-center justify-center bg-kesar-pale font-serif text-4xl font-semibold text-kesar-ink"
                >
                  {monogram(committeeHead.name)}
                </div>
              )}
              <div className="p-4">
                <p className="font-serif text-lg font-semibold">
                  {committeeHead.name}
                </p>
                {committeeHead.role && (
                  <p className="text-xs font-semibold text-kesar-ink/80">
                    {committeeHead.role}
                  </p>
                )}
              </div>
            </div>

            {committeeRest.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {committeeRest.map((m) => {
                  const photo = photoUrl(m.photo);
                  return (
                    <div key={m.id} className="card overflow-hidden text-center">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt=""
                          className="aspect-square w-full object-cover"
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="flex aspect-square w-full items-center justify-center bg-kesar-pale font-serif text-2xl font-semibold text-kesar-ink"
                        >
                          {monogram(m.name)}
                        </div>
                      )}
                      <div className="p-3">
                        {/* Names wrap rather than truncate — a committee
                            member's name cut off mid-word reads as a bug, and
                            the joint husband-and-wife names here are long.
                            Serif, matching the head's card — every committee
                            name is an identity, not a label. */}
                        <p className="font-serif text-sm font-semibold leading-snug">
                          {m.name}
                        </p>
                        {m.role && (
                          <p className="mt-0.5 text-xs leading-snug text-ink-soft">
                            {m.role}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Profile completion nudge — last, by committee decision. It is a
          personal to-do, so it sits below everything the group shares. */}
      {me && myCompletion !== null && myCompletion < 100 && (
        <div className="mt-6 px-4">
          <Link href={`/me/edit/${me.id}?from=home`} className="card card-tap block p-4">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-display text-sm font-bold">
                <Sparkles size={ICON.sm} />
                Complete your profile
              </span>
              <ChevronRight size={ICON.sm} />
            </div>
            <Meter value={myCompletion} />
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Members can only find you by business if you fill it in. It takes two
              minutes.
            </p>
          </Link>
        </div>
      )}

      <p className="mt-8 px-4 text-center text-2xs text-ink-faint">
        Made with ❤️ by Anand Jain
      </p>
    </>
  );
}
