# Sadharmik — app plan and direction

Living document. Last updated: 3 October 2026.
Decisions below are confirmed unless marked **OPEN**. It is written to be read next to the PM
Parivar app's `SPEC.md`, because this app inherits that one's code, structure and
decisions wherever the two communities are alike, and changes only where they are not.

---

## 1. What this is, and how it differs from PMConnect

A private member directory and connection app for **Shri Jain Shwetambar (Murtipujak)
Marwadi Samaj, Indore** — the name as it appears on the samaj's own logo (`logo/`). Same three purposes as PMConnect — know what members do for a living, know
birthdays and anniversaries, find and contact anyone fast — and the same five tabs,
the same screens, the same way of working. A member who has used one will know the other.

The difference is **what kind of community it is**, and that changes four things that
run underneath every screen:

| | PM Parivar | Jain Shwetambar Marwadi Samaj |
|---|---|---|
| **Kind** | A social group — one committee, one WhatsApp group | A religious samaj — the Indore Shwetambar Marwadi community, organised under a Mahasangh with area-level sanghs (Rajendra Nagar, …), temple trusts and upashrays |
| **Size** | 191 households, 451 people | Thousands of households. The exact figure is open item #2 |
| **Where the member list comes from** | One spreadsheet the committee already had | A **sample list** (Book 2, 131 families) to start. People rarely hand their details over for a spreadsheet, so members complete their own profiles **in the app**, and admins add new families there too. Self-registration is **deferred** (see §3 #3) |
| **Reason to open it daily** | Birthdays, the next meeting | Birthdays, **plus the dharmik calendar** — Paryushan, Samvatsari, Ayambil Oli, Chaturmas, Mahavir Jayanti — and the samaj notices that follow them |

Everything in §3 onwards follows from those four rows.

---

## 2. Technical decisions

**Start from the PM Parivar codebase, as-is.** Same Next.js app, same Supabase layout,
same Vercel hosting, same security model (members never touch the database; every read
and write goes through the app's own server code). The design tokens, the photo
cropper, the import pipeline, the admin undo log, the whole feed — all of it carries
over. What changes is listed in §7; it is a short list for a reason.

| Item | Decision | Cost |
|---|---|---|
| Platform, phase 1 | **PWA** — the same install-to-home-screen app PMConnect is. Live on day one, on every phone, no store approval | ₹0 |
| Platform, later — **OPEN** | **Android on Google Play** — the PWA packaged as a Trusted Web Activity. Google built this route for exactly this; the app in the store *is* the live site, so there is nothing to rebuild | ₹2,100 one-time (Play Console) |
| Platform, later — **OPEN** | **iPhone on the App Store** — see §8; this is the one that costs real work | ₹8,300/yr (Apple Developer Program) + a Mac to build on |
| Framework / database / hosting | Next.js · Supabase · Vercel, unchanged | ₹0 on free tiers |
| Domain | To buy, in the samaj trust's name. `sadharmik.in` / `sadharmik.app` to check | ~₹700–1,200/yr |
| **Running cost until the store phases** | | **Domain only** |

**One budget line PMConnect never had to worry about.** Supabase's free tier gives 1 GB
of file storage. At 150 KB a photo, that is roughly 6,000 photos — comfortable for 191
households, tight for a samaj where every head of household uploads one and many
upload a visiting card. When it runs out the next tier is about ₹2,100 a month. Plan
for it; don't be surprised by it.

---

## 3. Product decisions — what carries over, what changes

**Carried over unchanged from PMConnect** (see its `SPEC.md` §3): the household
structure, mandatory photo for the head of household only, per-field privacy
toggles, no-approval editing with admin undo, business categories from a fixed
dropdown, `noindex` and sign-in on every page, no data outside the samaj.

| # | Decision | Detail |
|---|---|---|
| 1 | **App name** | **Sadharmik** (confirmed 3 October 2026) — the Jain word for a fellow follower of the faith; *sadharmik vatsalya*, care for one's fellow Jains, is the exact thing the app exists for. The samaj stays "Jain Shwetambar Marwadi Samaj" wherever the app refers to the people |
| 2 | **Login** | Google sign-in, as PMConnect. One tap after the first visit |
| 3 | **Joining** | **As PMConnect, for now:** every member is either in the imported sheet or **added by an admin in the app**, and passes the 10-digit mobile gate once. Self-registration with vouching/approval is **deferred** — it is designed (join form, pending queue, sangh admin approves) and can be added without touching anything built before it, so nothing here closes that door |
| 4 | **Structure** | **Samaj → household → person for now**, as PMConnect. The **sangh level** (samaj → sangh → household → person) is liked and designed, and **deferred** (4 October 2026) until there is a sangh list. Adding it later is one table and one column on households; nothing built before it has to change |
| 5 | **Admins** | **One level for now: samaj admins**, who do everything — edit any record, add families, circulars, the dharmik calendar, export. Sangh admins arrive with the sangh level. Identified by Google address, with the shared-code emergency door PMConnect keeps |
| 6 | **Gotra and native place are first-class** | In a Marwadi samaj, gotra and *mool gaam* (the village in Marwar the family came from) carry real connection value — "who else is Surana from Jodhpur" is a question people actually ask. Both become **dropdowns built with the committee**, never free text. PMConnect's import found gotra on only 2 of 191 households because it was parsed from a name cell; this app asks for it at sign-up |
| 7 | **Language** | **English first** (decided 3 October 2026), as PMConnect. Hindi labels are a later phase. Hindi *text* still renders properly from day one — names, notices and the logo's own lettering — because the Devanagari fonts carry over regardless. To keep the later phase cheap, new interface strings are written in one place rather than scattered |
| 8 | **Contact visibility at scale** | PMConnect shows every detail to every member — right for 450 people who all know each other, wrong for thousands who don't. Defaults tighten: **women's and children's mobile numbers are hidden by default** (a one-tap toggle reveals them); the whole-directory export is samaj-admin only and logged; a member can look up as many people as they like but cannot bulk-copy the list |
| 9 | **Donations and payments** | **Excluded**, deliberately. They bring tax, trust-law and app-store commission questions the app doesn't need. A trust can post its UPI details in an announcement |
| 10 | **Matrimonial** | Carried over as PMConnect built it — a shelf of biodata documents with the uploader as contact — **not** a matchmaking product with interest requests and chat. That product exists elsewhere (Jainam Rishtey, Jain Parichay Patrika) and would consume the committee in moderation |
| 11 | **Privacy law** | India's DPDP Act 2023 applies to a database of this size: a consent line at joining, a privacy policy page, and a way to request deletion. Both app stores require the policy page anyway |

---

## 4. The five tabs — what each gains

The layout is PMConnect's. Nothing moves; some things are added.

### 🏠 Home
- **Today's parv**, when there is one — the dharmik calendar entry for the day sits above the birthdays, because on Samvatsari morning that is the reason the app was opened
- Birthdays and anniversaries with one-tap *Wish on WhatsApp*, pinned announcement, next event, profile nudge — as PMConnect
- The **Karyakarini** (office bearers) section PMConnect calls "Committee"

### 👥 Directory
- Households / People toggle, spelling-tolerant search, area / gotra / blood-group filters — as PMConnect, with **native place** added as a filter (and **sangh**, once that level exists)
- A third toggle: **Places** — derasars, upashrays, sthanaks, dharamshalas and bhojanshalas, each with address, map pin, timings and the trust's contact. Admin-maintained, static, and the first thing a family new to Indore looks for
- **Blood donors** — a "willing to donate" flag on the profile, so the blood-group filter can be narrowed to people who have said yes. Costs one checkbox; occasionally the most valuable screen in the app

### 💼 Business
- Unchanged. Same 35 categories (the list is open item #4 for *this* committee too), live counts, keyword search

### 📢 Feed
- **Announcements**, **Requirements**, **Circulars**, **Matrimonial** — as PMConnect
- **Events** replaces PMConnect's "Meetings" and widens to carry two kinds: samaj events with headcount RSVP (as before), and the **dharmik calendar** — the year's parv dates entered once by a samaj admin from a published Jain calendar (Drik Panchang publishes one per year; no automatic feed exists, and none is needed for ~20 dates a year)
- **Shok sandesh** — PMConnect handles condolence notices inside Announcements with comments locked. Keep that mechanism, but give it its own name in the compose form, because in a Marwadi samaj the *baithak* details are the notice, and members will look for the word

### 👤 Me
- Unchanged, plus the blood-donor flag

---

## 5. Look and feel — the saffron

You have tested **#FF6331** as the main colour. It should be the main colour — with one
rule about how it is used, found by measuring it rather than looking at it.

**Why it is right.** In Shwetambar Murtipujak practice *kesar* — saffron paste — is
what is applied to the Jina in daily puja. Saffron on this app is not decoration
borrowed from a flag; it is the colour of the samaj's own ritual. It is also warm
where PMConnect's sage is cool, so the two apps never look like the same product
re-skinned. One small note: #FF6331 is a coral-vermilion rather than the
flag-saffron (#FF9933) most swatch sites call "saffron" — and that is a point in its
favour. It stays in the kesar family while sidestepping the political reading that
flag-saffron carries in 2026.

**The rule.** Measured against white, #FF6331 gives **2.97 : 1** — below the
4.5 : 1 that body text needs and a hair below the 3 : 1 that even large text or icons
need. So: **white text on this saffron, and this saffron as text on cream, are both
out.** It is a plate, an accent and a mark, never a label. Where saffron has to carry
words, it darkens:

| Token | Value | Job |
|---|---|---|
| `kesar` | `#FF6331` | The brand colour. Plates, the active tab, the mark, celebration cards — with **ink** text on it (5.8 : 1) |
| `kesar-deep` | `#D73400` | Primary buttons with white labels, links, the colour of a word that is saffron (4.8 : 1 on cream) |
| `kesar-ink` | `#A12700` | Small informative text — "In 2 days" — where PMConnect uses its dark amber (7.1 : 1) |
| `kesar-pale` | `#FFE4DB` | Chips, soft plates, the birthday card |
| `cream` | `#FDF8F1` | The page. Warmer than PMConnect's, to sit with the saffron |

Dark mode flips the same way PMConnect's does; saffron on a warm near-black is the
better-looking of the two themes and worth a screenshot in the store listing.

**The samaj's logo carries the colour; the interface stays kesar.** The official mark
(`logo/samaj-logo.jpg`) is a lotus of rainbow petals around the swastik, with the
samaj's name in red Devanagari on a gold-ringed disc. It is already the whole
celebration of colour — so the five-stripe Jain flag rule proposed earlier is dropped
as redundant beside it, and the interface around the logo stays quiet and kesar-led
so the two never compete. The logo appears where identity matters: the sign-in page,
the welcome sheet, the Home header and the Me tab.

Two practical needs follow from the file as supplied:

- **A transparent version — done.** There is no vector original, so the JPEG was cut
  out (4 October 2026): `logo/samaj-logo-cutout.png` at 1239 px and
  `logo/samaj-logo-cutout-2x.png` upscaled to 2478 px. Only the white *around* the lotus
  is removed; the white disc inside it stays. Edges are soft with no white fringe, and
  it was checked on cream, on the dark theme and on kesar. The app will serve a WebP
  copy, as PMConnect does with its lockup.
- **A simplified mark for the app icon.** The ring of lettering is unreadable at the
  48–60 px an icon is shown at. The icon should be the lotus and swastik alone, no
  text. Whether the swastik goes on a store-facing icon is the committee's call: it
  is sacred and central to Jain identity, and store reviewers outside India may not
  read it that way.

**Type** carries over from PMConnect's design pass (Fraunces for names, Jakarta for
the interface, Inter for reading, Noto Sans Devanagari behind all three, so any Hindi
that members type renders properly). Noto Serif Devanagari waits for the Hindi phase.

**An app icon is required** before either store — both reject a website favicon. The
brief is above: lotus and swastik, no lettering, legible at 48 px.

---

## 6. Source data

**`BOOK 2 TAPPAN SIR.xlsx`** — a **sample list**, not the whole samaj (decided 4 October
2026). It seeds the app with real families so every screen has content and the
mobile gate has numbers to match. Everything else — the missing details, and the
families who aren't in it — comes in **through the app**: members complete their own
profiles, and admins add families. Its **MAIN SHEET** is what the importer reads;
the other five sheets (heads of family, married, unmarried, and two sheets of
envelope labels) are derived copies and are left alone.

| | |
|---|---|
| Households | **131** |
| People | **660** — joint families: sons, daughters-in-law, grandchildren, mothers, brothers |
| Layout | Head of family numbered in S.NO.; members below as I, II, III…; a blank row between families |
| With a mobile number | 497 — and 38 households share one number among several members, which the 10-digit gate already handles |
| Age | 592 have an age. **No dates of birth, no anniversaries** |
| Family number | Every name ends in a bracketed number — `(17)` — shared by the whole family and running up to 225. It looks like a register number from a larger master list; the importer keeps it as the family's permanent ID |

**Every field the app holds is now a column** (H–AE, 24 columns, rebuilt from the
untouched original on 4 October 2026; the sangh column added the day before was
removed). Header colours group them: **family** (area, city, pincode, gotra, native
place, maps link — once per family, on the head's row), **person** (gender, date of
birth, anniversary, blood group, blood donor, education, living in, deceased),
**contact** (WhatsApp if different, Gmail) and **work** (occupation, business name,
category, one-line description, search words, business address and phone, website).
Six have dropdowns, including PMConnect's 35 business categories. So a fuller list,
whenever one arrives, imports through the same door.

Gender was pre-filled from the relation column for 544 people. Cells needing a
second look are shaded yellow: **116 members with no relation** and **5 mobile
numbers that aren't 10 digits**. Every original cell was compared before and after:
none changed. The untouched original is kept beside it.

**Until dates of birth are entered, the Home screen's birthday list will be empty.**
That is the first thing to ask members for once they're in. Meanwhile the importer
stores each age as an approximate birth year, which PMConnect's data model already
supports.

The importer's known trap carries over: Excel dates shift back one day under
SheetJS's `cellDates`; read raw serials. See the PM Parivar `CLAUDE.md`.

---

## 7. What changes in the code

Short, because the inheritance is the point. In order of size:

1. **Search and loading at scale.** PMConnect's `getDb()` loads the whole directory
   in one pass — right for 451 people, wrong for 5,000. Directory and Business reads
   move to Postgres queries with pagination and `pg_trgm` for the spelling tolerance
   the in-memory search gives today. **This is the one piece of real engineering.**
2. **Admins add families in the app.** PMConnect can't: members add people to their own
   household, but nobody can create a household without the spreadsheet. Since the
   sheet is only a sample here, this is the main way the directory grows: an "Add a
   family" form in the admin panel, writing through the same change log so it can be
   undone.
3. **Joining** and **sanghs** — both deferred; see §3 #3 and #4. Nothing to build now.
4. **Places** and **events** tables; the parv entries are events with a `kind`.
5. **Gotra and native place** as dropdown tables rather than text columns.
6. **Joint families.** PMConnect's relationships are self / spouse / child / parent /
   other. This book needs son, daughter, daughter-in-law, grandson, granddaughter,
   mother, brother, sister, niece and the rest — and the spellings vary
   (`GRANDSON` / `GRAND SON` / `G. DAUGHTER`), so the importer normalises them.
   **Anniversary moves from the household to the couple**, because a joint family
   has more than one married pair. The family number from the brackets becomes a
   column on households.
7. **Tokens.** The `@theme` block gets the §5 palette. One file.
8. **Rename.** Product strings, the `pmp_` cookie prefix, the manifest, the lockup.

Everything else — auth, sessions, photos, the cropper, the feed, the admin log, the
screenshot and verification scripts — is reused.

---

## 8. Getting onto the app stores — read this before promising it

**Android is straightforward.** A Trusted Web Activity wraps the live PWA in a store
listing; Google supports and documents it. One `assetlinks.json` on the domain, the
₹2,100 Play Console fee, a listing with screenshots and a privacy-policy link. The app
in the store is the website, so every update ships the moment the site does.

**iPhone is not, and this is the honest part.** Apple's Guideline 4.2 rejects apps
that are "a repackaged website". A shell that simply loads the live site is exactly
what it describes, and the tool most people reach for (Capacitor's remote-URL mode)
is described by Capacitor's own team as for development, not production — a team
running this precise stack (Next.js App Router, Server Actions, Supabase) reports
30-second black screens on weak signal because nothing lives on the phone. The route
that passes review embeds the front-end in the app and adds what Safari can't do:
**push notifications** (the single most effective answer to 4.2, and genuinely
valuable here — Paryushan notices, a shok sandesh), **Face ID to open the app**, and
**offline access to the directory**.

That embedded front-end is a second way of loading every screen's data, not a
wrapper. Budget it as its own phase, roughly the size of the first build, and start
it only once the PWA has proven the samaj uses it. There are two things to know
going in:

- Apple's enrolment for an organisation needs a legal entity and a D-U-N-S number;
  the samaj trust should hold the account, not an individual.
- Apple waives its fee for nonprofits in 13 countries. **India is not one of them.**
  Plan on ₹8,300 a year.

**The pragmatic iPhone answer for phase 1** is the same one PMConnect uses: *Add to
Home Screen*. Since iOS 16.4 an installed web app can receive push notifications, so
the one native feature that matters most arrives without the App Store.

---

## 9. Build plan

| Phase | What happens | Who |
|---|---|---|
| 0 | Committee confirms §3 and the open items below; names the samaj admins | Committee |
| 1 | Copy the PM Parivar codebase; new Supabase and Vercel projects in the trust's name; §7 items 7–8 (tokens, rename) on day one so every screenshot from here is in the right colour | Claude |
| 2 | §7 items 1–2 and 4–6; import the Excel; verify the 10-digit gate with real people | Claude |
| 3 | Pilot with 30–50 of Book 2's families, including two or three elders | Committee |
| 4 | Fix what the pilot found; admins add families beyond Book 2; launch with one WhatsApp message | Committee + Claude |
| 5 | Web push for Paryushan and shok sandesh | Claude |
| 6 | Play Store and App Store — **OPEN**, decided after phase 4 on the strength of actual use; see §8 | Committee decides |

---

## 10. Open items for the committee

1. **Sanghs** — deferred (§3 #4). When the time comes: the list of sanghs, and whether the app is for one samaj or the Mahasangh with every sangh under it
2. **Admins** — Google addresses of the samaj admins
3. **Gotra and native-place lists** — a session with two or three elders would produce both in an hour
4. **Business categories** — approve or amend PMConnect's 35
5. **Legal entity and domain** — which trust holds the domain, the Supabase and Vercel accounts, and eventually the store accounts
6. **App icon** — whether the store-facing icon carries the swastik (§5). The cut-out logo is done
7. **Launch date** — a parv to aim for. The next natural one after a pilot is Diwali / Mahavir Nirvan, then Mahavir Jayanti in spring
8. **The full list** — Book 2 is a sample. If Book 1 or a master register exists, it imports through the same columns
