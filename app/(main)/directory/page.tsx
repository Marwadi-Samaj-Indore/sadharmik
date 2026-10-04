import { getDb } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import {
  DirectoryBrowser,
  type HouseholdRow,
  type PersonRow,
} from "@/components/DirectoryBrowser";
import { fullName, initials, relationshipLabel } from "@/lib/util";

export default async function DirectoryPage() {
  const db = await getDb();

  const householdById = new Map(db.households.map((h) => [h.id, h]));

  const households: HouseholdRow[] = db.households.map((h) => {
    const members = db.people.filter((p) => p.householdId === h.id);
    const head = members.find((p) => p.id === h.headPersonId) ?? members[0];

    return {
      id: h.id,
      familyName: h.familyName,
      surname: h.surname,
      gotra: h.gotra,
      area: h.area,
      memberCount: members.length,
      headLabel: head ? initials(head) : "?",
      headPhoto: head?.privacy.hidePhoto ? null : head?.photo ?? null,
      // Only what is searchable but NOT already displayed on the row. The name,
      // surname, gotra and area are sent anyway, so repeating them here just
      // doubled the payload.
      extra: [
        h.address,
        h.nativePlace,
        ...members.map((p) => fullName(p)),
        ...members.map((p) => p.business.name),
        ...members.map((p) => p.business.category),
        ...members.map((p) => p.business.keywords),
        ...members.map((p) => p.mobile ?? ""),
      ]
        .filter(Boolean)
        .join(" "),
    };
  });

  const people: PersonRow[] = db.people
    .filter((p) => !p.deceased)
    .map((p) => {
      const household = householdById.get(p.householdId);
      return {
        id: p.id,
        householdId: p.householdId,
        name: fullName(p),
        label:
          p.business.category ||
          p.occupationType ||
          relationshipLabel(p) ||
          "",
        area: household?.area ?? "",
        avatarLabel: initials(p),
        photo: p.privacy.hidePhoto ? null : p.photo,
        bloodGroup: p.bloodGroup,
        extra: [
          household?.familyName,
          household?.gotra,
          p.business.name,
          p.business.keywords,
          p.business.description,
          // The row shows the business category when there is one, so the
          // occupation would otherwise stop being searchable for those members
          p.occupationType,
          p.education,
          p.livingIn,
          p.mobile ?? "",
        ]
          .filter(Boolean)
          .join(" "),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const areas = [...new Set(db.households.map((h) => h.area).filter(Boolean))].sort();
  const gotras = [...new Set(db.households.map((h) => h.gotra).filter(Boolean))].sort();
  const bloodGroups = [
    ...new Set(db.people.map((p) => p.bloodGroup).filter(Boolean)),
  ].sort();

  return (
    <>
      <PageTitle
        title="Directory"
        subtitle={`${db.households.length} households · ${people.length} members`}
      />
      <DirectoryBrowser
        households={households}
        people={people}
        areas={areas}
        gotras={gotras}
        bloodGroups={bloodGroups}
      />
    </>
  );
}
