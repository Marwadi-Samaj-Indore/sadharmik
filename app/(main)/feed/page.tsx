import Link from "next/link";
import {
  Pin,
  Lock,
  MessageSquare,
  Plus,
  Clock,
  AlertCircle,
  FileText,
  CalendarDays,
  MapPin,
  Camera,
  Users,
  Flame,
} from "lucide-react";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { PageTitle, Badge, EmptyState } from "@/components/ui";
import { AvatarLite } from "@/components/Avatar";
import { BiodataList, type BiodataRow } from "@/components/BiodataList";
import { CircularList, type CircularRow } from "@/components/CircularList";
import {
  formatDateLong,
  formatTime,
  initials,
  isCondolence,
  isUrl,
  photoUrl,
  relativeTime,
} from "@/lib/util";
import { ICON } from "@/lib/icons";
import type { Post } from "@/lib/types";

type Tab =
  | "announcements"
  | "circulars"
  | "meetings"
  | "requirements"
  | "matrimonial";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; limit?: string }>;
}) {
  const { tab, limit } = await searchParams;
  const active: Tab =
    tab === "circulars"
      ? "circulars"
      : tab === "meetings"
        ? "meetings"
        : tab === "requirements"
          ? "requirements"
          : tab === "matrimonial"
            ? "matrimonial"
            : "announcements";

  const [db, session] = await Promise.all([getDb(), getSession()]);

  const commentCount = (postId: string) =>
    db.comments.filter((c) => c.postId === postId).length;

  const announcements = [...db.announcements].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const requirements = db.requirements
    .filter((r) => !r.expiresAt || new Date(r.expiresAt) > new Date())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const posts: Post[] = active === "announcements" ? announcements : requirements;

  const startOfToday = new Date(new Date().toDateString());
  const upcomingMeetings = db.meetings
    .filter((m) => new Date(m.meetingDate) >= startOfToday)
    .sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime());
  const pastMeetings = db.meetings
    .filter((m) => new Date(m.meetingDate) < startOfToday)
    .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime());
  const attendeeTotals = new Map<string, number>();
  for (const r of db.meetingRsvps) {
    attendeeTotals.set(r.meetingId, (attendeeTotals.get(r.meetingId) ?? 0) + r.attendeeCount);
  }

  const personById = new Map(db.people.map((p) => [p.id, p]));

  // Committee circulars. The file is the content, so every row is really a
  // way into it — the title and note only exist to make it findable.
  const circularRows: CircularRow[] = db.circulars.map((c) => {
    const fileUrl = photoUrl(c.filePath) ?? "";
    const safeName = `${c.title.replace(/[^A-Za-z0-9 -]/g, "").trim() || "circular"}.${
      c.fileType === "pdf" ? "pdf" : "jpg"
    }`;

    return {
      id: c.id,
      title: c.title,
      note: c.note,
      fileUrl,
      downloadUrl: `${fileUrl}?download=${encodeURIComponent(safeName)}`,
      fileType: c.fileType,
      authorName: c.authorName || "Samaj Karyakarini",
      authorPersonId: c.authorPersonId,
      postedAgo: relativeTime(c.createdAt),
      canRemove: session.isAdmin,
    } satisfies CircularRow;
  });

  // Marriage matrimonial profiles. The subject is a name the uploader typed,
  // not a member record — the uploader is who other families contact.
  const biodataRows: BiodataRow[] = db.biodata.map((b) => {
    const uploader = b.uploaderPersonId ? personById.get(b.uploaderPersonId) : null;
    const wa = uploader && !uploader.privacy.hideWhatsapp ? uploader.whatsapp : null;
    const fileUrl = photoUrl(b.filePath) ?? "";
    const safeName = `${b.title.replace(/[^A-Za-z ]/g, "").trim() || "matrimonial"}.${b.fileType === "pdf" ? "pdf" : "jpg"}`;

    return {
      id: b.id,
      title: b.title,
      note: b.note,
      fileUrl,
      downloadUrl: `${fileUrl}?download=${encodeURIComponent(safeName)}`,
      fileType: b.fileType,
      uploaderName: b.uploaderName,
      uploaderPersonId: b.uploaderPersonId,
      uploaderInitials: uploader ? initials(uploader) : b.uploaderName.charAt(0),
      uploaderPhoto: uploader?.privacy.hidePhoto ? null : uploader?.photo ?? null,
      sharedAgo: relativeTime(b.createdAt),
      whatsapp: wa,
      whatsappMessage: `Jai Jinendra ${uploader?.firstName ?? ""}, I saw the matrimonial profile for ${b.title} you shared on Sadharmik and would like to know more.`,
      canRemove:
        session.isAdmin ||
        Boolean(session.person && b.uploaderPersonId === session.person.id),
    } satisfies BiodataRow;
  });

  return (
    <>
      <PageTitle
        title="Feed"
        subtitle="Committee announcements and what members need"
      />

      {limit === "1" && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          <AlertCircle size={ICON.sm} className="mt-0.5 shrink-0" />
          <span>
            You&apos;ve already posted twice this week. This keeps the feed useful for
            everyone — please try again in a few days.
          </span>
        </div>
      )}

      {/* mt-2: Feed's subtitle is long enough to wrap to two lines on a
          narrow phone or at larger system font sizes, and the tab row needs
          its own clearance rather than relying on PageTitle's fixed pb-3 */}
      <div className="rail mt-2 px-4 pb-1">
        <Link
          href="/feed?tab=announcements"
          aria-current={active === "announcements" ? "page" : undefined}
          className={`chip ${active === "announcements" ? "chip-active" : ""}`}
        >
          Announcements
          <span className="tnum opacity-70">{announcements.length}</span>
        </Link>
        <Link
          href="/feed?tab=meetings"
          aria-current={active === "meetings" ? "page" : undefined}
          className={`chip ${active === "meetings" ? "chip-active" : ""}`}
        >
          Meetings
          <span className="tnum opacity-70">{db.meetings.length}</span>
        </Link>
        <Link
          href="/feed?tab=requirements"
          aria-current={active === "requirements" ? "page" : undefined}
          className={`chip ${active === "requirements" ? "chip-active" : ""}`}
        >
          Requirements
          <span className="tnum opacity-70">{requirements.length}</span>
        </Link>
        <Link
          href="/feed?tab=circulars"
          aria-current={active === "circulars" ? "page" : undefined}
          className={`chip ${active === "circulars" ? "chip-active" : ""}`}
        >
          Circulars
          <span className="tnum opacity-70">{circularRows.length}</span>
        </Link>
        <Link
          href="/feed?tab=matrimonial"
          aria-current={active === "matrimonial" ? "page" : undefined}
          className={`chip ${active === "matrimonial" ? "chip-active" : ""}`}
        >
          Matrimonial
          <span className="tnum opacity-70">{biodataRows.length}</span>
        </Link>
      </div>

      {active === "requirements" && (
        <p className="mt-3 px-4 text-xs leading-relaxed text-ink-soft">
          Post what you need and the group can help. Requirements stay searchable for 30
          days — unlike a WhatsApp message, which scrolls away by Friday.
        </p>
      )}

      {active === "circulars" ? (
        <>
          <p className="mt-3 px-4 text-xs leading-relaxed text-ink-soft">
            Notices, rules, forms and accounts from the committee. They stay
            here permanently, so one from March is still here in November.
          </p>

          {session.isAdmin && (
            <div className="mt-3 px-4">
              <Link href="/feed/circulars/new" className="btn btn-secondary w-full">
                <Plus size={ICON.sm} />
                Post a circular
              </Link>
            </div>
          )}

          {circularRows.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={<FileText size={ICON.xxl} />}
                title="No circulars yet"
                body="When the committee sends one round, it will be here to read and to keep, instead of scrolling away in a chat."
              />
            </div>
          ) : (
            <CircularList entries={circularRows} />
          )}
        </>
      ) : active === "meetings" ? (
        <>
          <p className="mt-3 px-4 text-xs leading-relaxed text-ink-soft">
            Group outings and get-togethers organised by the committee. Photos are
            added here once each meeting is done.
          </p>

          {session.isAdmin && (
            <div className="mt-3 px-4">
              <Link href="/feed/meetings/new" className="btn btn-secondary w-full">
                <Plus size={ICON.sm} />
                New meeting
              </Link>
            </div>
          )}

          {upcomingMeetings.length === 0 && pastMeetings.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={<CalendarDays size={ICON.xxl} />}
                title="No meetings yet"
                body="Outings, monthly get-togethers, themed evenings — the committee will post them here."
              />
            </div>
          ) : (
            <div className="mt-4 space-y-6">
              {upcomingMeetings.length > 0 && (
                <div>
                  {pastMeetings.length > 0 && (
                    <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Upcoming
                    </p>
                  )}
                  <ul className="space-y-3 px-4">
                    {upcomingMeetings.map((m) => (
                      <MeetingCard
                        key={m.id}
                        meeting={m}
                        attendeeTotal={attendeeTotals.get(m.id) ?? 0}
                      />
                    ))}
                  </ul>
                </div>
              )}
              {pastMeetings.length > 0 && (
                <div>
                  {upcomingMeetings.length > 0 && (
                    <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Past
                    </p>
                  )}
                  <ul className="space-y-3 px-4">
                    {pastMeetings.map((m) => (
                      <MeetingCard key={m.id} meeting={m} past />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      ) : active === "matrimonial" ? (
        <>
          <p className="mt-3 px-4 text-xs leading-relaxed text-ink-soft">
            Matrimonial profiles shared by members — for their own families or for
            relatives outside the group. Contact whoever shared it.
          </p>

          <div className="mt-3 px-4">
            <Link href="/feed/matrimonial/new" className="btn btn-secondary w-full">
              <Plus size={ICON.sm} />
              Add a matrimonial profile
            </Link>
          </div>

          {biodataRows.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={<FileText size={ICON.xxl} />}
                title="No matrimonial profiles shared yet"
                body="Share one for anyone — your family or a relative outside the samaj. Members can view it, save it, and message you about it."
              />
            </div>
          ) : (
            <BiodataList entries={biodataRows} />
          )}
        </>
      ) : posts.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={
              active === "announcements"
                ? "No announcements yet"
                : "No open requirements"
            }
            body={
              active === "announcements"
                ? "Committee announcements will appear here. Only admins can post them."
                : "Nobody needs anything right now. If you do, post it — someone in the group probably has what you're looking for."
            }
            action={
              active === "requirements" ? (
                <Link href="/feed/new" className="btn btn-primary">
                  <Plus size={ICON.sm} />
                  Post a requirement
                </Link>
              ) : session.isAdmin ? (
                <Link href="/feed/new?type=announcement" className="btn btn-primary">
                  <Plus size={ICON.sm} />
                  Post an announcement
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3 px-4">
          {posts.map((post) => {
            const comments = commentCount(post.id);
            const daysLeft = post.expiresAt
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(post.expiresAt).getTime() - Date.now()) / 86400000
                  )
                )
              : null;

            // A condolence never takes the filled celebratory card or the amber
            // pin badge, even when pinned — it sits on the plain surface with a
            // single quiet marker. Everything else about the row stays.
            const condolence = isCondolence(post);

            return (
              <li key={post.id}>
                <Link
                  href={`/feed/${post.id}`}
                  className={`${post.pinned && !condolence ? "card-fill" : "card"} card-tap block p-4`}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {condolence && (
                      <Badge>
                        <Flame size={ICON.micro} />
                        Condolence
                      </Badge>
                    )}
                    {post.pinned && !condolence && (
                      <Badge tone="warn">
                        <Pin size={ICON.micro} />
                        Pinned
                      </Badge>
                    )}
                    {post.category && !condolence && (
                      <Badge tone="info">{post.category}</Badge>
                    )}
                    {post.area && (
                      isUrl(post.area) ? (
                        <Badge>
                          <MapPin size={ICON.micro} />
                          Location
                        </Badge>
                      ) : (
                        <Badge>{post.area}</Badge>
                      )
                    )}
                    {/* Redundant on a condolence — they all start locked */}
                    {post.commentsLocked && !condolence && (
                      <Badge>
                        <Lock size={ICON.micro} />
                        Comments off
                      </Badge>
                    )}
                  </div>

                  {/* h2 — the post titles are the first headings under the
                      page title, so h3 skipped a level */}
                  <h2 className="font-display text-base font-bold leading-snug">
                    {post.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                    {post.body}
                  </p>

                  {/* A strip of the poster, anchored to its top: a poster puts
                      its occasion in the first inch, and the whole thing is one
                      tap away. */}
                  {photoUrl(post.photo) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrl(post.photo)!}
                      alt=""
                      loading="lazy"
                      className="mt-2.5 aspect-[2/1] w-full rounded-inner border border-line-soft object-cover object-top"
                    />
                  )}

                  <div className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
                    <AvatarLite label={post.authorName.charAt(0)} size="sm" />
                    <span className="min-w-0 flex-1 truncate">
                      {post.authorName} · {relativeTime(post.createdAt)}
                    </span>
                    {comments > 0 && (
                      <span className="flex shrink-0 items-center gap-1">
                        <MessageSquare size={ICON.xs} />
                        <span className="tnum">{comments}</span>
                      </span>
                    )}
                    {daysLeft !== null && (
                      <span className="flex shrink-0 items-center gap-1">
                        <Clock size={ICON.xs} />
                        {daysLeft}d
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Compose — hidden on tabs with their own dedicated Add button. Two
          floating actions meaning different things is a trap.
          The tab decides which form opens, so the two never share a screen:
          announcing to 456 members and asking them for something are different
          acts, and the toggle that used to choose between them sat one mis-tap
          from the wrong one. Announcements only appear for the committee,
          because only the committee can post one. */}
      {((active === "announcements" && session.isAdmin) ||
        active === "requirements") && (
        <Link
          href={active === "announcements" ? "/feed/new?type=announcement" : "/feed/new"}
          aria-label={
            active === "announcements" ? "Post an announcement" : "Post a requirement"
          }
          className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-kesar-deep text-white shadow-lg transition-transform active:scale-95"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <Plus size={ICON.xl} />
        </Link>
      )}

      {session.isAdmin && (
        <p className="mt-6 px-4 text-xs text-ink-faint">
          You are signed in as a committee admin — you can pin, lock comments on, and
          delete any post.
        </p>
      )}
    </>
  );
}

function MeetingCard({
  meeting,
  past = false,
  attendeeTotal = 0,
}: {
  meeting: import("@/lib/types").Meeting;
  past?: boolean;
  attendeeTotal?: number;
}) {
  const cover = photoUrl(meeting.photo);

  /* The one card type that has photography should lead with it — a 56px
     thumbnail beside a truncated title wasted both. Cover on top, then the
     date first (it is what a member decides on), and the title never
     truncates. The date keeps the occasion amber only while the meeting is
     still ahead. */
  return (
    <li>
      <Link
        href={`/feed/meetings/${meeting.id}`}
        className="card card-tap block overflow-hidden"
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="aspect-[2/1] w-full object-cover"
          />
        )}
        <span className="block p-3.5">
          <span
            className={`flex items-center gap-1.5 text-xs font-semibold ${
              past ? "text-ink-faint" : "text-birthday"
            }`}
          >
            <CalendarDays size={ICON.xs} className="shrink-0" />
            {formatDateLong(meeting.meetingDate)}
            {meeting.meetingTime ? ` · ${formatTime(meeting.meetingTime)}` : ""}
          </span>
          <span className="mt-1 block font-display text-base font-bold leading-snug">
            {meeting.title}
          </span>
          {meeting.location && (
            <span className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
              <MapPin size={ICON.xs} className="shrink-0" />
              <span className="truncate">{meeting.location}</span>
            </span>
          )}
          {(past && meeting.kwikPicUrl) || (!past && attendeeTotal > 0) ? (
            <span className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-kesar-text">
              {past ? (
                <>
                  <Camera size={ICON.xs} />
                  Photos are up
                </>
              ) : (
                <>
                  <Users size={ICON.xs} />
                  <span className="tnum">{attendeeTotal}</span> coming so far
                </>
              )}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
