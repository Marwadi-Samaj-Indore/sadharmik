/**
 * Reads a member spreadsheet and writes .data/db.json, ready for
 * `npm run migrate` to push into Supabase.
 *
 * Two layouts are understood, told apart by the sheet names:
 *
 * ENTRY — "Member Entry Sheet.xlsx", typed straight from the samaj's paper
 *   directory form. One row per person, the form's circled number in FORM NO.
 *   on every row, SR. 1 the head. Family details from the top of the form sit
 *   on the head's row only. Columns are found by their heading, not their
 *   position, so a column moved by hand doesn't shift every field along.
 *
 * MAIN SHEET — Book 2, the original sample list: family blocks separated by
 *   blank rows, the head numbered 1, 2, 3… in S.NO and the rest I, II, III…,
 *   with the book's family number in brackets on every name — "ASHA SHAH (1)".
 *
 * Either way the family number becomes the household's permanent id (h17),
 * and each person's place in the family becomes theirs (p17-0 is the head), so
 * a form typed again lands on the same records instead of duplicating them.
 *
 * Nothing is guessed silently. A relation left blank, a mobile number that
 * isn't 10 digits, a head with no number, a member count that doesn't match the
 * rows typed, or a note from whoever typed the form becomes an entry in the
 * admin panel's "Needs attention" list, carrying the original text.
 *
 * Prints counts only — never a name or a number.
 *
 * Run: npm run import                              (Book 2)
 *      npm run import -- "Member Entry Sheet.xlsx"
 *      npm run import -- "Member Entry Sheet.xlsx" --dry-run   (check only)
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FILE = resolve(ROOT, args.find((a) => !a.startsWith("--")) ?? "BOOK 2 TAPPAN SIR.xlsx");

const OCCUPATIONS = [
  "Business owner", "Professional", "Salaried", "Student", "Retired", "Homemaker",
];

/* ------------------------------------------------------------------ helpers */

const str = (v) => (v === undefined || v === null ? "" : String(v).trim());

