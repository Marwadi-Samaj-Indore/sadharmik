"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { ICON } from "@/lib/icons";
import { AvatarLite } from "./Avatar";
import { CategoryIcon } from "./CategoryIcon";
import { matchesQuery } from "@/lib/util";

export interface CategoryTile {
  name: string;
  slug: string;
  count: number;
  /** 0 = a trade, 1 = an occupation status, 2 = the "Other" catch-all */
  rank: 0 | 1 | 2;
}

export interface BusinessRow {
  personId: string;
  name: string;
  avatarLabel: string;
  photo: string | null;
  businessName: string;
  category: string;
  categorySlug: string;
  description: string;
  area: string;
  searchBlob: string;
}

export function BusinessBrowser({
  categories,
  listings,
}: {
  categories: CategoryTile[];
  listings: BusinessRow[];
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return listings.filter((l) => matchesQuery(l.searchBlob, query));
  }, [listings, query]);

  const filled = categories.filter((c) => c.count > 0);
  // Trades a member could hire, kept separate from occupation statuses
  const emptyTrades = categories.filter((c) => c.count === 0 && c.rank === 0);
  const emptyOther = categories.filter((c) => c.count === 0 && c.rank > 0);
  const searching = query.trim().length > 0;

  return (
    <>
      <div className="px-4">
        <div className="relative">
          <Search
            size={ICON.sm}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <label htmlFor="biz-search" className="sr-only">
            Search products and services
          </label>
          <input
            id="biz-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Plywood, audit, packaging…"
            className="field rounded-chip border-line bg-surface pl-10"
          />
        </div>
      </div>

      {searching ? (
        <section className="mt-4">
          <p className="px-4 text-xs font-medium text-ink-soft">
            <span className="tnum">{results.length}</span>{" "}
            {results.length === 1 ? "member matches" : "members match"} “{query}”
          </p>
          {results.length === 0 ? (
            <div className="card-mist mx-4 mt-3 px-5 py-8 text-center">
              <p className="font-display font-semibold">No match yet</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                Nobody has listed that yet. As members complete their profiles this
                search will find them.
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2 px-4">
              {results.map((l) => (
                <li key={l.personId}>
                  <Link
                    href={`/person/${l.personId}`}
                    className="card card-tap flex items-center gap-3.5 p-3"
                  >
                    <AvatarLite label={l.avatarLabel} photo={l.photo} size="row" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-bold">
                        {l.businessName || l.name}
                      </p>
                      <p className="truncate text-xs text-ink-soft">
                        {[l.name, l.category, l.area].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          {filled.length > 0 && (
            <section className="mt-5">
              <h2 className="section-title px-4 pb-2">Categories in our group</h2>
              <ul className="grid grid-cols-2 gap-2 px-4">
                {filled.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/business/${c.slug}`}
                      className="card-fill card-tap flex h-full flex-col justify-between gap-3 p-3.5"
                    >
                      <CategoryIcon category={c.name} size={ICON.lg} className="text-kesar-ink" />
                      <div>
                        <p className="font-display text-caption font-bold leading-snug">
                          {c.name}
                        </p>
                        <p className="tnum mt-0.5 text-xs font-semibold text-kesar-ink/70">
                          {c.count} {c.count === 1 ? "member" : "members"}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {emptyTrades.length > 0 && (
            <section className="mt-6">
              <h2 className="section-title px-4 pb-2">
                {filled.length > 0 ? "Nobody listed yet" : "All categories"}
              </h2>
              <p className="px-4 pb-3 text-xs leading-relaxed text-ink-soft">
                {filled.length > 0
                  ? "These categories are waiting for their first member."
                  : "Nobody has added their business yet — the Excel file had no business data. Add yours from the Me tab and it will appear here straight away."}
              </p>
              <ul className="grid grid-cols-2 gap-2 px-4">
                {emptyTrades.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/business/${c.slug}`}
                      className="card card-tap flex h-full items-start gap-2.5 p-3"
                    >
                      <CategoryIcon
                        category={c.name}
                        size={ICON.sm}
                        className="mt-0.5 shrink-0 text-ink-faint"
                      />
                      <span className="text-caption font-medium leading-snug text-ink-soft">
                        {c.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Occupation statuses and the catch-all, grouped away from the trades */}
          {emptyOther.length > 0 && (
            <section className="mt-6">
              <h2 className="section-title px-4 pb-2">Not a business</h2>
              <p className="px-4 pb-3 text-xs leading-relaxed text-ink-soft">
                For members who aren&apos;t running a business.
              </p>
              <ul className="grid grid-cols-2 gap-2 px-4">
                {emptyOther.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/business/${c.slug}`}
                      className="card-mist flex h-full items-start gap-2 p-3"
                    >
                      <span className="text-caption font-medium leading-snug text-ink-soft">
                        {c.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
