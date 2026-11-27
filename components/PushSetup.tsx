"use client";

import { useEffect, useState, useTransition } from "react";
import { BellOff, BellRing, Send, Smartphone } from "lucide-react";
import { ICON } from "@/lib/icons";
import { sendTestPush, subscribePush, unsubscribePush } from "@/app/actions/notifications";

type State =
  | "checking"
  | "unsupported"
  | "ios-install"
  | "denied"
  | "off"
  | "on";

/** The public key arrives as base64url text; the browser wants raw bytes. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = (base64url + "===".slice((base64url.length + 3) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Turns phone notifications on or off for THIS device.
 *
 * Every phone is asked separately: a member who turns alerts on on their
 * phone has not turned them on on their tablet. The browser's own permission
 * prompt only appears after a tap here, never on page load, because a prompt
 * nobody asked for gets "Block" and can't be asked again.
 *
 * iPhones only allow web notifications for an app added to the Home Screen
 * (iOS 16.4 and later), so in Safari itself this explains that instead.
 */
export function PushSetup({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

    if (!supported) {
      setState(ios && !standalone ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker
      .getRegistration("/")
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  function turnOn() {
    setMessage(null);
    startTransition(async () => {
      try {
        if (!publicKey) throw new Error("Phone notifications aren't set up on the server yet.");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "off");
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBytes(publicKey),
          }));
        const result = await subscribePush(sub.toJSON() as Parameters<typeof subscribePush>[0]);
        if (result.error) {
          await sub.unsubscribe().catch(() => {});
          throw new Error(result.error);
        }
        setState("on");
        setMessage("Done. You'll get alerts on this device.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not turn notifications on.");
      }
    });
  }

  function turnOff() {
    setMessage(null);
    startTransition(async () => {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe().catch(() => {});
      }
      setState("off");
      setMessage("Alerts are off on this device.");
    });
  }

  function test() {
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestPush();
      setMessage(result.error ?? "Sent. It should arrive in a few seconds.");
    });
  }

  return (
    <div className="card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Smartphone size={ICON.sm} />
        Alerts on this phone
      </p>

      {state === "checking" && <p className="mt-2 text-xs text-ink-soft">Checking…</p>}

      {state === "ios-install" && (
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          On an iPhone, alerts work once the app is on your Home Screen. In Safari,
          tap the Share button, then <em>Add to Home Screen</em>, open the app from
          there and come back to this page.
        </p>
      )}

      {state === "unsupported" && (
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          This browser can&apos;t show notifications. Try Chrome on Android, or add
          the app to your iPhone&apos;s Home Screen.
        </p>
      )}

      {state === "denied" && (
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          Notifications are blocked for this app. Allow them in your phone&apos;s
          settings for this site or app, then come back here.
        </p>
      )}

      {state === "off" && (
        <>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            Get an alert when something new is posted, even when the app is closed.
          </p>
          <button
            type="button"
            onClick={turnOn}
            disabled={pending}
            className="btn btn-primary mt-3 w-full"
          >
            <BellRing size={ICON.sm} />
            {pending ? "Turning on…" : "Turn on alerts"}
          </button>
        </>
      )}

      {state === "on" && (
        <>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            On for this device. Choose below what you hear about.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={test} disabled={pending} className="btn btn-secondary flex-1">
              <Send size={ICON.sm} />
              Send a test
            </button>
            <button type="button" onClick={turnOff} disabled={pending} className="btn btn-ghost flex-1">
              <BellOff size={ICON.sm} />
              Turn off
            </button>
          </div>
        </>
      )}

      {message && (
        <p role="status" className="mt-2.5 text-xs leading-relaxed text-ink-soft">
          {message}
        </p>
      )}
    </div>
  );
}
