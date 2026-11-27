import Link from "next/link";
import {
  Bell,
  CalendarDays,
  FileText,
  Heart,
  Megaphone,
  MessageCircle,
  Search,
  UserPen,
} from "lucide-react";
import { getSession } from "@/lib/session";
import { inboxFor, ownerKey, pushPublicKey } from "@/lib/notify";
import { NOTIFICATION_KINDS } from "@/lib/notify-kinds";
import { saveNotificationPrefs } from "@/app/actions/notifications";
import { BackBar, EmptyState, SectionHeading } from "@/components/ui";
import { PushSetup } from "@/components/PushSetup";
import { MarkSeen } from "@/components/MarkSeen";
import { SubmitButton } from "@/components/SubmitButton";
import { relativeTime } from "@/lib/util";
import { ICON } from "@/lib/icons";
import { requireMember } from "@/lib/guard";
import type { NotificationKind } from "@/lib/types";

// Each kind keeps the accent that matches its job: clay for the committee's
// voice, sun for dates, leaf for things about you
const KIND_LOOK: Record<NotificationKind, { icon: typeof Bell; plate: string; ink: string }> = {
  announcement: { icon: Megaphone, plate: "bg-clay-pale", ink: "text-clay-ink" },
  circular: { icon: FileText, plate: "bg-clay-pale", ink: "text-clay-ink" },
  meeting: { icon: CalendarDays, plate: "bg-sun-pale", ink: "text-sun-ink" },
  requirement: { icon: Search, plate: "bg-sand", ink: "text-ink-soft" },
  biodata: { icon: Heart, plate: "bg-sun-pale", ink: "text-sun-ink" },
  comment: { icon: MessageCircle, plate: "bg-leaf-pale", ink: "text-leaf-ink" },
  profile: { icon: UserPen, plate: "bg-leaf-pale", ink: "text-leaf-ink" },
};

export default async function NotificationsPage() {
  const session = await requireMember();
  const owner = ownerKey(session);
  const { items, seenAt, muted = [] } = await inboxFor(owner);

  return (
    <>
      <BackBar label="Notifications" href="/" historyBack />
      <MarkSeen />

      <div className="px-4 pt-5">
        <h1 className="text-title">Notifications</h1>
        <p className="mt-1 text-sm text-ink-soft">The last 30 days.</p>
      </div>

      <section className="mt-4">
        {items.length === 0 ? (
          <EmptyState
            icon={<Bell size={ICON.lg} />}
            title="Nothing yet"
            body="New announcements, meetings, circulars and replies to your posts will appear here."
          />
        ) : (
          <ul className="card mx-4 divide-y divide-line-soft">
            {items.map((n) => {
              const look = KIND_LOOK[n.kind] ?? KIND_LOOK.announcement;
              const Icon = look.icon;
              const unread = !seenAt || n.createdAt > seenAt;
              return (
                <li key={n.id}>
                  <Link href={n.url} className="card-tap flex items-start gap-3 px-3.5 py-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${look.plate}`}
                    >
                      <Icon size={ICON.sm} className={look.ink} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={`truncate text-sm ${unread ? "font-semibold" : "font-medium"}`}>
                          {n.title}
                        </span>
                        {unread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-sun" aria-label="New" />
                        )}
                      </span>
                      {n.body && (
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-ink-soft">
                          {n.body}
                        </span>
                      )}
                      <span className="mt-1 block text-2xs text-ink-faint">
                        {relativeTime(n.createdAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <SectionHeading>Phone alerts</SectionHeading>
        <div className="mx-4">
          <PushSetup publicKey={pushPublicKey()} />
        </div>
      </section>

      <section className="mt-7 pb-6">
        <SectionHeading>What to tell me about</SectionHeading>
        <form action={saveNotificationPrefs} className="card mx-4 divide-y divide-line-soft">
          {NOTIFICATION_KINDS.map((k) => (
            <label key={k.kind} className="flex min-h-12 cursor-pointer items-center gap-3 px-3.5 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{k.label}</span>
                <span className="block text-xs text-ink-soft">{k.hint}</span>
              </span>
              <input
                type="checkbox"
                name="on"
                value={k.kind}
                defaultChecked={!muted.includes(k.kind)}
                className="h-5 w-5 shrink-0 accent-[var(--color-leaf)]"
              />
            </label>
          ))}
          <div className="p-3.5">
            <SubmitButton pendingLabel="Saving…" className="btn btn-secondary w-full">
              Save choices
            </SubmitButton>
          </div>
        </form>
        <p className="mx-4 mt-2 text-xs leading-relaxed text-ink-faint">
          Applies to the list above and to phone alerts on every device.
        </p>
      </section>
    </>
  );
}
