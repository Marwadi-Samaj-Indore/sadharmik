import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Heart, Home, Pencil } from "lucide-react";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Avatar } from "@/components/Avatar";
import { FlipLink, FlipTarget } from "@/components/Flip";
import { BackBar, DetailRow, Badge, SectionHeading } from "@/components/ui";
import { ICON } from "@/lib/icons";
import {
  ageFrom,
  formatDateLong,
  fullName,
  mapsLink,
  properCase,
  relationshipLabel,
} from "@/lib/util";

export default async function HouseholdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [db, session] = await Promise.all([getDb(), getSession()]);

  const household = db.households.find((h) => h.id === id);
  if (!household) notFound();

  const members = db.people
    .filter((p) => p.householdId === household.id)
    .sort((a, b) => {
      const order = { self: 0, spouse: 1, parent: 2, child: 3, other: 4 };
      return order[a.relationship] - order[b.relationship];
    });

  const canEditHousehold =
    session.isAdmin || session.person?.householdId === household.id;
  // Completed years, not the ordinal — "· 30 years" beside a November date
  // in August would be claiming an anniversary they haven't reached yet.
  const anniversaryYears = ageFrom(household.anniversary);

  return (
    <>
      <BackBar label={household.surname || "Household"} href="/directory" />

      <div className="px-4 pt-5">
        <div className="flex items-start gap-3">
          <div className="flex shrink-0 -space-x-4">
            {members.slice(0, 2).map((p, i) =>
              i === 0 ? (
                // The head's avatar is what the directory row showed, so it is
                // what the tapped tile grows into
                <FlipTarget key={p.id} flipId={`household:${household.id}`}>
                  <Avatar person={p} size="lg" className="ring-2 ring-cream" />
                </FlipTarget>
              ) : (
                <Avatar key={p.id} person={p} size="lg" className="ring-2 ring-cream" />
              )
            )}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            {/* The family's name in the serif, at the same size as the
                person hero — the same register, because this page IS the
                family's page */}
            <h1 className="font-serif text-hero font-semibold tracking-[-0.01em]">
              {household.familyName}
            </h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {household.gotra && <Badge tone="info">{household.gotra}</Badge>}
              {household.area && <Badge>{household.area}</Badge>}
              <Badge>
                {members.length} {members.length === 1 ? "member" : "members"}
              </Badge>
            </div>
          </div>
        </div>

        {canEditHousehold && (
          <Link
            href={`/me/household/${household.id}?from=household`}
            className="btn btn-secondary mt-4 w-full"
          >
            <Pencil size={ICON.sm} />
            Edit household details
          </Link>
        )}
      </div>

      {/* Anniversary */}
      {household.anniversary && (
        <div className="mt-5 px-4">
          <div className="card-fill flex items-center gap-3.5 p-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface/70">
              <Heart size={ICON.md} className="text-birthday" />
            </span>
            <div>
              <p className="font-display text-sm font-bold">Wedding anniversary</p>
              <p className="text-xs text-ink-soft">
                {formatDateLong(household.anniversary)}
                {anniversaryYears ? ` · ${anniversaryYears} years` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Family members */}
      <section className="mt-6">
        <SectionHeading>Family members</SectionHeading>
        <ul className="mx-4 space-y-2">
          {members.map((person) => {
            const age = ageFrom(person.dob) ?? person.age;
            return (
              <li key={person.id}>
                <FlipLink
                  flipId={`person:${person.id}`}
                  href={`/person/${person.id}`}
                  className="card card-tap flex items-center gap-3.5 p-3"
                >
                  <Avatar person={person} size="row" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-bold">
                      {fullName(person)}
                      {person.deceased && (
                        <span className="ml-1.5 text-xs font-normal text-ink-faint">
                          (late)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-ink-soft">
                      {[
                        relationshipLabel(person),
                        age !== null ? `${age} yrs` : "",
                        person.business.category || person.occupationType,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </FlipLink>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Address */}
      <section className="mt-6">
        <SectionHeading>Home</SectionHeading>
        <div className="card mx-4 overflow-hidden">
          {household.address ? (
            <DetailRow
              label="Address"
              value={<span className="block max-w-[13rem]">{properCase(household.address)}</span>}
              icon={<Home size={ICON.sm} />}
            />
          ) : (
            <DetailRow label="Address" value={<span className="text-ink-faint">Not added yet</span>} icon={<Home size={ICON.sm} />} />
          )}
          {household.area && <DetailRow label="Area / colony" value={household.area} />}
          {household.city && <DetailRow label="City" value={household.city} />}
          {household.pincode && (
            <DetailRow label="Pincode" value={<span className="tnum">{household.pincode}</span>} />
          )}
          {household.nativePlace && (
            <DetailRow label="Native place" value={household.nativePlace} />
          )}
        </div>

        {household.address && (
          <div className="mt-3 px-4">
            <a
              href={mapsLink(household)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost w-full"
            >
              <MapPin size={ICON.sm} />
              Open in Maps
            </a>
          </div>
        )}
      </section>
    </>
  );
}
