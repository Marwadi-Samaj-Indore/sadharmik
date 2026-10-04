import Link from "next/link";
import { Cake, Heart } from "lucide-react";
import type { Celebration } from "@/lib/celebrations";
import { ICON } from "@/lib/icons";
import { dayLabel } from "@/lib/celebrations";
import { Avatar } from "./Avatar";
import { WhatsAppButton } from "./WhatsAppButton";
import {
  anniversaryMessage,
  birthdayMessage,
  formatDate,
  ordinalYears,
  shortName,
} from "@/lib/util";

/**
 * One birthday or anniversary.
 *
 * Laid out to the committee's wireframe: the date leads and is the largest
 * line, because "in 2 days" is the thing a member acts on. The full-width Wish
 * button was replaced by a single round icon — it dominated the screen and
 * only two of them fitted above the fold.
 */
export function CelebrationCard({ entry }: { entry: Celebration }) {
  const isToday = entry.days === 0;

  const dateLine = (
    <div
      className={`flex items-center gap-1.5 font-semibold ${
        isToday ? "text-base" : "text-sm"
      } text-birthday`}
    >
      {entry.kind === "birthday" ? <Cake size={ICON.sm} /> : <Heart size={ICON.sm} />}
      <span>{dayLabel(entry.days)}</span>
      <span className="text-ink-faint">·</span>
      <span className="tnum text-ink-soft">
        {formatDate(entry.dateIso, { year: false })}
      </span>
    </div>
  );

  if (entry.kind === "birthday") {
    const { person } = entry;
    const wa = person.privacy.hideWhatsapp ? null : person.whatsapp;

    return (
      <article className={`${isToday ? "card-fill" : "card"} p-3.5`}>
        <div className="flex items-center gap-3">
          <Avatar person={person} size="lg" />

          <div className="min-w-0 flex-1">
            {dateLine}
            <Link
              href={`/person/${person.id}`}
              className="-my-1 mt-0.5 block truncate py-1 font-serif text-base font-semibold"
            >
              {shortName(person)}
            </Link>
            {/* Area and age deliberately dropped — the card is about the
                occasion, and both are one tap away on the profile */}
          </div>

          {wa && (
            <WhatsAppButton
              phone={wa}
              message={birthdayMessage(person)}
              label={`Wish ${person.firstName} on WhatsApp`}
            />
          )}
        </div>
      </article>
    );
  }

  const { household, couple } = entry;
  const years = ordinalYears(household.anniversary);
  const contact = couple.find((p) => !p.privacy.hideWhatsapp && p.whatsapp)?.whatsapp;

  return (
    <article className={`${isToday ? "card-fill" : "card"} p-3.5`}>
      <div className="flex items-center gap-3">
        <div className="flex shrink-0 -space-x-4">
          {couple.slice(0, 2).map((p) => (
            <Avatar key={p.id} person={p} size="lg" className="ring-2 ring-cream" />
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {dateLine}
          <Link
            href={`/household/${household.id}`}
            className="-my-1 mt-0.5 block truncate py-1 font-serif text-base font-semibold"
          >
            {household.familyName}
          </Link>
          {years !== null && (
            <p className="text-sm text-ink-soft">{years} years married</p>
          )}
        </div>

        {contact && (
          <WhatsAppButton
            phone={contact}
            message={anniversaryMessage(household)}
            label={`Wish ${household.familyName} on WhatsApp`}
          />
        )}
      </div>
    </article>
  );
}
