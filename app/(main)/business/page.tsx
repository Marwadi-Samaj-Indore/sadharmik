import { getDb } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import {
  BusinessBrowser,
  type BusinessRow,
  type CategoryTile,
} from "@/components/BusinessBrowser";
import { BUSINESS_CATEGORIES, categoryRank, categorySlug } from "@/lib/categories";
import { fullName, initials } from "@/lib/util";

export default async function BusinessPage() {
  const db = await getDb();
  const householdById = new Map(db.households.map((h) => [h.id, h]));

  const listed = db.people.filter(
    (p) => !p.deceased && (p.business.category || p.business.name)
  );

  // Trades first, then occupation statuses (Retired, Student, …), then "Other".
  // Within each group: most members first, then alphabetical.
  const categories: CategoryTile[] = BUSINESS_CATEGORIES.map((name) => ({
    name,
    slug: categorySlug(name),
    count: listed.filter((p) => p.business.category === name).length,
    rank: categoryRank(name),
  })).sort(
    (a, b) =>
      a.rank - b.rank || b.count - a.count || a.name.localeCompare(b.name)
  );

  const listings: BusinessRow[] = listed.map((p) => {
    const household = householdById.get(p.householdId);
    return {
      personId: p.id,
      name: fullName(p),
      avatarLabel: initials(p),
      photo: p.privacy.hidePhoto ? null : p.photo,
      businessName: p.business.name,
      category: p.business.category,
      categorySlug: categorySlug(p.business.category),
      description: p.business.description,
      area: household?.area ?? "",
      searchBlob: [
        p.business.name,
        p.business.category,
        p.business.keywords,
        p.business.description,
        fullName(p),
        household?.area,
        p.occupationType,
      ]
        .filter(Boolean)
        .join(" "),
    };
  });

  const total = listings.length;

  return (
    <>
      <PageTitle
        title="Business"
        subtitle={
          total > 0
            ? `${total} ${total === 1 ? "member has" : "members have"} listed what they do`
            : "Find who in our group can help you"
        }
      />
      <BusinessBrowser categories={categories} listings={listings} />
    </>
  );
}
