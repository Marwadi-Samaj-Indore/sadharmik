/**
 * Fails if any page under app/(main) doesn't call requireMember() — the
 * sign-in gate (lib/guard.ts). A page without it can be rendered for a
 * visitor with no session by a crafted request that skips the layout.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const missing = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name === "page.tsx" && !/await requireMember\(\)/.test(readFileSync(path, "utf8")))
      missing.push(path);
  }
};
walk("app/(main)");

if (missing.length) {
  console.error(`Pages without the sign-in gate (add \`await requireMember();\`):\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
console.log("Sign-in gate present on every (main) page.");
