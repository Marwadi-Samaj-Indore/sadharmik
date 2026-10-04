/**
 * Edit screens are reached from several places — the Me tab, a member's
 * profile, the Home completion nudge, a business category, the admin queue.
 * Each caller passes `?from=…` so Back, Cancel and Save all return to where
 * the member actually started, keeping the bottom tab they were on.
 */
export type Origin = "me" | "admin" | "home" | "business" | "household" | "person";

export function resolveReturnTo(
  from: string | undefined,
  { personId, householdId }: { personId?: string; householdId?: string }
): string {
  switch (from) {
    case "me":
      return "/me";
    case "admin":
      return "/admin";
    case "home":
      return "/";
    case "business":
      return "/business";
    case "household":
      return householdId ? `/household/${householdId}` : "/directory";
    default:
      return personId ? `/person/${personId}` : "/directory";
  }
}

/** Label for the back bar, so it reads as the place you're returning to. */
export function returnLabel(from: string | undefined): string | null {
  switch (from) {
    case "me":
      return "Back to Me";
    case "admin":
      return "Back to admin panel";
    case "home":
      return "Back to Home";
    case "business":
      return "Back to Business";
    default:
      return null;
  }
}

/**
 * Only ever redirect to our own relative paths — a value arriving in a form
 * body must never be able to send a member off-site.
 */
export function safeReturnTo(value: unknown, fallback: string): string {
  const path = typeof value === "string" ? value.trim() : "";
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (!/^\/[A-Za-z0-9\-._~/]*$/.test(path)) return fallback;
  return path;
}

/** Appends the flag that makes the destination screen confirm the save. */
export function withSavedFlag(
  path: string,
  kind: "profile" | "household" | "post" | "member" | "meeting" | "switched"
) {
  return `${path}${path.includes("?") ? "&" : "?"}saved=${kind}`;
}
