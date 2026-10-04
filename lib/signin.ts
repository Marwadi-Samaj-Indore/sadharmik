/**
 * Whether members sign in through Google first, or with their mobile number
 * alone.
 *
 * OFF while the app is being tested (owner's decision, 4 Oct 2026): Google
 * isn't connected yet, and the samaj wanted people able to get in meanwhile.
 * Know what this trades away. With Google, a stranger needs a member's Google
 * account; without it, a stranger needs only a member's mobile number — and
 * those are printed in the samaj's own book. Turn this back ON before the app
 * is shared beyond testers (SETUP.md step 3 connects Google first).
 *
 * A plain constant, not an env variable, so the choice is visible in the code
 * and in its history rather than hidden in a dashboard.
 */
export const GOOGLE_SIGN_IN = false;
