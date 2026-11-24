# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**Marwadi Samaj Indore** — a private PWA member directory for **Shri Jain Shwetambar (Murtipujak)
Marwadi Samaj, Indore**. Renamed from *Sadharmik* on 4 Oct 2026: every user-facing string
says "Marwadi Samaj Indore" (home-screen label "Marwadi Samaj", which fits under an icon), while
the plumbing keeps `sadharmik` — repo, Vercel project and URL, package name, cookie
prefix `sdm_`, Supabase project — because renaming those breaks links and sessions for
nothing. The samaj keeps its own name in every
user-facing string about the people ("samaj members", "Samaj Karyakarini"). Next.js 15
App Router, React 19, Tailwind v4, Supabase (Postgres + Storage), Vercel. Five bottom
tabs: Home, Directory, Business, Feed, Me.

It is a **fork of PMConnect** (the PM Parivar app, `PM-Parivar/pm-parivar-social`), copied
on 4 October 2026 with the code and architecture unchanged and the identity replaced.
`SPEC.md` holds the confirmed product decisions and how they differ from PMConnect —
read it before changing product behaviour. `SETUP.md` is the account setup, written for
the owner, who is not a developer. `README.md` is in the same register.

## Current state

- **Supabase is configured** (project "Sadharmik App", Mumbai) and `.env.local` is
  filled; `npm run check:setup` passes. Book 2 is loaded: 131 households, 660 people,
  128 needs-attention issues.
- **Data entry from the paper forms** goes into `Member Entry Sheet.xlsx` (built by
  `scripts/build-entry-sheet.py`; local only, like every .xlsx): one row per person,
  the form's circled number in FORM NO. on every row, SR. 1 the head, family fields on
  the head's row. Father's name, office/residence phones and "circulars at" have no app
  field yet — the importer counts them as kept in the sheet only.
- **Importer:** `scripts/import.mjs` (`npm run import -- <file>`, then `npm run migrate`)
  reads either layout — an ENTRY sheet (columns found by heading) or Book 2's MAIN
  SHEET; `--dry-run` checks without writing. Book 2 output was verified byte-identical
  to the original importer after the rewrite.
  The bracketed number is the book's own family number (1–225), not S.NO — the book
  gives two families (193); the repeat gets id `h193-<sno>` and an issue. IDs are
  `h<n>` and `p<n>-<i>`. The logic test suite (`check-logic.ts`) is not rewritten yet.
- **Birthdays and anniversaries are for admins only** (owner's decisions, 4 Oct and
  23 Nov 2026): members' Home has no celebrations; an admin's Home shows the next 7
  days with Wish-on-WhatsApp buttons signed "— Marwadi Samaj Indore"
  (`lib/celebrations.ts`). Anniversaries come from `households.anniversary` (head
  couple) and `people.anniversary` (migration 009; a married son or daughter), the
  latter grouped per household by date so a couple shows once. The profile form shows
  the anniversary field only while "Married" is picked (`MaritalFields`); for the head
  and spouse it reads and writes the household's date. `savePerson` retries without the
  column if 009 hasn't been run.
- **Admins:** anandjain0498, marwadisamajindore, globe.jeet, mahitmehtajeet (all
  @gmail.com) — seeded in `schema.sql` and live in the `admins` table. An address only
  brings admin through Google sign-in; the committee code still works without it.
- **Not copied on purpose:** every PMConnect script that contained real members' names
  or phone numbers (screenshot, recording, verification and seed scripts). Never bring
  PM Parivar data into this repository.
- Planned code changes are listed in `SPEC.md` §7: search at scale, admins adding
  families in-app, places and events, gotra/native-place lists, joint-family
  relationships with anniversary per couple. The sangh level and self-registration
  are deferred.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port **3310** (PMConnect uses 3210; both can run at once) |
| `npm run build` | Production build |
| `npm run typecheck` | Typecheck the app — there is no lint script. `tsconfig.scripts.json` is kept for the test suite; when `scripts/check-logic.ts` returns, add `&& tsc -p tsconfig.scripts.json` back, as PMConnect has |
| `npm run import -- "<file>.xlsx"` | Reads a spreadsheet (entry sheet or Book 2, the default) into `.data/db.json`; prints counts only. `--dry-run` writes nothing |
| `npm run migrate` | Pushes `.data/db.json` into Supabase (upserts) |

**Never run `npm run build` while `npm run dev` is up.** They share `.next`; the build
overwrites the dev server's chunks and the running app silently stops hydrating — client
components vanish with a clean console. Restart the dev server to recover.

## Architecture (inherited from PMConnect, unchanged)

### lib/db.ts is the only file that touches storage

`getDb()` loads the **entire** directory in one pass, wrapped in React's `cache()`.
Writes are targeted per-record functions. Row mapping is manual in both directions
(`toPerson`/`fromPerson`, …) because the database is `snake_case` and the app is
`camelCase`: **adding a field means editing both mappers plus `lib/types.ts` plus the
SQL.** Tables added after the original schema are read defensively — a missing table is
"none yet", not an outage. Keep that pattern.

