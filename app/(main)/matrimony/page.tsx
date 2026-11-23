import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { getDb } from "@/lib/db";
import { Avatar } from "@/components/Avatar";
import { BackBar, Badge, EmptyState } from "@/components/ui";
import { ageFrom, shortName } from "@/lib/util";
import { ICON } from "@/lib/icons";
import type { Person } from "@/lib/types";

/**
 * Matrimony: unmarried members of the samaj, as possible matches.
 *
 * Built from the directory itself rather than from uploaded biodata — anyone
 * marked Single with a known gender and age appears. The first screen asks
 * who the family is looking for, so the list that follows is one gender only.
 *
 * Only adults are listed: the legal marriage ages in India (21 for a groom,
 * 18 for a bride). Someone with no age or date of birth on record is left
 * out rather than guessed at, because the alternative is listing a child.
 * Each row opens the ordinary profile page, which already honours the
 * member's privacy choices (hidden photo, mobile, birth year).
 */
const LOOKING = {
  boy: { gender: "male", minAge: 21, title: "Looking for a boy", noun: "boys" },
  girl: { gender: "female", minAge: 18, title: "Looking for a girl", noun: "girls" },
} as const;

export default async function MatrimonyPage({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  const { for: lookingFor } = await searchParams;
  const choice = lookingFor === "boy" || lookingFor === "girl" ? LOOKING[lookingFor] : null;

  if (!choice) {
    return (
      <>
        <BackBar label="Matrimony" href="/" />
        <div className="px-4 pt-5">
          <h1 className="text-title">Matrimony</h1>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Unmarried members of the samaj, from the directory. Who are you looking for?
          </p>
          <div className="mt-5 grid gap-3">
            {(["boy", "girl"] as const).map((key) => (
              <Link
                key={key}
                href={`/matrimony?for=${key}`}
                className={`card-tap flex items-center justify-between rounded-card px-5 py-6 ${
                  key === "boy" ? "bg-leaf-pale text-leaf-ink" : "bg-clay-pale text-clay-ink"
                }`}
              >
                <span className="font-display text-lg font-semibold">
                  {LOOKING[key].title}
                </span>
                <ChevronRight size={ICON.lg} />
              </Link>
            ))}
          </div>
          <Link
            href="/feed?tab=matrimonial"
            className="mt-4 flex items-center gap-2 text-sm font-semibold text-clay-text"
          >
            <FileText size={ICON.sm} />
            Or browse the biodata members have shared
          </Link>
        </div>
      </>
    );
  }

  const db = await getDb();
  const householdById = new Map(db.households.map((h) => [h.id, h]));
  const ageOf = (p: Person) => ageFrom(p.dob) ?? p.age;

  const matches = db.people
    .filter(
      (p) =>
        !p.deceased &&
        p.maritalStatus === "single" &&
        p.gender === choice.gender &&
        (ageOf(p) ?? 0) >= choice.minAge
    )
    .sort((a, b) => (ageOf(a) ?? 0) - (ageOf(b) ?? 0));

  return (
    <>
      <BackBar label={choice.title} href="/matrimony" />
      <div className="px-4 pt-5">
        <h1 className="text-title">{choice.title}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          <span className="tnum">{matches.length}</span> unmarried {choice.noun} in the
          directory, youngest first
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="Nobody listed yet"
            body="Members appear here once their profile says Single, with a gender and an age or date of birth."
          />
        </div>
      ) : (
        <ul className="mx-4 mt-4 space-y-2">
          {matches.map((p) => {
            const household = householdById.get(p.householdId);
            const age = ageOf(p);
            return (
              <li key={p.id}>
                <Link href={`/person/${p.id}`} className="card card-tap flex items-center gap-3 p-3">
                  <Avatar person={p} size="row" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-base font-semibold">
                      {shortName(p)}
                    </p>
                    <p className="truncate text-xs text-ink-soft">
                      {[age !== null ? `${age} yrs` : null, p.education, household?.area || household?.city]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {/* Gotra matters here: families avoid a match in their own */}
                    {household?.gotra && (
                      <span className="mt-1 inline-block">
                        <Badge tone="warn">{household.gotra}</Badge>
                      </span>
                    )}
                  </div>
                  <ChevronRight size={ICON.md} className="shrink-0 text-ink-faint" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="h-6" />
    </>
  );
}
