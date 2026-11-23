import type { Database, Household, Person } from "./types";
import { daysUntilAnnual } from "./util";

export interface BirthdayEntry {
  kind: "birthday";
  person: Person;
  household: Household | undefined;
  days: number;
  dateIso: string;
}

export interface AnniversaryEntry {
  kind: "anniversary";
  /** "Abhay-Asha Shah", or "Chintan & Priya Shah" for a married son */
  title: string;
  href: string;
  couple: Person[];
  days: number;
  dateIso: string;
}

export type Celebration = BirthdayEntry | AnniversaryEntry;

/** "Chintan & Priya Shah"; two surnames are kept when they differ. */
function coupleName(people: Person[]): string {
  const [a, b] = people;
  if (!b) return `${a.firstName} ${a.lastName}`.trim();
  return a.lastName === b.lastName
    ? `${a.firstName} & ${b.firstName} ${a.lastName}`.trim()
    : `${a.firstName} ${a.lastName} & ${b.firstName} ${b.lastName}`.trim();
}

/**
 * Birthdays and anniversaries within the next `withinDays` days, today first.
 * Year is ignored — only the day and month matter.
 *
 * Shown to the committee only. Sadharmik's members are the whole samaj, and a
 * daily list of strangers' birthdays is noise to them; to the committee it is
 * a list of people to greet on the samaj's behalf.
 *
 * Anniversaries come from two places. The head couple's date is the
 * household's. Anyone else married — a son and his wife in a joint family —
 * carries their own on their profile, and two people in one household with
 * the same date are one couple, shown once.
 */
export function celebrations(
  db: Database,
  withinDays: number,
  today = new Date()
): Celebration[] {
  const out: Celebration[] = [];
  const alive = db.people.filter((p) => !p.deceased);

  for (const person of alive) {
    if (!person.dob) continue;
    const days = daysUntilAnnual(person.dob, today);
    if (days === null || days > withinDays) continue;
    out.push({
      kind: "birthday",
      person,
      household: db.households.find((h) => h.id === person.householdId),
      days,
      dateIso: person.dob,
    });
  }

  for (const household of db.households) {
    if (!household.anniversary) continue;
    const days = daysUntilAnnual(household.anniversary, today);
    if (days === null || days > withinDays) continue;
    const couple = alive.filter(
      (p) =>
        p.householdId === household.id &&
        (p.relationship === "self" || p.relationship === "spouse")
    );
    if (couple.length === 0) continue;
    out.push({
      kind: "anniversary",
      title: household.familyName,
      href: `/household/${household.id}`,
      couple,
      days,
      dateIso: household.anniversary,
    });
  }

  const couples = new Map<string, Person[]>();
  for (const person of alive) {
    if (!person.anniversary) continue;
    if (person.relationship === "self" || person.relationship === "spouse") continue;
    const key = `${person.householdId}|${person.anniversary}`;
    couples.set(key, [...(couples.get(key) ?? []), person]);
  }
  for (const couple of couples.values()) {
    const dateIso = couple[0].anniversary!;
    const days = daysUntilAnnual(dateIso, today);
    if (days === null || days > withinDays) continue;
    out.push({
      kind: "anniversary",
      title: coupleName(couple),
      href: `/person/${couple[0].id}`,
      couple,
      days,
      dateIso,
    });
  }

  return out.sort((a, b) => {
    if (a.days !== b.days) return a.days - b.days;
    // Anniversaries above birthdays on the same day, purely for a stable order
    return a.kind === b.kind ? 0 : a.kind === "anniversary" ? -1 : 1;
  });
}

export const dayLabel = (days: number) =>
  days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
