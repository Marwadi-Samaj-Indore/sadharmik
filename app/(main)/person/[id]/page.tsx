import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Phone,
  MessageCircle,
  Mail,
  Cake,
  Droplet,
  GraduationCap,
  MapPin,
  Globe,
  Instagram,
  Pencil,
  IdCard,
} from "lucide-react";
import { getDb } from "@/lib/db";
import { canEdit, getSession } from "@/lib/session";
import { Avatar } from "@/components/Avatar";
import { FlipLink, FlipTarget } from "@/components/Flip";
import { BackBar, DetailRow, Badge, SectionHeading } from "@/components/ui";
import { categorySlug } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ICON } from "@/lib/icons";
import {
  ageFrom,
  displayPhone,
  formatDate,
  formatDateLong,
  fullName,
  relationshipLabel,
  photoUrl,
  telLink,
  whatsappLink,
} from "@/lib/util";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [db, session] = await Promise.all([getDb(), getSession()]);

  const person = db.people.find((p) => p.id === id);
  if (!person) notFound();

  const household = db.households.find((h) => h.id === person.householdId);
  const relatives = db.people.filter(
    (p) => p.householdId === person.householdId && p.id !== person.id
  );

  const { privacy } = person;
  const mobile = privacy.hideMobile ? null : person.mobile;
  const whatsapp = privacy.hideWhatsapp ? null : person.whatsapp;
  const age = ageFrom(person.dob) ?? person.age;
  const editable = canEdit(session, person);
  const hasBusiness = Boolean(
    person.business.name ||
      person.business.category ||
      person.business.description ||
      person.business.visitingCard
  );

  return (
    <>
      <BackBar
        label={household?.surname || "Member"}
        href={household ? `/household/${household.id}` : "/directory"}
      />

      {/* Identity. Each fact gets its own line — running the relationship and
          the household name together made a two-line centred phrase that broke
          in the middle and read as a layout accident. The name is the one
          place the serif appears on this screen: this is the page a member
          screenshots and forwards, and the serif is what makes it read as a
          yearbook entry rather than a record. */}
      <div className="px-4 pt-7 text-center">
        {/* The destination of the directory-row transition — the tapped
            avatar grows into this one */}
        <FlipTarget flipId={`person:${person.id}`} className="mx-auto w-fit">
          <Avatar
            person={person}
            size="hero"
            className="ring-4 ring-kesar-pale"
          />
        </FlipTarget>

        <h1 className="mx-auto mt-5 max-w-[17ch] font-serif text-hero font-semibold tracking-[-0.01em]">
          {fullName(person)}
        </h1>

        <p className="mt-1.5 text-sm font-medium text-ink-soft">
          {relationshipLabel(person)}
        </p>

        {household && (
          <Link
            href={`/household/${household.id}`}
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-kesar-text underline-offset-2 hover:underline"
          >
            {household.familyName}
          </Link>
        )}

        <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
          {person.occupationType && <Badge tone="info">{person.occupationType}</Badge>}
          {age !== null && <Badge>{age} years</Badge>}
          {person.livingIn && <Badge>{person.livingIn}</Badge>}
          {/* Muted, never the alarm red — this is remembrance, not a warning */}
          {person.deceased && <Badge>Late</Badge>}
        </div>
      </div>

      {/* Primary actions */}
      {(mobile || whatsapp) && !person.deceased && (
        <div className="mt-5 grid grid-cols-2 gap-2 px-4">
          {mobile && (
            <a href={telLink(mobile)} className="btn btn-ghost">
              <Phone size={ICON.sm} />
              Call
            </a>
          )}
          {whatsapp && (
            <a
              href={whatsappLink(whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <MessageCircle size={ICON.sm} />
              WhatsApp
            </a>
          )}
        </div>
      )}

      {editable && (
        <div className="mt-2 px-4">
          <Link href={`/me/edit/${person.id}`} className="btn btn-secondary w-full">
            <Pencil size={ICON.sm} />
            Edit this profile
          </Link>
        </div>
      )}

      {/* Contact */}
      <section className="mt-6">
        <SectionHeading>Contact</SectionHeading>
        <div className="card mx-4 overflow-hidden">
          {mobile ? (
            <DetailRow
              label="Mobile"
              value={<span className="tnum">{displayPhone(mobile)}</span>}
              href={telLink(mobile)}
              icon={<Phone size={ICON.sm} />}
            />
          ) : (
            <DetailRow
              label="Mobile"
              value={
                <span className="text-ink-faint">
                  {privacy.hideMobile ? "Hidden by member" : "Not added yet"}
                </span>
              }
              icon={<Phone size={ICON.sm} />}
            />
          )}
          {whatsapp && whatsapp !== mobile && (
            <DetailRow
              label="WhatsApp"
              value={<span className="tnum">{displayPhone(whatsapp)}</span>}
              href={whatsappLink(whatsapp)}
              icon={<MessageCircle size={ICON.sm} />}
            />
          )}
          {person.email && !privacy.hideEmail && (
            <DetailRow
              label="Email"
              value={person.email}
              href={`mailto:${person.email}`}
              icon={<Mail size={ICON.sm} />}
            />
          )}
        </div>
      </section>

      {/* Personal */}
      <section className="mt-6">
        <SectionHeading>Personal</SectionHeading>
        <div className="card mx-4 overflow-hidden">
          <DetailRow
            label="Date of birth"
            value={
              person.dob ? (
                privacy.hideDobYear ? (
                  formatDate(person.dob, { year: false })
                ) : (
                  formatDateLong(person.dob)
                )
              ) : (
                <span className="text-ink-faint">Not added yet</span>
              )
            }
            icon={<Cake size={ICON.sm} />}
          />
          <DetailRow
            label="Blood group"
            value={
              person.bloodGroup || <span className="text-ink-faint">Not added yet</span>
            }
            icon={<Droplet size={ICON.sm} />}
          />
          <DetailRow
            label="Education"
            value={
              person.education || <span className="text-ink-faint">Not added yet</span>
            }
            icon={<GraduationCap size={ICON.sm} />}
          />
          <DetailRow
            label="Currently living in"
            value={
              person.livingIn || household?.city || (
                <span className="text-ink-faint">Not added yet</span>
              )
            }
            icon={<MapPin size={ICON.sm} />}
          />
          {person.maritalStatus && (
            <DetailRow label="Marital status" value={person.maritalStatus} />
          )}
        </div>
      </section>

      {/* Business */}
      <section className="mt-6">
        <SectionHeading>Business & work</SectionHeading>
        {hasBusiness ? (
          <div className="mx-4">
            <div className="card-fill p-4">
              {person.business.category && (
                <Link
                  href={`/business/${categorySlug(person.business.category)}`}
                  className="inline-flex items-center gap-1.5 rounded-chip bg-surface/70 px-2.5 py-1 text-2xs font-semibold text-kesar-ink"
                >
                  <CategoryIcon category={person.business.category} size={ICON.micro} />
                  {person.business.category}
                </Link>
              )}
              {person.business.name && (
                <h3 className="mt-2 font-display text-lg font-bold">
                  {person.business.name}
                </h3>
              )}
              {person.business.description && (
                <p className="mt-1 text-sm leading-relaxed text-kesar-ink/85">
                  {person.business.description}
                </p>
              )}
              {person.business.keywords && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {person.business.keywords
                    .split(",")
                    .map((k) => k.trim())
                    .filter(Boolean)
                    .map((k) => (
                      <span
                        key={k}
                        className="rounded-chip bg-surface/70 px-2 py-0.5 text-2xs font-medium text-kesar-ink"
                      >
                        {k}
                      </span>
                    ))}
                </div>
              )}
            </div>

            <div className="card mt-3 overflow-hidden">
              {person.business.address && (
                <DetailRow
                  label="Business address"
                  value={<span className="block max-w-[13rem]">{person.business.address}</span>}
                  icon={<MapPin size={ICON.sm} />}
                />
              )}
              {person.business.phone && (
                <DetailRow
                  label="Business phone"
                  value={<span className="tnum">{person.business.phone}</span>}
                  href={`tel:${person.business.phone}`}
                  icon={<Phone size={ICON.sm} />}
                />
              )}
              {person.business.website && (
                <DetailRow
                  label="Website"
                  value={person.business.website}
                  href={person.business.website}
                  icon={<Globe size={ICON.sm} />}
                />
              )}
              {person.business.instagram && (
                <DetailRow
                  label="Instagram"
                  value={person.business.instagram}
                  icon={<Instagram size={ICON.sm} />}
                />
              )}
            </div>

            {person.business.visitingCard && (
              <div className="mt-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                  <IdCard size={ICON.xs} />
                  Visiting card
                </p>
                {/* A card someone paid to print is an object, so it gets a
                    mat: centred on a quiet surface with a paper shadow,
                    whole — never cropped, the number is printed on it (see
                    CLAUDE.md). Opens full size so small print stays
                    readable. */}
                <a
                  href={photoUrl(person.business.visitingCard) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-mist block p-4 transition-transform active:scale-[0.985]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl(person.business.visitingCard) ?? ""}
                    alt={`Visiting card of ${fullName(person)}`}
                    loading="lazy"
                    className="mx-auto max-h-64 w-auto rounded-[6px] shadow-[var(--shadow-raised)]"
                  />
                  <span className="mt-3 block text-center text-2xs font-medium text-ink-faint">
                    Tap to open full size
                  </span>
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="card-mist mx-4 px-4 py-5 text-center">
            <p className="text-sm font-semibold">No business details yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-ink-soft">
              {editable
                ? "Add what you do so other members can find you when they need it."
                : "This member hasn't added their business information yet."}
            </p>
            {editable && (
              <Link href={`/me/edit/${person.id}`} className="btn btn-primary mt-3">
                Add business details
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Family — a row of faces with names beneath, the way a family sits
          in a photograph, not the way it joins in a database. Tapping a face
          flies it into that person's own hero. */}
      {relatives.length > 0 && household && (
        <section className="mt-6">
          <SectionHeading
            action={
              <Link
                href={`/household/${household.id}`}
                className="text-xs font-semibold text-kesar-text"
              >
                View household
              </Link>
            }
          >
            Family
          </SectionHeading>
          <ul className="rail px-4 pb-1 pt-1">
            {relatives.map((p) => (
              <li key={p.id} className="shrink-0">
                <FlipLink
                  flipId={`person:${p.id}`}
                  href={`/person/${p.id}`}
                  className="flex w-[4.75rem] flex-col items-center gap-1.5 rounded-inner py-1.5 text-center transition-transform active:scale-95"
                >
                  <Avatar person={p} size="lg" />
                  <span className="w-full">
                    <span className="block truncate text-xs font-semibold">
                      {p.firstName}
                    </span>
                    <span className="block truncate text-2xs leading-snug text-ink-faint">
                      {/* The full "Head of household" overflows a face-width
                          tile; one word carries the same meaning here */}
                      {relationshipLabel(p).replace("Head of household", "Head")}
                    </span>
                  </span>
                </FlipLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
