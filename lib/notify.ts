import "server-only";
import webpush from "web-push";
import { after } from "next/server";
import {
  allNotificationSettings,
  deletePushSubscription,
  getNotificationSettings,
  insertNotification,
  listNotifications,
  listPushSubscriptions,
  newId,
} from "./db";
import type { NotificationKind, StoredPushSubscription } from "./types";
import type { Session } from "./session";

/**
 * Notifications: one row for the bell in the app, and a push to every phone
 * that asked for one.
 *
 * The push is the slow part (one request per phone, to Google's, Apple's or
 * Mozilla's push service), so it runs in `after()`: the member who posted is
 * already looking at their post while the alerts go out. Nothing here may
 * ever fail the action that triggered it, so every error is logged and
 * swallowed.
 *
 * Push needs a VAPID key pair (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY). Without
 * it the bell still works; only the phone alerts are off.
 */

/** Whose notifications: the member's person id, or the admin's address when
    an admin has no profile of their own. */
export function ownerKey(session: Session): string | null {
  if (session.person) return session.person.id;
  if (session.email) return `email:${session.email.toLowerCase()}`;
  return null;
}

export const pushPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

let configured: boolean | null = null;
function pushReady(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  configured = Boolean(pub && priv);
  if (configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:marwadisamajindore@gmail.com",
      pub!,
      priv!
    );
  }
  return configured;
}

/**
 * The push services browsers actually use. A subscription is an address our
 * server will POST to, so accepting any address would let a member point the
 * server at whatever host they liked.
 */
export function isPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") return false;
    const h = url.hostname;
    return (
      h === "fcm.googleapis.com" ||
      h === "android.googleapis.com" ||
      h === "web.push.apple.com" ||
      h.endsWith(".push.apple.com") ||
      h.endsWith(".push.services.mozilla.com") ||
      h.endsWith(".notify.windows.com")
    );
  } catch {
    return false;
  }
}

export interface NotifyEvent {
  kind: NotificationKind;
  title: string;
  body: string;
  /** A path inside the app */
  url: string;
  /** One member's owner key, or null/absent for everyone */
  recipient?: string | null;
  /** Who caused it: never told about their own action */
  actor: string | null;
}

/** Queue a notification. Returns at once; the work happens after the response. */
export function notify(event: NotifyEvent) {
  after(async () => {
    try {
      await deliver(event);
    } catch (error) {
      console.error("Notification failed:", error);
    }
  });
}

async function deliver(event: NotifyEvent) {
  const recipient = event.recipient ?? null;
  if (recipient && recipient === event.actor) return;

  const id = newId("n");
  const stored = await insertNotification({
    id,
    recipient,
    kind: event.kind,
    title: event.title.slice(0, 120),
    body: event.body.slice(0, 240),
    url: event.url.startsWith("/") ? event.url : "/",
    actor: event.actor,
    createdAt: new Date().toISOString(),
  });
  // Migration 010 not run yet: nothing to show and nobody subscribed
  if (!stored || !pushReady()) return;

  const [subscriptions, settings] = await Promise.all([
    listPushSubscriptions(recipient ?? undefined),
    recipient
      ? getNotificationSettings(recipient).then((s) => new Map([[recipient, s]]))
      : allNotificationSettings(),
  ]);

  const targets = subscriptions.filter(
    (s) => s.owner !== event.actor && !settings.get(s.owner)?.muted.includes(event.kind)
  );
  await pushTo(targets, { title: event.title, body: event.body, url: event.url, tag: id });
}

/** Sends one payload to many phones, a batch at a time, pruning dead ones. */
export async function pushTo(
  targets: StoredPushSubscription[],
  payload: { title: string; body: string; url: string; tag: string }
) {
  if (!pushReady() || targets.length === 0) return 0;
  const json = JSON.stringify(payload);
  let sent = 0;

  for (let i = 0; i < targets.length; i += 25) {
    const batch = targets.slice(i, i + 25);
    const results = await Promise.allSettled(
      batch.map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          json,
          // A day: an alert about a meeting is worthless a week late
          { TTL: 86400, urgency: "normal" }
        )
      )
    );
    for (const [j, result] of results.entries()) {
      if (result.status === "fulfilled") {
        sent++;
        continue;
      }
      const status = (result.reason as { statusCode?: number })?.statusCode;
      // Gone for good: the member uninstalled, cleared the site or revoked it
      if (status === 404 || status === 410) {
        await deletePushSubscription(batch[j].endpoint).catch(() => {});
      } else {
        console.error("Push failed:", status ?? result.reason);
      }
    }
  }
  return sent;
}

/**
 * What the bell shows one member: the last month of theirs and everyone's,
 * without the kinds they switched off, and how many arrived since they last
 * opened it. Never throws, because the Home screen calls it for the badge.
 */
export async function inboxFor(owner: string | null) {
  if (!owner) return { items: [], seenAt: null, unread: 0 };
  try {
    const [items, settings] = await Promise.all([
      listNotifications(owner),
      getNotificationSettings(owner),
    ]);
    const shown = items.filter((n) => !settings.muted.includes(n.kind));
    const seenAt = settings.seenAt;
    const unread = shown.filter((n) => !seenAt || n.createdAt > seenAt).length;
    return { items: shown, seenAt, muted: settings.muted, unread };
  } catch (error) {
    console.error("Could not read notifications:", error);
    return { items: [], seenAt: null, unread: 0 };
  }
}
