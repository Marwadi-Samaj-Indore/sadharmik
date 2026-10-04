# Marwadi Samaj Indore

The private member directory of **Shri Jain Shwetambar (Murtipujak) Marwadi Samaj,
Indore**. Find any member, see what they do for a living, and reach them in
one tap.

It's a **PWA** — one web app that installs to the home screen on iPhone and Android —
built on the same code as the PM Parivar app (PMConnect), with the samaj's own logo and
a saffron look.

The app was first called *Sadharmik*; that name survives only in the plumbing — the
GitHub repository, the Vercel project and the `sadharmik.vercel.app` address.

| | |
|---|---|
| [SPEC.md](SPEC.md) | What the app does and the decisions behind it |
| [SETUP.md](SETUP.md) | The accounts to create, in order |
| [docs/palette-sample.html](docs/palette-sample.html) | The saffron colour scheme, with every colour measured |
| [logo/](logo/) | The samaj's logo and its transparent cut-out |

## Where things stand

- **Done:** the code is copied from PMConnect and renamed, the saffron colours are in,
  and the logo and icons are made from the samaj's own artwork.
- **Next:** the Supabase database (SETUP.md step 2), then reading the member list from
  `BOOK 2 TAPPAN SIR.xlsx` into it.
- **Then:** Google sign-in, Vercel hosting, and a pilot with a few families.

## Running it on your own machine

Once Supabase exists: copy `.env.local.example` to `.env.local` and fill it in (the file
explains each line), then in a terminal inside this folder:

```bash
npm install
```

```bash
npm run dev
```

Then open **http://localhost:3310**. Until the database is set up, the app starts but
shows an error page instead of screens — that is expected.

## Keeping member details private

The spreadsheet never leaves this laptop: every Excel file is blocked from uploading.
Nothing in the app is public — every page needs sign-in, and search engines are
blocked. Photos are served only to signed-in members.