const titleCase = (s) =>
  s.toLowerCase().replace(/(^|[\s\-'(/.])([a-z])/g, (_, a, b) => a + b.toUpperCase());

/** The entry sheet's dropdowns read "Wife (पत्नी)"; only the English counts. */
const english = (v) => str(v).replace(/\s*\(.*\)\s*$/, "").trim();

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
  const r = english(raw).toUpperCase().replace(/\s+/g, " ");
  if (/^(HEAD|SELF)\b/.test(r)) return "self";
  if (["WIFE", "WOFE", "HUSBAND"].includes(r)) return "spouse";
  if (["SON", "DAUGHTER", "D/O", "S/O"].includes(r)) return "child";
  if (["MOTHER", "FATHER"].includes(r)) return "parent";
  return "other";
}

/** What the relation says about gender, for rows where GENDER was left blank. */
const FEMALE = /^(WIFE|WOFE|MOTHER|DAUGHTER|DAUGHTER-IN-LAW|DAUGHTER IN LAW|GRAND ?DAUGHTER|G\. DAUGHTER|GRANDMOTHER|GRAND MOTHER|SISTER|SISTER-IN-LAW|NIECE|BROTHER'?S WIFE|D\/O)$/;
const MALE = /^(HUSBAND|FATHER|SON|SON-IN-LAW|GRAND ?SON|GRANDFATHER|BROTHER|NEPHEW|BROTHER'?S SON|S\/O)$/;
function genderFromRelation(raw) {
  const r = english(raw).toUpperCase().replace(/\s+/g, " ");
  if (FEMALE.test(r)) return "female";
  if (MALE.test(r)) return "male";
  return "";
}

const gender = (v) => ({ M: "male", F: "female" })[str(v).toUpperCase()] ?? "";
const marital = (v) =>
  ({ M: "married", MARRIED: "married", UM: "single", UNMARRIED: "single", W: "widowed", WIDOWED: "widowed" })[
    english(v).toUpperCase()
  ] ?? "";
const yes = (v) => /^y/i.test(str(v));
const bloodGroup = (v) => str(v).toUpperCase().replace(/\s+/g, "").replace("VE", "");
const ageOf = (v) => {
  const n = Number(str(v));
  return Number.isFinite(n) && n > 0 && n < 120 ? Math.round(n) : null;
};

function occupationType(v) {
  const s = str(v).toLowerCase();
  return OCCUPATIONS.find((o) => o.toLowerCase() === s) ?? "";
}

/* ----------------------------------------------------------- shared records */

const thisYear = new Date().getFullYear();
const households = [];
const people = [];
const issues = [];
const warnings = [];
// Form fields the app has no home for yet; counted so nobody thinks they vanished
const keptInSheetOnly = { "father's name": 0, "office phone": 0, "residence phone": 0, "circulars at": 0 };

const addIssue = (householdId, personId, field, kind, message, raw = "") =>
  issues.push({
    id: `i${issues.length + 1}`,
    householdId, personId, field, kind, message, raw, resolved: false,
  });

/**
 * A new household for family number `number`. A number already used in this
 * sheet is a typo on one of the two forms, so the repeat gets its own id and
 * a flag rather than being merged into a stranger's family.
 */
function newHousehold(number, fields, sourceRow, where, repeatSuffix, source = "sheet") {
  const repeat = households.some((h) => h.bookNumber === number);
  const household = {
    id: repeat ? `h${number}-${repeatSuffix}` : `h${number}`,
    bookNumber: number,
    familyName: "",
    surname: "",
    gotra: "", nativePlace: "", address: "", area: "", city: "Indore",
    pincode: "", mapsUrl: "",
    ...fields,
    photo: null,
    anniversary: null,
    headPersonId: null,
    sourceRow,
    memberCount: 0,
  };
  households.push(household);
  if (repeat) {
    addIssue(household.id, null, "family-number", "review",
      `Family number (${number}) is also used by another family in the ${source}`, where);
  }
  return household;
}

/** A person record with every field the app expects, defaults filled in. */
function newPerson(household, isHead, words, fields) {
  // A one-word name takes the family surname, so search by surname finds it
  const firstName = words[0] ?? "";
  const lastName = words.length > 1 ? words[words.length - 1] : household.surname;
  const middleName = words.length > 2 ? words.slice(1, -1).join(" ") : "";
  const { age = null, dob = null, ...rest } = fields;

  const person = {
    id: `p${household.id.slice(1)}-${household.memberCount++}`,
    householdId: household.id,
    firstName, middleName, lastName,
    relationship: "other",
    gender: "",
    photo: null,
    mobile: null, whatsapp: null, email: "",
    dob,
    bloodGroup: "", maritalStatus: "", livingIn: "", education: "", occupationType: "",
    business: {
      name: "", category: "", description: "", keywords: "", address: "",
      phone: "", website: "", instagram: "", visitingCard: null,
    },
    privacy: {
      hideMobile: false, hideWhatsapp: false, hideEmail: false,
      hideDobYear: false, hidePhoto: false,
    },
    deceased: false,
    claimedByEmail: null,
    ...rest,
    age: dob ? null : age,
    birthYear: dob ? Number(dob.slice(0, 4)) : age !== null ? thisYear - age : null,
  };
  people.push(person);
  if (isHead) household.headPersonId = person.id;
  if (!firstName) addIssue(household.id, person.id, "name", "missing", "Name is missing");
  return person;
}

function checkMobile(household, person, mobile, isHead) {
  if (mobile.raw && !mobile.value) {
    addIssue(household.id, person.id, "mobile", "unreadable", "Mobile number isn't a valid 10-digit number", mobile.raw);
  } else if (isHead && !mobile.value) {
    addIssue(household.id, person.id, "mobile", "missing", "Head of family has no mobile number");
  }
}

/* ------------------------------------------------- layout 1: the entry sheet */

// Heading text (its first, English line) → field. Matching by heading keeps a
// moved column from silently feeding addresses into the gotra field.
const ENTRY_HEADINGS = {
  "FORM NO.": "form", "SR.": "sr", NAME: "name", MOBILE: "mobile", AGE: "age",
  "MARRIED?": "married", EDUCATION: "education", "RELATION TO HEAD": "relation",
  "BLOOD GROUP": "blood", "GENDER (OPTIONAL)": "gender", "FATHER'S NAME": "father",
  GOTRA: "gotra", ADDRESS: "address", "AREA / COLONY": "area", PINCODE: "pincode",
  "NATIVE VILLAGE": "native", "BUSINESS / OFFICE": "business",
  "WHATSAPP FOR NOTICES": "whatsapp", "PHONE (OFFICE)": "phoneOffice",
  "PHONE (RESIDENCE)": "phoneHome", EMAIL: "email", "CIRCULARS AT": "circulars",
  ADULTS: "adults", CHILDREN: "children", TOTAL: "total", NOTES: "notes",
};
const ENTRY_REQUIRED = ["form", "sr", "name", "relation"];

function readEntry(ws) {
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const at = (c, r) => ws[XLSX.utils.encode_cell({ c, r })]?.v;

  // The headings are on whichever of the first rows starts with FORM NO.
  let headerRow = -1;
  for (let r = 0; r <= Math.min(5, range.e.r); r++) {
    if (/^FORM NO/i.test(str(at(0, r)))) { headerRow = r; break; }
  }
  if (headerRow < 0) throw new Error('ENTRY sheet: no "FORM NO." heading in the first rows');

  const col = {};
  for (let c = 0; c <= range.e.c; c++) {
    const heading = str(at(c, headerRow)).split("\n")[0].trim().toUpperCase();
    if (ENTRY_HEADINGS[heading]) col[ENTRY_HEADINGS[heading]] = c;
  }
  const missing = ENTRY_REQUIRED.filter((k) => col[k] === undefined);
  if (missing.length) throw new Error(`ENTRY sheet: missing column(s) ${missing.join(", ")}`);
  const get = (key, r) => (col[key] === undefined ? undefined : at(col[key], r));

  const byForm = new Map(); // form number → the household its later rows join
  const declaredTotal = new Map();

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const row = r + 1; // as Excel numbers it
    if (!str(get("name", r)) && !str(get("form", r))) continue; // blank row

    const form = Number(str(get("form", r)));
    if (!Number.isInteger(form) || form <= 0) {
      warnings.push(`row ${row}: no FORM NO. — skipped`);
      continue;
    }
    const said = relationOf(get("relation", r));
    const isHead = Number(str(get("sr", r))) === 1 || (said === "self" && !byForm.has(form));
    const { words } = parseName(get("name", r));

    let household;
    if (isHead) {
      const business = str(get("business", r));
      household = newHousehold(form, {
        surname: words.length > 1 ? words[words.length - 1] : "",
        gotra: titleCase(str(get("gotra", r))),
        nativePlace: titleCase(str(get("native", r))),
        address: str(get("address", r)),
        area: titleCase(str(get("area", r))),
        pincode: str(get("pincode", r)).replace(/\D/g, ""),
      }, row, `form ${form}, row ${row}`, row);
      household.business = business;
      byForm.set(form, household);
      const total = Number(str(get("total", r))) ||
        (Number(str(get("adults", r))) || 0) + (Number(str(get("children", r))) || 0);
      if (total) declaredTotal.set(household, total);
      if (str(get("father", r))) keptInSheetOnly["father's name"]++;
      if (str(get("phoneOffice", r))) keptInSheetOnly["office phone"]++;
      if (str(get("phoneHome", r))) keptInSheetOnly["residence phone"]++;
      if (str(get("circulars", r))) keptInSheetOnly["circulars at"]++;
    } else {
      household = byForm.get(form);
      if (!household) {
        warnings.push(`row ${row}: form ${form} has no head row (SR. 1) above it — skipped`);
        continue;
      }
    }

    const mobile = parseMobile(get("mobile", r));
    // The form's "WhatsApp for samaj notices" is the family's; it belongs to the head
    const whatsapp = isHead ? parseMobile(get("whatsapp", r)) : { value: null, raw: "" };
    const person = newPerson(household, isHead, words, {
      relationship: isHead ? "self" : said === "self" ? "other" : said,
      gender: gender(get("gender", r)) || genderFromRelation(get("relation", r)),
      mobile: mobile.value,
      whatsapp: whatsapp.value && whatsapp.value !== mobile.value ? whatsapp.value : null,
      email: isHead ? str(get("email", r)).toLowerCase() : "",
      bloodGroup: bloodGroup(get("blood", r)),
      maritalStatus: marital(get("married", r)),
      education: str(get("education", r)),
      age: ageOf(get("age", r)),
    });

    // "Shah Traders, 12 MG Road" — the name before the first comma, the rest is where
    if (isHead && household.business) {
      const [name, ...where] = household.business.split(",");
      person.business.name = name.trim();
      person.business.address = where.join(",").trim();
    }

    checkMobile(household, person, mobile, isHead);
    if (isHead && whatsapp.raw && !whatsapp.value) {
      addIssue(household.id, person.id, "whatsapp", "unreadable", "WhatsApp number isn't a valid 10-digit number", whatsapp.raw);
    }
    if (!isHead && !str(get("relation", r))) {
      addIssue(household.id, person.id, "relationship", "review", "No relation to the head of family was given");
    }
    if (!isHead && said === "self") {
      addIssue(household.id, person.id, "relationship", "review",
        "Marked Self, but the family's head is SR. 1", str(get("relation", r)));
    }
    const note = str(get("notes", r));
    if (note) addIssue(household.id, person.id, "note", "review", "Note from the person who typed the form", note);
  }

  // The head's gender, where the sheet didn't say, follows from the spouse's row
  for (const h of households) {
    const head = people.find((p) => p.id === h.headPersonId);
    const spouse = people.find((p) => p.householdId === h.id && p.relationship === "spouse");
    if (head && !head.gender && spouse?.gender) {
      head.gender = spouse.gender === "female" ? "male" : "female";
    }
    const declared = declaredTotal.get(h);
    if (declared && declared !== h.memberCount) {
      addIssue(h.id, null, "members", "review",
        `The form says ${declared} members, but ${h.memberCount} were typed`, `form ${h.bookNumber}`);
    }
    delete h.business;
  }
}

/* ------------------------------------------------------- layout 2: Book 2 */

// Column letters as laid out in Book 2's header row
const BOOK2 = {
  sno: "A", name: "B", mobile: "C", age: "D", marital: "E", relation: "F",
  address: "G", area: "H", city: "I", pincode: "J", gotra: "K", native: "L",
  maps: "M", gender: "N", dob: "O", anniversary: "P", blood: "Q", donor: "R",
  education: "S", livingIn: "T", deceased: "U", whatsapp: "V", email: "W",
  occupation: "X", bizName: "Y", bizCategory: "Z", bizWhat: "AA",
  bizProducts: "AB", bizAddress: "AC", bizPhone: "AD", bizWeb: "AE",
};

function readBook2(ws) {
  const last = XLSX.utils.decode_range(ws["!ref"]).e.r + 1;
  const cell = (key, row) => ws[`${BOOK2[key]}${row}`]?.v;
  let current = null;

  for (let row = 2; row <= last; row++) {
    const sno = cell("sno", row);
    const nameRaw = cell("name", row);
    if (!str(nameRaw)) continue; // the blank rows between families

    const isHead = typeof sno === "number" || /^\d+$/.test(str(sno));
    const { words, family } = parseName(nameRaw);

    if (isHead) {
      // The bracket number is the book's own family number (S.NO only counts rows)
      current = newHousehold(family ?? `s${sno}`, {
        surname: words.length > 1 ? words[words.length - 1] : "",
        gotra: titleCase(str(cell("gotra", row))),
        nativePlace: titleCase(str(cell("native", row))),
        address: str(cell("address", row)),
        area: titleCase(str(cell("area", row))),
        city: titleCase(str(cell("city", row))) || "Indore",
        pincode: str(cell("pincode", row)).replace(/\D/g, ""),
        mapsUrl: str(cell("maps", row)),
      }, row, `S.NO ${sno}`, sno, "book"); // the suffix is already live as h193-112
    } else if (!current) {
      warnings.push(`row ${row}: a family member before any head — skipped`);
      continue;
    } else if (family !== null && family !== current.bookNumber) {
      warnings.push(`row ${row}: listed under ${current.id} but the name says family (${family})`);
    }

    // Only the first person in a block is the head; a second "HEAD" is a slip
    const said = relationOf(cell("relation", row));
    const mobile = parseMobile(cell("mobile", row));
    const web = str(cell("bizWeb", row));
    const isInstagram = /instagram\.com|^@/i.test(web);
    const anniversary = parseDate(cell("anniversary", row));

    const person = newPerson(current, isHead, words, {
      relationship: isHead ? "self" : said === "self" ? "other" : said,
      gender: gender(cell("gender", row)),
      mobile: mobile.value,
      whatsapp: parseMobile(cell("whatsapp", row)).value,
      email: str(cell("email", row)).toLowerCase(),
      dob: parseDate(cell("dob", row)),
      bloodGroup: bloodGroup(cell("blood", row)),
      maritalStatus: marital(cell("marital", row)),
      livingIn: titleCase(str(cell("livingIn", row))),
      education: str(cell("education", row)),
      occupationType: occupationType(cell("occupation", row)),
      business: {
        name: str(cell("bizName", row)),
        category: str(cell("bizCategory", row)),
        description: str(cell("bizWhat", row)),
        keywords: str(cell("bizProducts", row)),
        address: str(cell("bizAddress", row)),
        phone: parseMobile(cell("bizPhone", row)).value ?? "",
        website: isInstagram ? "" : web,
        instagram: isInstagram ? web : "",
        visitingCard: null,
      },
      deceased: yes(cell("deceased", row)),
      age: ageOf(cell("age", row)),
    });

    // The couple's anniversary lives on the household — the head's, else the spouse's
    if (anniversary && (isHead || (person.relationship === "spouse" && !current.anniversary))) {
      current.anniversary = anniversary;
    }

    checkMobile(current, person, mobile, isHead);
    if (!isHead && !str(cell("relation", row))) {
      addIssue(current.id, person.id, "relationship", "review", "No relation to the head of family was given");
    }
    if (!isHead && said === "self") {
      addIssue(current.id, person.id, "relationship", "review",
        "Marked HEAD, but the family's head is the first person listed", str(cell("relation", row)));
    }
  }
}

/* -------------------------------------------------------------------- read */

const wb = XLSX.readFile(FILE);
const layout = wb.Sheets.ENTRY ? "ENTRY" : wb.Sheets["MAIN SHEET"] ? "MAIN SHEET" : null;
if (!layout) {
  console.error(`Neither an ENTRY nor a MAIN SHEET sheet in ${FILE}`);
  process.exit(1);
}
try {
  (layout === "ENTRY" ? readEntry : readBook2)(wb.Sheets[layout]);
} catch (err) {
  console.error(err.message);
  process.exit(1);
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

// These only steered the import; the database has no columns for them
for (const h of households) {
  delete h.bookNumber;
  delete h.memberCount;
}

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

if (!DRY_RUN) {
  mkdirSync(resolve(ROOT, ".data"), { recursive: true });
  writeFileSync(resolve(ROOT, ".data", "db.json"), JSON.stringify(db, null, 2));
}

const count = (f) => people.filter(f).length;
const byKind = issues.reduce((a, i) => ((a[i.kind] = (a[i.kind] ?? 0) + 1), a), {});
const kept = Object.entries(keptInSheetOnly).filter(([, n]) => n);

console.log(`
Read ${db.source} (${layout})

  Families           ${households.length}
  People             ${people.length}
    with a mobile    ${count((p) => p.mobile)}
    with an age      ${count((p) => p.age !== null || p.dob)}
    with a gender    ${count((p) => p.gender)}
  Needs attention    ${issues.length}  ${JSON.stringify(byKind)}
${kept.length ? `\nKept in the sheet only (the app has no field for them yet):\n  ${kept.map(([k, n]) => `${k}: ${n}`).join(", ")}\n` : ""}${warnings.length ? `\nWarnings:\n  ${warnings.join("\n  ")}\n` : ""}
${DRY_RUN ? "Dry run — nothing written." : 'Wrote .data/db.json — run "npm run migrate" to send it to Supabase.'}
`);
