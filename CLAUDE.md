# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**Sadharmik** — a private PWA member directory for **Shri Jain Shwetambar (Murtipujak)
Marwadi Samaj, Indore**. The product is Sadharmik; the samaj keeps its own name in every
user-facing string about the people ("samaj members", "Samaj Karyakarini"). Next.js 15
App Router, React 19, Tailwind v4, Supabase (Postgres + Storage), Vercel. Five bottom
tabs: Home, Directory, Business, Feed, Me.

It is a **fork of PMConnect** (the PM Parivar app, `PM-Parivar/pm-parivar-social`), copied
on 4 October 2026 with the code and architecture unchanged and the identity replaced.
`SPEC.md` holds the confirmed product decisions and how they differ from PMConnect —
read it before changing product behaviour. `SETUP.md` is the account setup, written for
the owner, who is not a developer. `README.md` is in the same register.

## Current state

- **Supabase is not configured yet.** There is no offline mode: every screen, including
  sign-in (which shows member counts), reads the database. Until `.env.local` exists
  the app builds but no page renders. Verify appearance against a real project.
- **No importer yet.** PMConnect's importers read PM Parivar's spreadsheet and were not
  copied. The source here is `BOOK 2 TAPPAN SIR.xlsx`, MAIN SHEET only — layout and
  quirks in `SPEC.md` §6. Same for the logic test suite (`check-logic.ts`), which held
  PM Parivar member data and is rewritten alongside the importer.
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
| `npm run migrate` | Pushes `.data/db.json` into Supabase (upserts) — needs the importer first |

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

### Auth

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

**Kesar on cream.** Tokens are in `@theme` in `app/globals.css`; use the semantic names
(`bg-surface`, `text-ink-soft`, `btn btn-primary`), never raw Tailwind colours.

The one rule, from measurement (`docs/palette-sample.html` shows every pairing):
`kesar` #FF6331 is 2.97:1 against white, so it is a **plate, accent or mark, never a
label**. White text sits on `kesar-deep` (#D73400, 4.8:1). Saffron **words** use
`kesar-text` (#C32F00) or `kesar-ink` (#A12700) — `kesar-deep` itself drops to 3.97:1 on a
`kesar-pale` card, so it never sets text. In dark mode the actions invert to a light
plate with dark text, as in PMConnect.

| Token | Took over from PMConnect | Job |
|---|---|---|
| `kesar` | `sage-deep` | accent fills: the profile-completion bars, the wish ring. Not focus rings — those need 3:1, so they use `kesar-deep` |
| `kesar-pale`, `kesar-mist` | `sage-pale`, `sage-mist` | soft cards, chips, selected rows |
| `kesar-deep` | `olive` (as a background) | primary buttons, focus rings, active chips |
| `kesar-text` | `olive` (as text) | links and saffron words |
| `kesar-ink` | `olive-deep` | pressed states, small emphasis |

The logo is the samaj's own (`logo/`), supplied as a JPEG with no vector original;
`logo/samaj-logo-cutout*.png` is the transparent cut-out every public image is
generated from. One file serves cream, white and dark grounds, so `.lockup` and
`.lockup-plain` are the same. The artwork carries the samaj's name but not the app's,
so screens set "Sadharmik" as serif text beneath it. App icons are interim until the
committee decides whether a store-facing icon carries the swastik (`SPEC.md` §5).

Type: Fraunces for names only, Jakarta for the interface, Inter for reading, Noto Sans
Devanagari behind all three so Hindi renders properly. English first; Hindi labels are
a later phase.

## Data

`BOOK 2 TAPPAN SIR.xlsx` is a **sample list** (131 households, 660 people). Members
complete their own profiles in the app. The sheet carries every app field as columns
H–AE and opens on a HOW TO FILL sheet; columns A–G are the original data, untouched.
Every name ends in a bracketed family number like `(17)` — keep it as the household's
permanent ID.

**When writing the importer:** read Excel dates as raw serials and convert
arithmetically (`new Date(Math.round((raw - 25569) * 86400000))`). SheetJS's
`cellDates: true` shifts old dates back a day; it bit two PMConnect importers.

Spreadsheets, `.data/` and every `.env*` except the example are in `.gitignore`, which
was written before the first commit. **Never commit member data.**

SQL migrations are numbered files in `supabase/`, applied by hand in the Supabase SQL
Editor, `schema.sql` first; it seeds `admins`. Give each one a short title when handing
it over.

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

Planned: Vercel linked to GitHub (`Marwadi-Samaj-Indore/sadharmik`), so every push to
`main` deploys — unlike PMConnect, which deploys by CLI only. Functions run in Mumbai
(`bom1`, `vercel.json`), next to the database.

## Conventions

Comments explain **why**, in prose for a reader who wasn't there. Dependencies stay
minimal — prefer hand-rolling small UI over adding a package.
