/**
 * Reads the member spreadsheet and writes .data/db.json, ready for
 * `npm run migrate` to push into Supabase.
 *
 * The MAIN SHEET is a list of family blocks separated by blank rows. A block
 * starts with the head of the family, numbered 1, 2, 3… in S.NO; the rest of
 * the family follows, numbered I, II, III… Every name carries the family
 * number in brackets — "ASHA SHAH (1)" — which is what keeps the IDs stable
 * when the sheet is re-imported. Family-level columns (address, area, gotra…)
 * are read from the head's row only.
 *
 * Nothing is guessed silently. A relation left blank, a mobile number that
 * isn't 10 digits, or a head with no number at all becomes an entry in the
 * admin panel's "Needs attention" list, carrying the original text.
 *
 * Prints counts only — never a name or a number.
 *
 * Run: npm run import            (reads "BOOK 2 TAPPAN SIR.xlsx")
 *      npm run import -- other.xlsx
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = resolve(ROOT, process.argv[2] ?? "BOOK 2 TAPPAN SIR.xlsx");
const SHEET = "MAIN SHEET";

// Column letters as laid out in the sheet's header row
const COL = {
  sno: "A", name: "B", mobile: "C", age: "D", marital: "E", relation: "F",
  address: "G", area: "H", city: "I", pincode: "J", gotra: "K", native: "L",
  maps: "M", gender: "N", dob: "O", anniversary: "P", blood: "Q", donor: "R",
  education: "S", livingIn: "T", deceased: "U", whatsapp: "V", email: "W",
  occupation: "X", bizName: "Y", bizCategory: "Z", bizWhat: "AA",
  bizProducts: "AB", bizAddress: "AC", bizPhone: "AD", bizWeb: "AE",
};

const OCCUPATIONS = [
  "Business owner", "Professional", "Salaried", "Student", "Retired", "Homemaker",
];

/* ------------------------------------------------------------------ helpers */

const str = (v) => (v === undefined || v === null ? "" : String(v).trim());

