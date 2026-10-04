import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, MessageCircle } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Avatar } from "@/components/Avatar";
import { BackBar, EmptyState, Badge } from "@/components/ui";
import { categoryFromSlug } from "@/lib/categories";
import { fullName, telLink, whatsappLink } from "@/lib/util";
import { ICON } from "@/lib/icons";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) notFound();

  const [db, session] = await Promise.all([getDb(), getSession()]);
  const householdById = new Map(db.households.map((h) => [h.id, h]));

  const members = db.people.filter(
    (p) => !p.deceased && p.business.category === category
  );

  return (
    <>
      <BackBar label={category} href="/business" />

      <div className="px-4 pt-5">
        <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-kesar-pale text-kesar-ink">
          <CategoryIcon category={category} size={ICON.lg} />
        </span>
        <h1 className="text-title">{category}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          <span className="tnum">{members.length}</span>{" "}
          {members.length === 1 ? "member" : "members"} in the samaj
        </p>
      </div>

      {members.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="Nobody listed here yet"
            body={`No member has added "${category}" to their profile. If this is what you do, add it and members looking for it will find you.`}
            action={
              session.person ? (
                <Link
                  href={`/me/edit/${session.person.id}?from=business`}
                  className="btn btn-primary"
                >
                  Add my business
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-2 px-4">
          {members.map((p) => {
            const household = householdById.get(p.householdId);
            const phone = p.business.phone || (p.privacy.hideMobile ? null : p.mobile);
            const wa = p.privacy.hideWhatsapp ? null : p.whatsapp;

            return (
              <li key={p.id} className="card p-3.5">
                <Link href={`/person/${p.id}`} className="flex items-center gap-3">
                  <Avatar person={p} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-bold">
                      {p.business.name || fullName(p)}
                    </p>
                    <p className="truncate text-xs text-ink-soft">
                      {[fullName(p), household?.area].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </Link>

                {p.business.description && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                    {p.business.description}
                  </p>
                )}

                {p.business.keywords && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.business.keywords
                      .split(",")
                      .map((k) => k.trim())
                      .filter(Boolean)
                      .slice(0, 4)
                      .map((k) => (
                        <Badge key={k}>{k}</Badge>
                      ))}
                  </div>
                )}

                {(phone || wa) && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {phone && (
                      <a href={telLink(phone)} className="btn btn-ghost">
                        <Phone size={ICON.sm} />
                        Call
                      </a>
                    )}
                    {wa && (
                      <a
                        href={whatsappLink(
                          wa,
                          `Jai Jinendra ${p.firstName}, I found you in the Sadharmik directory under ${category}.`
                        )}
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
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
