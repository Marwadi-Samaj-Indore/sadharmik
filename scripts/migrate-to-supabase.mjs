/**
 * Pushes .data/db.json into the Supabase Postgres database.
 *
 * Safe to run repeatedly — every table is upserted on its primary key, so a
 * second run updates rather than duplicating. Reads credentials from
 * .env.local; nothing is ever printed except row counts.
 *
 * Run: npm run migrate
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run this with:  npm run migrate"
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const db = JSON.parse(readFileSync(resolve(ROOT, ".data", "db.json"), "utf8"));

const blank = (v) => (v === undefined || v === "" ? null : v);

/** Inserts in chunks so no single request gets too large. */
async function upsert(table, rows, conflict = "id") {
  if (rows.length === 0) {
    console.log(`  ${table.padEnd(12)} nothing to send`);
    return;
  }
  const size = 200;
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflict });
    if (error) {
      console.error(`\nFAILED on ${table} (rows ${i}-${i + batch.length - 1}):`);
      console.error(error.message);
      if (error.details) console.error(error.details);
      process.exit(1);
    }
  }
  console.log(`  ${table.padEnd(12)} ${rows.length} rows sent`);
}

/* ------------------------------------------------------------------ mapping */

const households = db.households.map((h) => ({
  id: h.id,
  family_name: h.familyName,
  surname: h.surname ?? "",
  gotra: h.gotra ?? "",
  native_place: h.nativePlace ?? "",
  address: h.address ?? "",
  area: h.area ?? "",
  city: h.city || "Indore",
  pincode: h.pincode ?? "",
  maps_url: h.mapsUrl ?? "",
  photo: blank(h.photo),
  anniversary: blank(h.anniversary),
  head_person_id: blank(h.headPersonId),
  source_row: h.sourceRow ?? null,
}));

const people = db.people.map((p) => ({
  id: p.id,
  household_id: p.householdId,
  first_name: p.firstName ?? "",
  middle_name: p.middleName ?? "",
  last_name: p.lastName ?? "",
  relationship: p.relationship ?? "other",
  gender: p.gender ?? "",
  photo: blank(p.photo),
  mobile: blank(p.mobile),
  whatsapp: blank(p.whatsapp),
  email: p.email ?? "",
  dob: blank(p.dob),
  blood_group: p.bloodGroup ?? "",
  marital_status: p.maritalStatus ?? "",
  living_in: p.livingIn ?? "",
  education: p.education ?? "",
  occupation_type: p.occupationType ?? "",
  business: p.business ?? {},
  privacy: p.privacy ?? {},
  deceased: Boolean(p.deceased),
  claimed_by_email: blank(p.claimedByEmail),
  age: p.age ?? null,
  birth_year: p.birthYear ?? null,
}));

// Announcements and requirements live in one table, separated by `type`
const posts = [...db.announcements, ...db.requirements].map((p) => ({
  id: p.id,
  type: p.type,
  author_person_id: blank(p.authorPersonId),
  author_name: p.authorName ?? "",
  author_email: blank(p.authorEmail),
  title: p.title,
  body: p.body ?? "",
  category: p.category ?? "",
  area: p.area ?? "",
  photo: blank(p.photo),
  pinned: Boolean(p.pinned),
  comments_locked: Boolean(p.commentsLocked),
  is_demo: Boolean(p.isDemo),
  created_at: p.createdAt,
  expires_at: blank(p.expiresAt),
}));

const comments = db.comments.map((c) => ({
  id: c.id,
  post_id: c.postId,
  author_person_id: blank(c.authorPersonId),
  author_name: c.authorName ?? "",
  author_email: blank(c.authorEmail),
  body: c.body,
  created_at: c.createdAt,
}));

const issues = db.issues.map((i) => ({
  id: i.id,
  household_id: blank(i.householdId),
  person_id: blank(i.personId),
  field: i.field ?? "",
  kind: i.kind ?? "",
  message: i.message ?? "",
  raw: i.raw ?? "",
  resolved: Boolean(i.resolved),
}));

const changeLog = db.changeLog.map((c) => ({
  id: c.id,
  at: c.at,
  by_email: blank(c.byEmail),
  by_name: c.byName ?? "",
  action: c.action ?? "",
  target: c.target ?? "",
  before: c.before ?? null,
  after: c.after ?? null,
  undone: Boolean(c.undone),
}));

const admins = db.admins.map((email) => ({ email }));

/* ------------------------------------------------------------------ migrate */

console.log(`\nMigrating to ${new URL(url).host}\n`);

// Order matters: households before people, posts before comments
await upsert("admins", admins, "email");
await upsert("households", households);
await upsert("people", people);
await upsert("posts", posts);
await upsert("comments", comments);
await upsert("issues", issues);
await upsert("change_log", changeLog);

/* ------------------------------------------------------------------- verify */

console.log("\nVerifying what actually landed in Postgres:\n");

const expected = {
  admins: admins.length,
  households: households.length,
  people: people.length,
  posts: posts.length,
  comments: comments.length,
  issues: issues.length,
  change_log: changeLog.length,
};

let ok = true;
for (const [table, want] of Object.entries(expected)) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  const good = !error && count === want;
  if (!good) ok = false;
  console.log(
    `  ${good ? "ok  " : "FAIL"}  ${table.padEnd(12)} ${count ?? "?"} in database / ${want} expected` +
      (error ? `  (${error.message})` : "")
  );
}

// Spot-check a couple of records that exercised the trickiest parsing
const { data: sample } = await supabase
  .from("people")
  .select("first_name, last_name, dob, mobile")
  .in("id", ["p4", "p6"]);

console.log("\n  Spot check:");
for (const row of sample ?? []) {
  console.log(
    `    ${row.first_name} ${row.last_name} — dob ${row.dob} — mobile ${row.mobile ? "present" : "none"}`
  );
}

console.log(ok ? "\nMigration complete.\n" : "\nMIGRATION INCOMPLETE — see failures above.\n");
process.exit(ok ? 0 : 1);
