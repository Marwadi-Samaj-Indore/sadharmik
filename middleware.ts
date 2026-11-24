import { NextResponse, type NextRequest } from "next/server";

/**
 * The sign-in gate, enforced before any page or route runs.
 *
 * It used to live only in app/(main)/layout.tsx. That is not a gate: Next.js
 * renders only the segments a navigation changes, decided from headers the
 * client sends, so a request claiming the layout was already on screen got the
 * page rendered without the layout's check — the whole directory, to a visitor
 * with no cookie at all (reproduced 24 Nov 2026 with a crafted RSC request).
 * Middleware runs for every request regardless of what the client claims.
 *
 * It checks the same HMAC signature lib/session.ts writes, using Web Crypto
 * because middleware cannot rely on node:crypto. It only asks "is this a
 * signature we made?" — pages still load the session for who and what role.
 */

/** Reachable without signing in. Everything else needs a signed cookie. */
const PUBLIC = [/^\/login(\/|$)/, /^\/verify(\/|$)/, /^\/auth\//, /^\/privacy$/, /^\/terms$/];

const encoder = new TextEncoder();
let keyPromise: Promise<CryptoKey> | null = null;

function hmacKey(): Promise<CryptoKey> | null {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  keyPromise ??= crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return keyPromise;
}

function base64url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Mirrors unsign() in lib/session.ts: the signature is after the LAST dot. */
async function isSigned(raw: string | undefined): Promise<boolean> {
  if (!raw) return false;
  const at = raw.lastIndexOf(".");
  if (at <= 0) return false;
  const key = hmacKey();
  if (!key) return false;
  const expected = base64url(
    await crypto.subtle.sign("HMAC", await key, encoder.encode(raw.slice(0, at)))
  ).slice(0, 32);
  const given = raw.slice(at + 1);
  if (given.length !== expected.length) return false;
  // Constant-time comparison: never stop at the first differing character
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((pattern) => pattern.test(pathname))) return NextResponse.next();

  const signedIn =
    (await isSigned(request.cookies.get("sdm_person")?.value)) ||
    (await isSigned(request.cookies.get("sdm_email")?.value));
  if (signedIn) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return new NextResponse("Sign in required.", { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Everything except Next's own assets and the public files (icons, logo,
  // manifest), which carry no member data and must load on the sign-in page
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|webp|jpg|svg|ico|json|txt)$).*)"],
};