The whole-directory load suits a few hundred people, not a samaj of thousands; replacing
it with paged Postgres queries is `SPEC.md` §7 item 1.

### Security model

RLS is **on with no public policies** — the anon key can read nothing. The server uses
the service-role key and permission checks live in our code (`canEdit` in
`lib/session.ts`) before every write. `lib/supabase.ts`, `lib/session.ts`,
`lib/storage.ts`, `lib/theme.ts` and `lib/ratelimit.ts` are `import "server-only"` — never
import them, or types from them, into a client component (`Theme` lives in
`lib/types.ts` for that reason).

### Security rules (audit of 24 Nov 2026 — keep these true)

- **`middleware.ts` is the sign-in gate**, not the `(main)` layout. A layout check can
  be skipped: a crafted RSC request (`RSC: 1` + a forged `Next-Router-State-Tree`)
  rendered /directory to a visitor with no cookie. Middleware verifies the HMAC on
  `sdm_person`/`sdm_email` with Web Crypto before anything renders. A new public page
  must be added to its `PUBLIC` list deliberately; everything else is gated.
- **The mobile number is an introduction, not proof.** `verifyMobile`/`chooseIdentity`
  refuse a profile already claimed by a different Google address (`linkedElsewhere`).
- **Uploads are raster images or PDF only** (`storeImage`/`storeFile`). Never accept
  `image/svg+xml`. `/api/photo` serves only those types, with `nosniff`, and a
  `sandbox` CSP for images (not PDFs — Chrome won't render a sandboxed PDF); it is
  excluded from the site-wide headers in `next.config.mjs` so it can set its own.
- **The visiting-card field keeps only its existing stored path**; any other
  non-upload value is dropped (it once let a member delete another member's file).
- **Every member-typed link goes through `cleanUrl`** on save and on render.
- **Hidden means absent from the page**, not just not displayed: anything passed to a
  client component is in the page source (hidden mobiles once sat in the Directory's
  search text). A hidden birth year also hides the age; Matrimony sends a 5-year band.
- CSV export prefixes `= + - @` cells with `'`. Session cookies are `secure` in
  production. The committee code is compared as SHA-256 digests in constant time.
  The callback only accepts a Google identity.
- Remaining by choice: the sign-in rate limit is in memory per instance; `xlsx` and
  Next's bundled `postcss` carry advisories but only touch our own files.

### Auth

**Two flags in `lib/signin.ts`.** `GOOGLE_SIGN_IN` shows the Google button — on since
23 Nov 2026, when the Google provider was configured in Supabase (Google Cloud project
"Marwadi Samaj Indore", owned by marwadisamajindore@gmail.com; public /privacy and
/terms exist for its branding page). `MOBILE_SIGN_IN` is **off** since 23 Nov 2026 (the pilot):
Google is the only way in, and the mobile number is the one-time introduction after it.
Turned on, it lets the number alone sign a member in — weak, since members' numbers are
printed in the samaj's book. A Google address that matches exactly one unclaimed
member's `email` (typed from the paper form) is claimed in the callback and skips the
mobile step. A
profile claimed by mobile carries the `verified-by-mobile` placeholder, which a real
Google address later replaces. The description below is the Google route.

Google is the front door; a **full 10-digit mobile number** is the one-time introduction
that records the Google address on the member's row (the spreadsheet has almost no
email addresses). A number shared by a household offers every member of it. Sessions
are **HMAC-signed cookies**, not Supabase Auth: `sdm_person` (member), `sdm_email`
(admin), plus short-lived `sdm_google` and `sdm_verify` for the gate, and `sdm_theme`.
The prefix differs from PMConnect's `pmp_` so the two apps can never read each other's
cookies on one development machine. Key: `SESSION_SECRET`, falling back to the service
key. Committee sign-in is the shared `ADMIN_ACCESS_CODE` — the emergency door; a Google
address in the `admins` table also grants admin.

`.env` parsing treats `#` as a comment: a code containing `#` must be quoted in
`.env.local` or it silently truncates. Vercel's env vars are unaffected.

### Photos, server actions, theme

- Uploads go to the private bucket `member-photos`; only the path is stored, served
  through `/api/photo/[...path]` after a session check. `PhotoCropper.tsx` is hand-rolled;
  visiting cards skip it.
- Mutations live in `app/actions/*.ts`: session → permission → `lib/db.ts` write →
  `appendChange()` (admin undo log) → `revalidatePath` → redirect with `?saved=`.
- Theme is resolved **server-side** from `sdm_theme` onto `<html data-theme>`, Light by
  default whatever the phone says. The sign-in page opts out of dark via `.on-cream`.

## Design

**Clay, sun and leaf on peach-cream, deep teal ink** (redesign of 23 Nov 2026, from
the owner's reference; it replaced the saturated saffron "kesar" palette, and the
`kesar-*` token names with it). Tokens are in `@theme` in `app/globals.css`; use the
semantic names (`bg-surface`, `text-ink-soft`, `btn btn-primary`), never raw colours.
`docs/palette-sample.html` shows the OLD palette and is kept only as history.

Each accent has one job, which is what keeps three colours from competing:

| Family | Tokens | Job |
|---|---|---|
| clay (terracotta) | `clay-pale`, `clay-soft`, `clay`, `clay-deep`, `clay-text`, `clay-ink` | actions and the app's voice: primary buttons (`clay-deep` plate), links (`clay-text`), the featured card, the active tab |
| sun (mustard) | `sun-pale`, `sun`, `sun-ink` | things to notice: upcoming dates, warn badges, the unread dot, empty-state icons |
| leaf (forest) | `leaf-pale`, `leaf`, `leaf-ink` | positive and "how much": meters, the on switch, the saved toast, info/success badges |
| ink (deep teal) | `ink`, `ink-soft`, `ink-faint` | text; and the SELECTED state of chips and toggles (`chip-active` is ink, not clay) |
| ground | `cream`, `cream-deep`, `surface` (warm off-white, never #fff), `sand` (neutral tint) | page, cards, fields and pressed rows |

Rules that came from measurement: every text token clears 4.5:1 on every surface it is
used on; `clay` and `sun` are plates and marks, never labels (clay is 3.2:1 on cream).
Labels on a clay or leaf plate use `text-surface`, and `chip-active` uses `cream`, so
they flip with the theme without a dark-mode rule. Surfaces are nearly flat: tone and a
hairline separate them, shadow is for things that float. Chips and ghost buttons are
outlined pills. Monogram avatars and the admin stat tiles rotate the three pale tints.
Dark mode is a teal-charcoal ground with the same three accents lightened.

The logo is the samaj's own (`logo/`), supplied as a JPEG with no vector original;
`logo/samaj-logo-cutout*.png` is the transparent cut-out every public image is
generated from. One file serves cream, white and dark grounds, so `.lockup` and
`.lockup-plain` are the same. The artwork carries the samaj's name but not the app's,
so screens set the name in English, in the serif, beneath it. App icons are interim until the
committee decides whether a store-facing icon carries the swastik (`SPEC.md` §5).

Type: Noto Serif for names only (not Fraunces, whose J drops below the line), Jakarta for the interface, Inter for reading, Noto Sans
Devanagari behind all three so Hindi renders properly. English first; Hindi labels are
a later phase.

## Data

`BOOK 2 TAPPAN SIR.xlsx` is a **sample list** (131 households, 660 people). Members
complete their own profiles in the app. The sheet carries every app field as columns
H–AE and opens on a HOW TO FILL sheet; columns A–G are the original data, untouched.
Every name ends in a bracketed family number like `(17)` — keep it as the household's
permanent ID.

The importer reads Excel dates as raw serials and converts them
arithmetically (`new Date(Math.round((raw - 25569) * 86400000))`). SheetJS's
`cellDates: true` shifts old dates back a day; it bit two PMConnect importers.

Spreadsheets, `.data/` and every `.env*` except the example are in `.gitignore`, which
was written before the first commit. **Never commit member data.**

SQL migrations are numbered files in `supabase/`, applied by hand in the Supabase SQL
Editor, `schema.sql` first; it seeds `admins`. A **new** project takes one paste of
`supabase/setup-all.sql`, generated from all of them by `npm run sql` — never edit it by
hand, and rerun the command after changing any numbered file. Give any new migration a
short title when handing it over.

`npm run check:setup` reads `.env.local` and reports PASS/FAIL on the settings, the
server key, the grants, the public key's lockout and the photo bucket **without printing
a key** — which is how the owner's secrets stay out of chats. Prefer it to asking for a
value. Supabase now issues `sb_publishable_…` / `sb_secret_…` keys; the env variable names
stayed `…ANON_KEY` / `…SERVICE_ROLE_KEY` and hold either style (supabase-js 2.110 accepts
both).

**Grants are explicit here, unlike PMConnect.** The project has "Automatically expose
new tables" OFF (Supabase's default for projects created from 30 May 2026), so a new
table is granted to no API role — not even `service_role`, which every server read
uses — and fails with `42501 permission denied`. `schema.sql` sets
`alter default privileges for role postgres … to service_role`, so any table created
afterwards in the SQL Editor is covered automatically. A table created any other way
(CLI, another role) needs its own `grant select, insert, update, delete … to
service_role`. Never grant to `anon` or `authenticated`: the anon key is used only for
the Google OAuth round trip.

## Deploying

Vercel project `sadharmik` in the owner's own Hobby account (`freezepink`), linked to
GitHub (`Marwadi-Samaj-Indore/sadharmik`), so every push to `main` deploys — unlike
PMConnect, which deploys by CLI only. The five env vars were pasted by the owner, never
through a chat. Before launch it moves to an account the samaj owns, behind its own
domain, so the address members install from never changes. Never use the Vercel or
Supabase connectors in Claude sessions for this project: they belong to other people. Functions run in Mumbai
(`bom1`, `vercel.json`), next to the database.

## Conventions

Comments explain **why**, in prose for a reader who wasn't there. Dependencies stay
minimal — prefer hand-rolling small UI over adding a package.
