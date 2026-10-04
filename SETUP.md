# Setting up Sadharmik — the accounts, in order

This is the list of things that have to exist before the code can run anywhere but your
own laptop. It mirrors how PMConnect was set up, with two changes called out where the
PMConnect way turned out to be a nuisance. Each step says **who** does it — most are
yours, because they are accounts in your name (or the samaj's), and I can't create those.

Keep the values you collect in one place as you go — a note on your laptop, **not** a
WhatsApp message to yourself. Three of them are secrets.

---

## 0. One decision before anything: whose accounts?

PMConnect's biggest open item is "add a second owner, so the group never depends on one
person's account". Start Sadharmik the other way round.

**Recommended:** create one Google account for the samaj — something like
`sadharmik.app@gmail.com` — and make *it* the owner of GitHub, Supabase, Vercel and
Google Cloud below. Add your own account as a member or admin of each. If the committee
changes hands, the password changes hands; nothing has to be migrated.

If you'd rather start on your own account to move fast, that works too — but then
"transfer ownership to the samaj account" goes on the to-do list from day one.

---

## 1. GitHub — where the code lives &nbsp; *(you, about five minutes)*

> **Done, 4 October 2026.** Organisation **Marwadi-Samaj-Indore** (display name "Marwadi
> Samaj Indore"); private repository **`Marwadi-Samaj-Indore/sadharmik`**. This folder
> uploads to it over SSH, using the same key your portfolio already uses. The steps
> below stay as the record of how it was done.

**What it is, in one line:** GitHub is a safe for the app's code. Every change is kept,
with a note of what changed and when, so nothing is ever lost and any change can be
undone. Vercel (step 6) watches this safe and puts each new version online by itself.
The member spreadsheet never goes in — the folder's `.gitignore` already forbids it.

**Where things stand on this Mac:** you are already signed in to GitHub here as
**anandja1n**, and you're an admin of one organisation, **PM-Parivar**. An
*organisation* is a shared GitHub account owned by a group rather than a person —
PMConnect's code lives in `PM-Parivar/pm-parivar-social`.

**Give Sadharmik its own organisation, not a folder inside PM-Parivar.** It belongs to
a different community. When the samaj's committee takes it over, they should receive
their own organisation, with nothing of PM Parivar's attached.

### 1a. Create the organisation — on the website (GitHub only allows this there)

1. Go to **github.com/organizations/plan** while signed in.
2. Choose **Free**.
3. **Organization account name:** `Sadharmik` (if it's taken: `Sadharmik-Indore` or
   `JSM-Samaj-Indore`). This becomes part of the code's web address, so keep it plain.
4. **Contact email:** the samaj's Google account if you've made one (see step 0),
   otherwise yours.
5. **This organization belongs to:** *My personal account* is fine for now. It can be
   changed to a business or institution later.
6. Click **Next**, skip the "add members" screen (**Skip this step**), and finish.

### 1b. Create the repository — either way works

A *repository* ("repo") is one project inside the organisation — the actual safe.

**Option A — I do it, one command.** Tell me the organisation name you chose in 1a,
and I'll run this on your Mac:

```bash
gh repo create Sadharmik/sadharmik --private --description "Member directory for Shri Jain Shwetambar (Murtipujak) Marwadi Samaj, Indore"
```

It creates an empty, private repository and nothing else. Same outcome as Option B.

**Option B — by hand on the website.**

1. Go to **github.com/new**.
2. **Owner:** pick the new organisation from the dropdown (not anandja1n).
3. **Repository name:** `sadharmik`.
4. **Private** — not Public. The code holds no member data, but there's no reason for
   it to be visible.
5. Leave **all three** boxes unticked — no README, no .gitignore, no licence. The folder
   already has its own, and a repository that starts with files in it makes the first
   upload awkward.
6. **Create repository.** Ignore the instructions page that follows; send me the
   address at the top, which looks like `https://github.com/Sadharmik/sadharmik`.

**What I do next:** turn this folder into a git project, copy PMConnect's code in
(without its data, secrets, screenshots or history), rename it, apply the saffron
colours, make the first save, and upload it. You'll see the files appear on the
repository page.

---

## 2. Supabase — the database and photo storage &nbsp; *(you, then me)*

1. At supabase.com, in the **Marwadi Samaj Indore** organisation, **New project**.
   Field by field:

   | Field | Choose | Why |
   |---|---|---|
   | Organization | **Marwadi Samaj Indore** | The samaj's own, as with GitHub |
   | GitHub (optional) | **Leave it unconnected** | It only applies SQL kept in Supabase's own `supabase/migrations/` layout. Ours is pasted into the SQL Editor by hand, as PMConnect's is. Linking adds a second way to change the database that nobody uses. It can be connected later |
   | Project name | `Sadharmik App` (any name works) | Only you see it |
   | Database password | Click **Generate a password**, then **save it in your password manager** | Rarely needed, can't be recovered. Don't send it to anyone, including me |
   | Region | **Mumbai** specifically — open the dropdown and pick the city, not the general "Asia-Pacific" | The app's server runs in Mumbai; the database must be next to it. "Asia-Pacific" lets Supabase choose, which may be Singapore |
   | Enable Data API | **On** | The app reads and writes through it |
   | Automatically expose new tables | **Off** | Supabase recommends off. Sadharmik's SQL grants access to the server alone, so the public key can't even see the tables |
   | Enable automatic RLS | **On** | A safety net: any table ever added is locked by default. Every table in our SQL locks itself anyway |

2. Wait a minute for it to provision, then collect, from **Project Settings**:
   - *Data API* → **Project URL** (`https://xxxx.supabase.co`)
   - *API Keys* → **anon / public** key (safe to be public)
   - *API Keys* → **service_role** key (click Reveal) — **secret; this key can read
     and change everything**
3. Send me the first two. **Don't paste the service_role key into a chat.** Put it
   straight into `.env.local` yourself when we get to step 5, or into Vercel in step 6.

### 2a. Check the project (30 seconds)

Open the project, then **Project Settings → General**. The region must read
**South Asia (Mumbai)**. A project's region can't be changed afterwards. If it says
something else, delete the project (it's empty, nothing is lost) and make a new one.

### 2b. Set up the database — one paste

1. Open **`supabase/setup-all.sql`** in this folder, **select all and copy**.
2. In Supabase: **SQL Editor** (left sidebar) → **New query** → paste → **Run**.
3. It should finish with **"Success. No rows returned"**. If it reports an error, send me
   the exact words and don't run it again.

That one file contains everything: the tables, the lock on them, the server's access, the
two admin addresses (`anandjain0498@gmail.com` and `marwadisamajindore@gmail.com`) and the
private `member-photos` bucket. It's generated from the numbered files, which stay the
source of truth (`npm run sql` rebuilds it). It was tested twice over on a scratch copy of
Postgres first. Running it again later is harmless.

### 2c. What goes where — the passwords and keys

| What | Where you find it | Where it goes | Give it to me? |
|---|---|---|---|
| **Database password** | You generated it in step 1 | Your password manager. **Nowhere else.** The app never uses it | **No. Never** |
| **Project URL** | Project Settings → *Data API* | `.env.local`, line `NEXT_PUBLIC_SUPABASE_URL` | Not needed |
| **Publishable key** (`sb_publishable_…`) | Project Settings → *API Keys* | `.env.local`, line `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Not needed |
| **Secret key** (`sb_secret_…`) | *API Keys* → *Secret keys* → copy | `.env.local`, line `SUPABASE_SERVICE_ROLE_KEY` | **No. Never** |
| **Committee code** | You choose it | `.env.local`, line `ADMIN_ACCESS_CODE` | No |

The names in `.env.local` are the older ones. Supabase's dashboard says "publishable" and
"secret", and the installed version of the app's Supabase library accepts both styles. If
your dashboard still offers the old *anon* and *service_role* keys, those work too.

**You never need to send me a key.** `.env.local` lives on this Mac, and `npm run
check:setup` reads it and tells you PASS or FAIL without printing a single key. Run it
yourself, or tell me "done" and I'll run it.

---

## 3. Google sign-in &nbsp; *(you — this is the fiddly one)*

Google sign-in needs Google to know the app exists. It's a one-time setup, about 20
minutes, done in two places.

**In Google Cloud** (console.cloud.google.com, signed in as the owning account):

1. Create a project named `Sadharmik`.
2. *APIs & Services → OAuth consent screen*: **External**; app name **Sadharmik**;
   support email and developer contact — the samaj account. Save. You do **not** need to
   add scopes beyond the defaults, and you don't need to "publish" the app for testing.
3. *APIs & Services → Credentials → Create credentials → OAuth client ID*:
   - Type: **Web application**, name `Sadharmik`
   - **Authorised redirect URI** — exactly this, with your project's ref from step 2:
     `https://xxxx.supabase.co/auth/v1/callback`
   - It gives you a **Client ID** and **Client secret**. Keep both to hand.

**In Supabase:**

4. *Authentication → Providers → Google*: enable it, paste the Client ID and secret.
5. *Authentication → URL Configuration*:
   - **Site URL**: your Vercel address once it exists (step 6); `http://localhost:3310`
     until then
   - **Redirect URLs** — add every place the app can live, each ending in
     `/auth/callback`:
     - `http://localhost:3310/auth/callback`
     - `https://sadharmik.vercel.app/auth/callback` (or whatever Vercel gives you)
     - the real domain, when you have one

If sign-in later fails with "redirect_uri_mismatch", it's always step 3's URI or step 5's
list. Nothing else produces that message.

> **Why port 3310, not PMConnect's 3210.** You'll have both apps on this laptop. Two
> dev servers can't share a port, and the error when they try is confusing. Sadharmik
> gets 3310.

---

## 4. The spreadsheet &nbsp; *(nothing urgent)*

**`BOOK 2 TAPPAN SIR.xlsx` is a sample list**, not the whole samaj. It seeds the app with
real families so every screen has something in it. The rest comes in through the app:
members fill in their own details, and admins add new families there.

The sheet carries **every field the app holds**, so a fuller list can be imported the
same way whenever one turns up. It opens on a **HOW TO FILL** sheet; in short:

- Columns A–G are untouched. The new columns, **H to AE**, are coloured by kind:
  kesar = family, gold = person, blue = contact, green = work.
- Family columns (area, city, pincode, gotra, native place, maps link) are filled once,
  on the head's row. They're greyed out on members' rows.
- **Yellow cells** in columns C and F need checking: 116 members with no relation
  written, and 5 mobile numbers that aren't 10 digits.
- Nobody has to fill the empty columns before launch. Empty is fine.

The untouched original is kept beside it as `BOOK 2 TAPPAN SIR (original, untouched).xlsx`.
Both stay on your laptop: the folder's `.gitignore` stops any `.xlsx` from being uploaded.

---

## 5. Putting the keys in, and running it &nbsp; *(you, ten minutes)*

`.env.local` is the app's private settings file. It's already created in this folder with
the session secret filled in. Four lines are waiting for you. The file's name starts with
a dot, so Finder hides it. The easiest way to open it is this command in a terminal:

```bash
open -e "/Users/freeze/Desktop/12_Claude_code/Jain_shwetambar_marwadi_samaj_app/.env.local"
```

It opens in TextEdit. Paste each value straight after its `=`, **with no spaces and no
quote marks**, like this (these are made up):

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_AbCdEf…
SUPABASE_SERVICE_ROLE_KEY=sb_secret_GhIjKl…
ADMIN_ACCESS_CODE=choose-something-long-and-memorable
```

- **The URL** has nothing after `.supabase.co` — no slash, no `/rest/v1`.
- **The two keys are different.** The publishable one starts with `sb_publishable_`, the
  secret one with `sb_secret_`. Putting them on the wrong lines is the commonest slip, and
  the check below catches it.
- **The committee code** opens the admin panel without Google, so make it long, something
  like four unrelated words. If it contains a `#`, put the whole code in "double quotes",
  or everything after the `#` is silently dropped (the check warns about this).
- **Leave `SESSION_SECRET` and `NEXT_PUBLIC_SITE_URL` alone.**

Save with **⌘S** and close TextEdit. Then, in a terminal inside this folder:

```bash
npm run check:setup
```

It prints PASS or FAIL for each thing, with what to do next, and never prints a key.
When every line says PASS:

```bash
npm run dev
```

Opens at **http://localhost:3310**. Importing Book 2's families comes next.

**If you ever paste a secret key into the wrong place** (a chat, an email, a screenshot),
treat it as leaked: *API Keys → the secret key → Regenerate*, then paste the new one into
`.env.local`. Nothing else needs to change.

---

## 6. Vercel — the hosting &nbsp; *(you)*

**This is the one place I'd deliberately not copy PMConnect.** PMConnect's Vercel project
has no link to GitHub, so every deploy is a terminal command — `npx vercel --prod` — and
nothing goes live until someone remembers to run it. For Sadharmik, link the two:

1. At vercel.com, signed in as the owning account, **Add New → Project → Import** the
   `sadharmik` repository from GitHub. Framework is detected as Next.js. Region is
   already set to Mumbai by `vercel.json` in the code.
2. Before the first deploy, add the **Environment Variables** — the same names as
   `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_ACCESS_CODE`, `SESSION_SECRET`, and
   `NEXT_PUBLIC_SITE_URL` (the Vercel address, e.g. `https://sadharmik.vercel.app`).
3. Deploy. From then on, **every push to `main` goes live by itself**, and every branch
   gets its own preview address — which is the "test copy" PMConnect maintains by hand.
4. Go back to step 3.5 and put the Vercel address into Supabase's redirect list.

---

## 7. Domain &nbsp; *(you, later — nothing waits on it)*

`sadharmik.in` and `sadharmik.app` are worth checking first. Buy it in the samaj's name
(the registrar account, like the rest, on the owning account), then in Vercel
*Project → Domains* add it and follow the two DNS records it asks for. Takes ten minutes
plus however long DNS takes to settle, usually under an hour.

---

## What I need from you to start

| | Needed for |
|---|---|
| Supabase Project URL and anon key | `.env.local.example` and the first deploy (step 2) |

Everything in steps 3, 6 and 7 can happen while I'm building.
