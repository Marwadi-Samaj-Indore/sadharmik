/**
 * Proves the Google → mobile-gate → linked-profile flow end to end.
 *
 * The interesting claim is that the address Google proved actually lands on
 * the member's row, because that is what lets every later visit skip the gate.
 * Google's own consent screen can't be driven from a script, so this starts
 * one step later: it plants the signed cookie the callback route would have
 * set, then drives the real gate in a real browser and reads the database back.
 *
 * Restores the row it touched, so it is safe to re-run against live data.
 */
import { chromium } from "playwright";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.BASE_URL ?? "http://localhost:3310";
const TEST_EMAIL = "pmconnect-linktest@example.com";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const secret = env.SESSION_SECRET || env.SUPABASE_SERVICE_ROLE_KEY;
const sign = (v) =>
  `${v}.${createHmac("sha256", secret).update(v).digest("base64url").slice(0, 32)}`;

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let passed = 0;
let failed = 0;
const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  ok ? passed++ : failed++;
};

const dismissWelcome = async (page) => {
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();
};

async function run() {
  const { data: person } = await db
    .from("people")
    .select("id,first_name,last_name,mobile,claimed_by_email")
    .eq("id", process.env.TEST_PERSON_ID ?? "p327")
    .single();

  if (!person) throw new Error("test person not found");
  const original = person.claimed_by_email;
  console.log(
    `\nusing ${person.first_name} ${person.last_name} (${person.id}), ` +
      `claimed_by_email currently ${original ?? "null"}\n`
  );

  // The flow only writes an address onto an unclaimed row, by design
  if (original) {
    await db.from("people").update({ claimed_by_email: null }).eq("id", person.id);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

  // What the callback route sets once Google has proved the address
  const payload = `${TEST_EMAIL}|${Date.now() + 15 * 60 * 1000}`;
  await context.addCookies([
    {
      name: "sdm_google",
      value: sign(payload),
      url: BASE,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  try {
    await page.goto(`${BASE}/verify`, { waitUntil: "domcontentloaded" });
    check(
      "gate reached with a proved address",
      page.url().includes("/verify"),
      page.url()
    );
    check(
      "gate names the Google account",
      await page.getByText(TEST_EMAIL).isVisible().catch(() => false)
    );

    await page.fill("input[name=mobile]", person.mobile);
    await page.click("button[type=submit]");
    await page.waitForTimeout(2500);

    // The gate refuses for real reasons too (rate limit, unknown number); say
    // which one rather than letting it surface as an opaque navigation timeout
    const gateError = await page
      .getByRole("alert")
      .innerText()
      .catch(() => null);
    check("mobile accepted by the gate", !gateError, gateError ?? "");

    // A shared number asks which member; a sole number signs straight in.
    // Anchored to the start of the button, because the household name below
    // the member's own name repeats it ("Sunil Shrimal / Sunil & Zhalak…").
    const picker = page
      .locator("button")
      .filter({ hasText: new RegExp(`^${person.first_name} ${person.last_name}`) });
    if (await picker.first().isVisible({ timeout: 4000 }).catch(() => false)) {
      await picker.first().click();
    }

    await page.waitForURL((u) => !u.pathname.startsWith("/verify"), { timeout: 15000 });
    await dismissWelcome(page);
    check("signed in and left the gate", !page.url().includes("/verify"), page.url());

    const { data: after } = await db
      .from("people")
      .select("claimed_by_email")
      .eq("id", person.id)
      .single();

    check(
      "proved address written to the member's row",
      after?.claimed_by_email === TEST_EMAIL,
      `got ${after?.claimed_by_email ?? "null"}`
    );

    // Second visit: the callback route would now find this row by email, so
    // the gate must never be shown again. Prove the lookup it will do.
    const { data: lookup } = await db
      .from("people")
      .select("id")
      .ilike("claimed_by_email", TEST_EMAIL)
      .single();
    check("returning member is findable by email alone", lookup?.id === person.id);

    // The one-time cookie must not survive its use
    const left = (await context.cookies()).find((c) => c.name === "sdm_google");
    check("one-time Google cookie cleared after linking", !left || left.value === "");
  } finally {
    await browser.close();
    await db
      .from("people")
      .update({ claimed_by_email: original })
      .eq("id", person.id);
    console.log(`\nrestored claimed_by_email to ${original ?? "null"}`);
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
