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
  household: Household;
  couple: Person[];
  days: number;
  dateIso: string;
}

export type Celebration = BirthdayEntry | AnniversaryEntry;

/**
 * Birthdays and anniversaries within the next `withinDays` days, today first.
 * Year is ignored — only the day and month matter for wishing someone.
 */
export function celebrations(
  db: Database,
  withinDays: number,
  today = new Date()
): Celebration[] {
  const out: Celebration[] = [];

  for (const person of db.people) {
    if (person.deceased || !person.dob) continue;
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

    const couple = db.people.filter(
      (p) =>
        p.householdId === household.id &&
        (p.relationship === "self" || p.relationship === "spouse") &&
        !p.deceased
    );
    if (couple.length === 0) continue;

    out.push({
      kind: "anniversary",
      household,
      couple,
      days,
      dateIso: household.anniversary,
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
