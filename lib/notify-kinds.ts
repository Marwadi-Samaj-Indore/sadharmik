import type { NotificationKind } from "./types";

/**
 * What each kind is called on the settings screen, in the order shown there.
 * Plain data with no server imports, so a client component may read it too.
 */
export const NOTIFICATION_KINDS: { kind: NotificationKind; label: string; hint: string }[] = [
  { kind: "announcement", label: "Announcements", hint: "From the Samaj Karyakarini" },
  { kind: "meeting", label: "Meetings and events", hint: "When a new one is added" },
  { kind: "circular", label: "Circulars", hint: "New documents from the committee" },
  { kind: "requirement", label: "Requirements", hint: "When a member asks for help" },
  { kind: "biodata", label: "Matrimonial biodata", hint: "When a new one is shared" },
  { kind: "comment", label: "Comments on my posts", hint: "Someone replies to you" },
  { kind: "profile", label: "Changes to my profile", hint: "When someone else edits it" },
];

export const isNotificationKind = (v: string): v is NotificationKind =>
  NOTIFICATION_KINDS.some((k) => k.kind === v);
