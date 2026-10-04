import "server-only";
import { headers } from "next/headers";
import { createHash } from "node:crypto";

/**
 * Best-effort rate limiting for the sign-in gate.
 *
 * Held in memory, so a serverless platform running several instances will
 * allow proportionally more attempts, and a cold start forgets the count.
 * That is acceptable because it is defence in depth, not the actual lock:
 * identity rests on the signed session cookies (lib/session.ts) and the
 * full-ten-digit mobile gate, which cannot realistically be guessed. This
 * exists to stop casual hammering. If the sign-in gate ever weakens, move
 * this to a database table so the count is shared across instances.
 */
const attempts = new Map<string, number[]>();

const WINDOW_MS = 60 * 60 * 1000; // one hour
const MAX_ATTEMPTS = 5;

/** Hashed so we never store a visitor's raw IP address. */
async function clientKey(): Promise<string> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || list.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function checkSignInRate(): Promise<{
  allowed: boolean;
  remaining: number;
  minutesUntilReset: number;
}> {
  const key = await clientKey();
  const now = Date.now();

  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  attempts.set(key, recent);

  // Stop the map growing without bound on a long-lived instance
  if (attempts.size > 5000) {
    for (const [k, times] of attempts) {
      if (times.every((t) => now - t >= WINDOW_MS)) attempts.delete(k);
    }
  }

  if (recent.length >= MAX_ATTEMPTS) {
    const oldest = Math.min(...recent);
    return {
      allowed: false,
      remaining: 0,
      minutesUntilReset: Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 60000)),
    };
  }

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - recent.length,
    minutesUntilReset: 0,
  };
}

/** Called only on a failed attempt — a correct number costs nothing. */
export async function recordFailedSignIn() {
  const key = await clientKey();
  const list = attempts.get(key) ?? [];
  list.push(Date.now());
  attempts.set(key, list);
}
