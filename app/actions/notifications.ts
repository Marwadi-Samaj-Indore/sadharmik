"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deletePushSubscription,
  listPushSubscriptions,
  saveNotificationSettings,
  savePushSubscription,
} from "@/lib/db";
import { getSession } from "@/lib/session";
import { isPushEndpoint, ownerKey, pushTo } from "@/lib/notify";
import { NOTIFICATION_KINDS } from "@/lib/notify-kinds";

/** One family shares phones and tablets; past this, something is wrong. */
const MAX_DEVICES = 10;

async function requireOwner() {
  const session = await getSession();
  const owner = ownerKey(session);
  if (!session.isSignedIn || !owner) redirect("/login");
  return owner;
}

export interface PushResult {
  error?: string;
}

/** Called by the browser after the member allows notifications. */
export async function subscribePush(sub: {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
}): Promise<PushResult> {
  const owner = await requireOwner();

  const endpoint = String(sub?.endpoint ?? "");
  const p256dh = String(sub?.keys?.p256dh ?? "");
  const auth = String(sub?.keys?.auth ?? "");
  if (!isPushEndpoint(endpoint) || endpoint.length > 1000) {
    return { error: "This browser's notification service isn't supported." };
  }
  // Base64url keys of the fixed sizes the Web Push standard uses
  if (!/^[A-Za-z0-9_-]{80,100}$/.test(p256dh) || !/^[A-Za-z0-9_-]{16,32}$/.test(auth)) {
    return { error: "The browser sent an unreadable subscription." };
  }

  const existing = await listPushSubscriptions(owner);
  if (existing.length >= MAX_DEVICES && !existing.some((s) => s.endpoint === endpoint)) {
    return { error: `Notifications are already on for ${MAX_DEVICES} devices. Turn one off first.` };
  }

  try {
    await savePushSubscription({ endpoint, owner, p256dh, auth });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not turn notifications on." };
  }
  return {};
}

/** Only ever removes a subscription that belongs to whoever asks. */
export async function unsubscribePush(endpoint: string): Promise<PushResult> {
  const owner = await requireOwner();
  const mine = await listPushSubscriptions(owner);
  if (mine.some((s) => s.endpoint === endpoint)) await deletePushSubscription(endpoint);
  return {};
}

/** "Send me a test": only ever to the asker's own devices. */
export async function sendTestPush(): Promise<PushResult & { sent?: number }> {
  const owner = await requireOwner();
  const mine = await listPushSubscriptions(owner);
  const sent = await pushTo(mine, {
    title: "Marwadi Samaj Indore",
    body: "Notifications are working on this phone.",
    url: "/notifications",
    tag: "test",
  });
  if (!sent) return { error: "Nothing was sent. Try turning notifications off and on again." };
  return { sent };
}

/** The checkboxes on the notifications screen: unticked kinds are muted. */
export async function saveNotificationPrefs(formData: FormData) {
  const owner = await requireOwner();
  const on = new Set(formData.getAll("on").map(String));
  const muted = NOTIFICATION_KINDS.map((k) => k.kind).filter((kind) => !on.has(kind));
  await saveNotificationSettings(owner, { muted });
  revalidatePath("/", "layout");
  redirect("/notifications?saved=prefs");
}

/** Opening the bell reads everything in it. */
export async function markNotificationsSeen() {
  const owner = await requireOwner();
  await saveNotificationSettings(owner, { seenAt: new Date().toISOString() });
  revalidatePath("/");
}
