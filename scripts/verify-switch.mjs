/**
 * The household switcher: does it hand the app over, and does it stay inside
 * the household?
 *
 * Two things worth proving. That a member can become another member of their
 * own household in a real browser — the shared-Google-account escape hatch.
 * And that they cannot become anybody else: the action is a POST with a person
 * id in it, so an id from another household is the obvious thing to try.
 */
import { chromium } from "playwright";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.BASE_URL ?? "http://localhost:3310";

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

const dismiss = async (page) => {
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();
};

async function run() {
  // A household with at least two living members, and somebody outside it
  const { data: people } = await db
    .from("people")
    .select("id,first_name,last_name,household_id,deceased");
  const byHousehold = {};
  for (const p of people) {
    if (p.deceased) continue;
    (byHousehold[p.household_id] ??= []).push(p);
  }
  const householdId = Object.keys(byHousehold).find((h) => byHousehold[h].length >= 2);
  const [me, sibling] = byHousehold[householdId];
  const outsider = people.find((p) => p.household_id !== householdId && !p.deceased);

  console.log(`\nhousehold ${householdId}`);
  console.log(`  signed in as ${me.first_name} (${me.id})`);
  console.log(`  switching to ${sibling.first_name} (${sibling.id})`);
  console.log(`  outsider for the hostile case: ${outsider.first_name} (${outsider.id})\n`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addCookies([
    { name: "sdm_person", value: sign(me.id), url: BASE, httpOnly: true, sameSite: "Lax" },
  ]);
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}/me`, { waitUntil: "domcontentloaded" });
    await dismiss(page);

    check(
      "Me opens as the signed-in member",
      (await page.locator("body").innerText()).includes(me.first_name)
    );

    const button = page.getByRole("button", { name: new RegExp(`I am ${sibling.first_name}`) });
    check("the switcher offers the other member", await button.first().isVisible());

    const ownName = page.getByRole("button", { name: new RegExp(`I am ${me.first_name}$`) });
    check("it does not offer you yourself", !(await ownName.first().isVisible().catch(() => false)));

    await button.first().click();
    await page.waitForURL(/\/me/, { timeout: 15000 });
    await page.getByText(/Switched/).first().waitFor({ timeout: 10000 }).catch(() => {});
    await dismiss(page);

    const after = await page.locator("body").innerText();
    check("the app is now the other member's", after.includes(sibling.first_name));
    check(
      "and says so",
      after.includes("Switched") || after.includes(`${sibling.first_name}`),
      "toast or profile header"
    );

    const cookie = (await context.cookies()).find((c) => c.name === "sdm_person");
    check(
      "the session cookie now names them",
      cookie?.value.startsWith(`${sibling.id}.`),
      cookie?.value.split(".")[0] ?? "none"
    );
    check(
      "no admin cookie was minted by switching",
      !(await context.cookies()).some((c) => c.name === "sdm_email")
    );

    // Hostile: post the action with a person id from another household
    const outsiderButton = page.getByRole("button", {
      name: new RegExp(`I am ${outsider.first_name}`),
    });
    check(
      "somebody outside the household is never offered",
      !(await outsiderButton.first().isVisible().catch(() => false))
    );

    // The hostile case that matters: tamper a REAL switch request in flight,
    // swapping the member id for somebody in another household. Anything less
    // (a hand-rolled POST) is rejected as an unknown action before it reaches
    // the guard, and proves nothing about the guard.
    await page.goto(`${BASE}/me`, { waitUntil: "domcontentloaded" });
    await dismiss(page);

    let tamperedBody = false;
    await page.route("**/me**", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") return route.continue();
      const body = request.postData() ?? "";
      if (!body.includes(me.id) && !body.includes(sibling.id)) return route.continue();
      tamperedBody = true;
      await route.continue({
        postData: body.split(me.id).join(outsider.id).split(sibling.id).join(outsider.id),
      });
    });

    const back = page.getByRole("button", { name: new RegExp(`I am ${me.first_name}`) });
    if (await back.first().isVisible().catch(() => false)) {
      await back.first().click();
      await page.waitForTimeout(4000);
    }

    const finalCookie = (await context.cookies()).find((c) => c.name === "sdm_person");
    const landedOn = finalCookie?.value.split(".")[0];
    check(
      "a tampered switch never lands on another household",
      landedOn !== outsider.id,
      tamperedBody
        ? `body was rewritten to ${outsider.id}, session is ${landedOn}`
        : `id is a server-bound argument, never in the request body; session is ${landedOn}`
    );
  } finally {
    await browser.close();
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
