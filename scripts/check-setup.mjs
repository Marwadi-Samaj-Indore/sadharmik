// Checks that the Supabase connection is set up correctly, without ever
// printing a key. Run it with `npm run check:setup`.
//
// It reads .env.local, so whoever types the keys in never has to paste them
// anywhere else — not into a chat, not into a message. Output is PASS / FAIL
// with what to do next, and the values themselves never appear.
import { readFileSync, existsSync } from "node:fs";

const env = process.env;
let failed = 0, warned = 0;
const pass = (m) => console.log(`  PASS  ${m}`);
const fail = (m, fix) => { failed++; console.log(`  FAIL  ${m}\n        → ${fix}`); };
const warn = (m, fix) => { warned++; console.log(`  WARN  ${m}\n        → ${fix}`); };
const isNewSecret = (k) => k.startsWith("sb_secret_");
const looksLikeKey = (k, kind) =>
  kind === "public" ? k.startsWith("sb_publishable_") || k.startsWith("eyJ")
                    : isNewSecret(k) || k.startsWith("eyJ");

console.log("\nSadharmik — setup check\n");
console.log("1. The settings file");
if (!existsSync(".env.local")) { fail(".env.local not found", "copy .env.local.example to .env.local (SETUP.md step 5)"); process.exit(1); }

const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const anon = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const svc = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const code = env.ADMIN_ACCESS_CODE ?? "";
const secret = env.SESSION_SECRET ?? "";

if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is empty", "Supabase → Project Settings → Data API → Project URL");
else if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url) && !/^http:\/\/(127\.0\.0\.1|localhost)/.test(url))
  fail("NEXT_PUBLIC_SUPABASE_URL doesn't look like a project URL", "it should look like https://xxxxxxxxxxxxxxxxxxxx.supabase.co — nothing after .supabase.co");
else pass("project URL looks right");

if (!anon) fail("NEXT_PUBLIC_SUPABASE_ANON_KEY is empty", "Supabase → API Keys → the PUBLISHABLE key (sb_publishable_…)");
else if (isNewSecret(anon)) fail("the public-key line holds a SECRET key", "swap it: that line takes the publishable key, never the secret one");
else if (!looksLikeKey(anon, "public")) fail("the public key doesn't look like a Supabase key", "it should start with sb_publishable_");
else pass("public key present and of the right kind");

if (!svc) fail("SUPABASE_SERVICE_ROLE_KEY is empty", "Supabase → API Keys → the SECRET key (sb_secret_…)");
else if (svc.startsWith("sb_publishable_")) fail("the secret-key line holds the PUBLISHABLE key", "swap it: that line takes the secret key");
else if (!looksLikeKey(svc, "secret")) fail("the secret key doesn't look like a Supabase key", "it should start with sb_secret_");
else if (svc === anon) fail("the public and secret keys are the same value", "they must be two different keys");
else pass("secret key present and of the right kind");

if (!code) fail("ADMIN_ACCESS_CODE is empty", "choose a long committee sign-in code and type it after the = sign");
else if (code.length < 12) warn("ADMIN_ACCESS_CODE is short", "12+ characters is safer; it opens the admin panel");
else pass("committee sign-in code set");
const rawCodeLine = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith("ADMIN_ACCESS_CODE=")) ?? "";
if (/#/.test(rawCodeLine.slice(18)) && !/^["'].*["']$/.test(rawCodeLine.slice(18).trim()))
  warn("ADMIN_ACCESS_CODE contains a # but isn't in quotes", "everything after the # is silently dropped — wrap the whole code in \"double quotes\"");
if (!secret) warn("SESSION_SECRET is empty", "optional; without it the secret key signs the cookies instead");
else pass("session secret set");

if (!url || !svc || !anon || failed) { console.log(`\n${failed} problem(s) above. Fix those, then run this again.\n`); process.exit(1); }

console.log("\n2. Talking to Supabase");
const headers = (key) => ({ apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}) });
const get = async (path, key) => {
  try { const r = await fetch(url + path, { headers: headers(key) }); return { status: r.status, body: await r.json().catch(() => null) }; }
  catch (e) { return { status: 0, body: { message: String(e.cause?.code ?? e.message) } }; }
};

const r1 = await get("/rest/v1/admins?select=email", svc);
if (r1.status === 0) fail("could not reach the project", `network said "${r1.body.message}" — check the URL, and that the project isn't paused`);
else if (r1.status === 401 || (r1.body?.message ?? "").toLowerCase().includes("invalid api key")) fail("Supabase rejected the secret key", "re-copy it from API Keys — a stray space or a cut-off end is the usual cause");
else if (r1.body?.code === "42501") fail("the server's key is not allowed to read the tables", "the grants are missing — run supabase/setup-all.sql in the SQL Editor (it includes them)");
else if (r1.body?.code === "PGRST205" || r1.status === 404) fail("the tables don't exist yet", "paste supabase/setup-all.sql into Supabase → SQL Editor and press Run");
else if (r1.status !== 200) fail(`unexpected answer (${r1.status}): ${r1.body?.message ?? "no message"}`, "send me this line");
else {
  pass(`secret key works; the admins table is readable (${r1.body.length} admin${r1.body.length === 1 ? "" : "s"})`);
  for (const a of r1.body) console.log(`          · ${a.email}`);
}

const r2 = await get("/rest/v1/admins?select=email", anon);
if (r2.status === 200 && Array.isArray(r2.body) && r2.body.length > 0) fail("THE PUBLIC KEY CAN READ MEMBER DATA", "stop and tell me — the tables are not locked");
else if (r2.status === 0) warn("skipped the public-key lock test", "network problem");
else pass(`public key is locked out, as it must be (answer ${r2.status})`);

const r3 = await get("/storage/v1/bucket/member-photos", svc);
if (r3.status === 200 && r3.body?.public === false) pass("private photo bucket exists");
else if (r3.status === 200) fail("photo bucket exists but is PUBLIC", "set it to private in Supabase → Storage");
else fail("photo bucket not found", "run supabase/setup-all.sql — it creates it");

console.log(failed ? `\n${failed} problem(s). Fix them and run this again.\n` : `\nAll good${warned ? ` (${warned} warning${warned === 1 ? "" : "s"})` : ""}. The database is ready for the app.\n`);
process.exit(failed ? 1 : 0);
