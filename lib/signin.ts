/**
 * The ways in on the sign-in page. Plain constants, not env variables, so the
 * choice is visible in the code and in its history rather than in a dashboard.
 *
 * GOOGLE_SIGN_IN shows "Continue with Google". It stays OFF until Google is
 * connected in Supabase (SETUP.md step 3) — before that the button leads to an
 * error page. With it on, a known Google address signs straight in, and an
 * admin's address (the `admins` table) brings the committee tools with it.
 *
 * MOBILE_SIGN_IN lets the 10-digit mobile number alone sign a member in
 * (owner's decision, 4 Oct 2026). Know what it trades away: with Google, a
 * stranger needs a member's Google account; with the number, only a member's
 * number — and those are printed in the samaj's own book. Turn it OFF once
 * members are used to Google; the number then becomes the one-time
 * introduction after Google instead of a way in by itself.
 *
 * At least one of the two must be on.
 */
export const GOOGLE_SIGN_IN = false;
export const MOBILE_SIGN_IN = true;
