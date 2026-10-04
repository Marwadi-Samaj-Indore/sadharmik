import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { fullName, relationshipLabel } from "@/lib/util";

/**
 * Exports the whole directory as CSV so the committee can always get its data
 * back out — no lock-in. Opens directly in Excel.
 */
export async function GET() {
  const session = await getSession();
  if (!session.isAdmin) {
    return new Response("Only committee admins can export the directory.", {
      status: 403,
    });
  }

  const db = await getDb();
  const householdById = new Map(db.households.map((h) => [h.id, h]));

  const headers = [
    "Household", "Surname", "Gotra", "Native place", "Address", "Area", "City",
    "Pincode", "Anniversary", "Name", "Relationship", "Gender", "Mobile",
    "WhatsApp", "Email", "Date of birth", "Blood group", "Marital status",
    "Currently living in", "Education", "Occupation type", "Business name",
    "Business category", "What they do", "Products & services",
    "Business address", "Business phone", "Website", "Instagram",
    "Has photo", "Profile claimed by",
  ];

  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const rows = db.people.map((p) => {
    const h = householdById.get(p.householdId);
    return [
      h?.familyName, h?.surname, h?.gotra, h?.nativePlace, h?.address, h?.area,
      h?.city, h?.pincode, h?.anniversary,
      fullName(p), relationshipLabel(p), p.gender,
      p.mobile, p.whatsapp, p.email, p.dob, p.bloodGroup, p.maritalStatus,
      p.livingIn, p.education, p.occupationType,
      p.business.name, p.business.category, p.business.description,
      p.business.keywords, p.business.address, p.business.phone,
      p.business.website, p.business.instagram,
      p.photo ? "yes" : "no", p.claimedByEmail,
    ].map(escape).join(",");
  });

  const csv = [headers.map(escape).join(","), ...rows].join("\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="marwadi-samaj-indore-directory-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
