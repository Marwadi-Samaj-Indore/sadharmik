/**
 * The fixed business taxonomy. Members pick from this list rather than typing
 * free text — a free-text field means nobody is ever found.
 *
 * Drafted for a Jain business community in Indore; pending committee approval.
 */
export const BUSINESS_CATEGORIES = [
  "Textiles & Cloth",
  "Readymade Garments",
  "Real Estate & Construction",
  "Jewellery — Gold / Silver / Diamond",
  "CA / Accounting / Audit / Taxation",
  "Share Market, Investment & Wealth",
  "Insurance & Loans",
  "Banking & Finance",
  "Pharma & Medical Distribution",
  "Doctor / Dentist / Healthcare",
  "Lawyer / Legal / Notary",
  "Education, Coaching & Training",
  "IT, Software & Digital Marketing",
  "Food, Namkeen, Sweets & Restaurant",
  "Soya, Oil & Agro Processing",
  "Mandi, Commodity & Grain Trading",
  "Transport & Logistics",
  "Hardware, Sanitary & Plywood",
  "Electricals & Electronics Retail",
  "Mobile, Computer & Gadgets",
  "Automobile — Dealership / Service / Parts",
  "Chemicals, Plastics & Packaging",
  "Printing, Paper & Stationery",
  "Machinery & Industrial Supplies",
  "Furniture, Interior & Architecture",
  "Paints & Building Materials",
  "Travel, Tourism & Hospitality",
  "Event Management & Catering",
  "Scrap & Metal Trading",
  "Government / Public Service",
  "Private Job / Salaried",
  "Retired",
  "Student",
  "Homemaker",
  "Other",
] as const;

export const OCCUPATION_TYPES = [
  "Business owner",
  "Professional",
  "Salaried",
  "Student",
  "Retired",
  "Homemaker",
] as const;

export const BLOOD_GROUPS = [
  "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-",
] as const;

/**
 * Committee posts, in the order the group ranks them — the same order the
 * printed leadership poster uses. Listed rather than free-typed so the Home
 * screen doesn't end up with "Secretary", "secretary" and "Sachiv" side by
 * side.
 */
export const COMMITTEE_ROLES = [
  "President",
  "Chairman",
  "Immediate Past President",
  "Patron",
  "Secretary",
  "Treasurer",
  "Former President",
  "Committee Member",
] as const;

/**
 * These five describe what someone does, not a business another member could
 * hire. They are grouped below the trades so the top of the Business tab stays
 * useful for someone actually looking for a supplier or professional.
 */
export const NON_TRADE_CATEGORIES: readonly string[] = [
  "Government / Public Service",
  "Private Job / Salaried",
  "Retired",
  "Student",
  "Homemaker",
];

export const CATCH_ALL_CATEGORY = "Other";

/** 0 = a trade, 1 = an occupation status, 2 = the catch-all. Sorted in this order. */
export function categoryRank(name: string): 0 | 1 | 2 {
  if (name === CATCH_ALL_CATEGORY) return 2;
  return NON_TRADE_CATEGORIES.includes(name) ? 1 : 0;
}

export const categorySlug = (category: string) =>
  category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const categoryFromSlug = (slug: string) =>
  BUSINESS_CATEGORIES.find((c) => categorySlug(c) === slug) ?? null;