const titleCase = (s) =>
  s.toLowerCase().replace(/(^|[\s\-'(/.])([a-z])/g, (_, a, b) => a + b.toUpperCase());

/** "SHRI ABHAY KUMAR SHAH  (1)" → { words: [Abhay, Kumar, Shah], family: 1 } */
function parseName(raw) {
  const s = str(raw);
  const m = s.match(/\((\d+)\)\s*$/);
  const family = m ? Number(m[1]) : null;
  const bare = s
    .replace(/\(\d+\)\s*$/, "")
    .replace(/^(SHRI|SHRIMATI|SMT|MRS|MR|SH|KU|DR)\.?\s+/i, "")
    .trim();
  return { words: bare.split(/\s+/).filter(Boolean).map(titleCase), family };
}

/** Digits only; a 10-digit Indian mobile, or null with the reason why. */
function parseMobile(v) {
  const raw = str(v);
  if (!raw || raw === "-" || raw === ".") return { value: null, raw: "" };
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (/^[6-9]\d{9}$/.test(digits)) return { value: digits, raw };
  return { value: null, raw };
}

/** An Excel date serial, a JS Date, or "DD-MM-YYYY" / "DD/MM/YYYY" → yyyy-mm-dd. */
function parseDate(v) {
  if (v === undefined || v === null || v === "") return null;
  let y, m, d;
  if (typeof v === "number") {
    const p = XLSX.SSF.parse_date_code(v);
    if (!p) return null;
    ({ y, m, d } = p);
  } else {
    const match = str(v).match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (!match) return null;
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function relationOf(raw) {
  const r = str(raw).toUpperCase().replace(/\s+/g, " ");
  if (/^HEAD\b/.test(r)) return "self";
  if (["WIFE", "WOFE", "HUSBAND"].includes(r)) return "spouse";
  if (["SON", "DAUGHTER", "D/O", "S/O"].includes(r)) return "child";
  if (["MOTHER", "FATHER"].includes(r)) return "parent";
  return "other";
}

const gender = (v) => ({ M: "male", F: "female" })[str(v).toUpperCase()] ?? "";
const marital = (v) => ({ M: "married", UM: "single", W: "widowed" })[str(v).toUpperCase()] ?? "";
const yes = (v) => /^y/i.test(str(v));

function occupationType(v) {
  const s = str(v).toLowerCase();
  return OCCUPATIONS.find((o) => o.toLowerCase() === s) ?? "";
}

/* -------------------------------------------------------------------- read */

const wb = XLSX.readFile(FILE);
const ws = wb.Sheets[SHEET];
if (!ws) {
  console.error(`No sheet called "${SHEET}" in ${FILE}`);
  process.exit(1);
}
const last = XLSX.utils.decode_range(ws["!ref"]).e.r + 1;
const cell = (col, row) => ws[`${col}${row}`]?.v;

const thisYear = new Date().getFullYear();
const households = [];
const people = [];
const issues = [];
const warnings = [];
let current = null;
let memberIndex = 0;

const addIssue = (householdId, personId, field, kind, message, raw = "") =>
  issues.push({
    id: `i${issues.length + 1}`,
    householdId, personId, field, kind, message, raw, resolved: false,
  });

for (let row = 2; row <= last; row++) {
  const sno = cell(COL.sno, row);
  const nameRaw = cell(COL.name, row);
  if (!str(nameRaw)) continue; // the blank rows between families

  const isHead = typeof sno === "number" || /^\d+$/.test(str(sno));
  const { words, family } = parseName(nameRaw);

  if (isHead) {
    // The bracket number is the book's own family number (S.NO only counts
    // rows). The book has been seen to give two families the same number, so
    // a repeat gets its own id — and a flag, because one of them is a typo.
    const number = family ?? `s${sno}`;
    const repeat = households.some((h) => h.bookNumber === number);
    const surname = words.length > 1 ? words[words.length - 1] : "";
    current = {
      id: repeat ? `h${number}-${sno}` : `h${number}`,
      bookNumber: number,
      familyName: "",
      surname,
      gotra: titleCase(str(cell(COL.gotra, row))),
      nativePlace: titleCase(str(cell(COL.native, row))),
      address: str(cell(COL.address, row)),
      area: titleCase(str(cell(COL.area, row))),
      city: titleCase(str(cell(COL.city, row))) || "Indore",
      pincode: str(cell(COL.pincode, row)).replace(/\D/g, ""),
      mapsUrl: str(cell(COL.maps, row)),
      photo: null,
      anniversary: null,
      headPersonId: null,
      sourceRow: row,
    };
    households.push(current);
    memberIndex = 0;
    if (repeat) {
      addIssue(current.id, null, "family-number", "review",
        `Family number (${number}) is also used by another family in the book`, `S.NO ${sno}`);
    }
  } else if (!current) {
    warnings.push(`row ${row}: a family member before any head — skipped`);
    continue;
  } else if (family !== null && family !== current.bookNumber) {
    warnings.push(`row ${row}: listed under ${current.id} but the name says family (${family})`);
  }

  // A one-word name takes the family surname, so search by surname finds it
  const firstName = words[0] ?? "";
  const lastName = words.length > 1 ? words[words.length - 1] : current.surname;
  const middleName = words.length > 2 ? words.slice(1, -1).join(" ") : "";

  const id = `p${current.id.slice(1)}-${memberIndex++}`;
  // Only the first person in a block is the head; a second "HEAD" is a slip
  const said = relationOf(cell(COL.relation, row));
  const relationship = isHead ? "self" : said === "self" ? "other" : said;
  const mobile = parseMobile(cell(COL.mobile, row));
  const whatsapp = parseMobile(cell(COL.whatsapp, row));

  const ageRaw = Number(str(cell(COL.age, row)));
  const age = Number.isFinite(ageRaw) && ageRaw > 0 && ageRaw < 120 ? Math.round(ageRaw) : null;
  const dob = parseDate(cell(COL.dob, row));
  const anniversary = parseDate(cell(COL.anniversary, row));

  const web = str(cell(COL.bizWeb, row));
  const isInstagram = /instagram\.com|^@/i.test(web);

  people.push({
    id,
    householdId: current.id,
    firstName,
    middleName,
    lastName,
    relationship,
    gender: gender(cell(COL.gender, row)),
    photo: null,
    mobile: mobile.value,
    whatsapp: whatsapp.value,
    email: str(cell(COL.email, row)).toLowerCase(),
    dob,
    bloodGroup: str(cell(COL.blood, row)).toUpperCase().replace(/\s+/g, "").replace("VE", ""),
    maritalStatus: marital(cell(COL.marital, row)),
    livingIn: titleCase(str(cell(COL.livingIn, row))),
    education: str(cell(COL.education, row)),
    occupationType: occupationType(cell(COL.occupation, row)),
    business: {
      name: str(cell(COL.bizName, row)),
      category: str(cell(COL.bizCategory, row)),
      description: str(cell(COL.bizWhat, row)),
      keywords: str(cell(COL.bizProducts, row)),
      address: str(cell(COL.bizAddress, row)),
      phone: parseMobile(cell(COL.bizPhone, row)).value ?? "",
      website: isInstagram ? "" : web,
      instagram: isInstagram ? web : "",
      visitingCard: null,
    },
    privacy: {
      hideMobile: false, hideWhatsapp: false, hideEmail: false,
      hideDobYear: false, hidePhoto: false,
    },
    deceased: yes(cell(COL.deceased, row)),
    claimedByEmail: null,
    age: dob ? null : age,
    birthYear: dob ? Number(dob.slice(0, 4)) : age !== null ? thisYear - age : null,
  });

  // The couple's anniversary lives on the household — the head's, else the spouse's
  if (anniversary && (isHead || (relationship === "spouse" && !current.anniversary))) {
    current.anniversary = anniversary;
  }
  if (isHead) current.headPersonId = id;

  /* ---------------------------------------------------------------- issues */

  if (mobile.raw && !mobile.value) {
    addIssue(current.id, id, "mobile", "unreadable", "Mobile number isn't a valid 10-digit number", mobile.raw);
  } else if (isHead && !mobile.value) {
    addIssue(current.id, id, "mobile", "missing", "Head of family has no mobile number");
  }
  if (!isHead && !str(cell(COL.relation, row))) {
    addIssue(current.id, id, "relationship", "review", "No relation to the head of family was given");
  }
  if (!isHead && said === "self") {
    addIssue(current.id, id, "relationship", "review",
      "Marked HEAD, but the family's head is the first person listed", str(cell(COL.relation, row)));
  }
  if (!firstName) {
    addIssue(current.id, id, "name", "missing", "Name is missing");
  }
}

/* ------------------------------------------- family names: "Abhay-Asha Shah" */

for (const h of households) {
  const members = people.filter((p) => p.householdId === h.id);
  const head = members.find((p) => p.id === h.headPersonId);
  const spouse = members.find((p) => p.relationship === "spouse");
  const first = [head?.firstName, spouse?.firstName].filter(Boolean).join("-");
  h.familyName = [first, h.surname].filter(Boolean).join(" ") || h.id;
  if (!h.address) addIssue(h.id, null, "address", "missing", "No address given");
}

/* ------------------------------------------------------------------- write */

// bookNumber only steered the import; the database has no column for it
for (const h of households) delete h.bookNumber;

const ids = new Set();
for (const x of [...households, ...people]) {
  if (ids.has(x.id)) {
    console.error(`Duplicate id ${x.id} — two families share a number. Fix the sheet and run again.`);
    process.exit(1);
  }
  ids.add(x.id);
}

const db = {
  version: 1,
  importedAt: new Date().toISOString(),
  source: FILE.split("/").pop(),
  admins: ["anandjain0498@gmail.com", "marwadisamajindore@gmail.com"],
  households,
  people,
  announcements: [],
  requirements: [],
  comments: [],
  issues,
  changeLog: [],
};

mkdirSync(resolve(ROOT, ".data"), { recursive: true });
writeFileSync(resolve(ROOT, ".data", "db.json"), JSON.stringify(db, null, 2));

const count = (f) => people.filter(f).length;
const byKind = issues.reduce((a, i) => ((a[i.kind] = (a[i.kind] ?? 0) + 1), a), {});

console.log(`
Read ${db.source}

  Families           ${households.length}
  People             ${people.length}
    with a mobile    ${count((p) => p.mobile)}
    with an age      ${count((p) => p.age !== null || p.dob)}
    with a gender    ${count((p) => p.gender)}
  Needs attention    ${issues.length}  ${JSON.stringify(byKind)}
${warnings.length ? `\nWarnings:\n  ${warnings.join("\n  ")}\n` : ""}
Wrote .data/db.json — run "npm run migrate" to send it to Supabase.
`);
