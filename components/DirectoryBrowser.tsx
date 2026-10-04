"use client";

import { useMemo, useState } from "react";
import { Fragment } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { AvatarLite } from "./Avatar";
import { FlipLink } from "./Flip";
import { matchesQuery } from "@/lib/util";
import { ICON } from "@/lib/icons";

/**
 * Rows carry only what is displayed, plus `extra` — searchable text that is
 * NOT on screen (member names inside a household, business keywords, phone
 * numbers).
 *
 * Previously each row also carried a pre-built search string that repeated the
 * name, area and gotra already present, which pushed /directory to 237KB of
 * HTML. Composing the haystack on the client from fields we already send
 * removes that duplication.
 */
export interface HouseholdRow {
  id: string;
  familyName: string;
  surname: string;
  gotra: string;
  area: string;
  memberCount: number;
  headLabel: string;
  headPhoto: string | null;
  extra: string;
}

export interface PersonRow {
  id: string;
  householdId: string;
  name: string;
  label: string;
  area: string;
  avatarLabel: string;
  photo: string | null;
  bloodGroup: string;
  extra: string;
}

export function DirectoryBrowser({
  households,
  people,
  areas,
  gotras,
  bloodGroups,
}: {
  households: HouseholdRow[];
  people: PersonRow[];
  areas: string[];
  gotras: string[];
  bloodGroups: string[];
}) {
  const [mode, setMode] = useState<"households" | "people">("households");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [area, setArea] = useState("");
  const [gotra, setGotra] = useState("");
  const [blood, setBlood] = useState("");

  const activeFilters = [area, gotra, blood].filter(Boolean).length;
  /** Browsing = no query, no filters — the state that gets letter landmarks */
  const browsing = !query.trim() && activeFilters === 0;

  const visibleHouseholds = useMemo(
    () =>
      households
        .filter(
          (h) =>
            (!area || h.area === area) &&
            (!gotra || h.gotra === gotra) &&
            matchesQuery(
              `${h.familyName} ${h.surname} ${h.gotra} ${h.area} ${h.extra}`,
              query
            )
        )
        // Database order isn't guaranteed alphabetical, and the letter
        // headers depend on it
        .sort((a, b) => a.familyName.localeCompare(b.familyName)),
    [households, query, area, gotra]
  );

  const visiblePeople = useMemo(
    () =>
      people.filter(
        (p) =>
          (!area || p.area === area) &&
          (!blood || p.bloodGroup === blood) &&
          matchesQuery(`${p.name} ${p.label} ${p.area} ${p.extra}`, query)
      ),
    [people, query, area, blood]
  );

  const count = mode === "households" ? visibleHouseholds.length : visiblePeople.length;

  /**
   * Search is spelling-tolerant by design — "Sanghavi" finds "Sanghvi".
   * When that forgiveness is what produced the results, say so: a member who
   * typed a near-miss and sees names that don't literally contain it will
   * otherwise read the result as a bug, not a kindness.
   */
  const hasFuzzyMatches = useMemo(() => {
    const raw = query.trim().toLowerCase();
    if (!raw) return false;
    const terms = raw.split(/\s+/);
    const literal = (hay: string) => {
      const h = hay.toLowerCase();
      return terms.every((t) => h.includes(t));
    };
    return mode === "households"
      ? visibleHouseholds.some(
          (h) => !literal(`${h.familyName} ${h.surname} ${h.gotra} ${h.area} ${h.extra}`)
        )
      : visiblePeople.some((p) => !literal(`${p.name} ${p.label} ${p.area} ${p.extra}`));
  }, [query, mode, visibleHouseholds, visiblePeople]);

  const clearFilters = () => {
    setArea("");
    setGotra("");
    setBlood("");
  };

  return (
    <>
      {/* Search */}
      <div className="px-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={ICON.sm}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <label htmlFor="dir-search" className="sr-only">
              Search members
            </label>
            <input
              id="dir-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, business, area…"
              className="field rounded-chip border-line bg-surface pl-10"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-label="Filters"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-chip border transition-colors ${
              activeFilters > 0
                ? "border-kesar-deep bg-kesar-deep text-white"
                : "border-line bg-surface text-ink"
            }`}
          >
            <SlidersHorizontal size={ICON.md} />
          </button>
        </div>

        {/* Households / People. One control split in two halves, not two
            chips — chips read as filters that can both be off, and this
            choice is never off. The filled half is the mode you're in. */}
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-chip border border-line bg-surface p-1">
          {(["households", "people"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-chip text-sm font-semibold transition-colors ${
                mode === m ? "chip-active" : "text-ink-soft"
              }`}
            >
              {m === "households" ? "Households" : "People"}
              {/* Result counts, not totals — with a query typed, "People 3"
                  is the single most useful thing the other segment can say */}
              <span className="tnum text-xs opacity-70">
                {m === "households" ? visibleHouseholds.length : visiblePeople.length}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="card mt-3 space-y-3 p-3.5">
            <div>
              <label htmlFor="f-area" className="label">
                Area / colony
              </label>
              <select
                id="f-area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="field"
              >
                <option value="">All areas</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {mode === "households" ? (
              <div>
                <label htmlFor="f-gotra" className="label">
                  Gotra
                </label>
                <select
                  id="f-gotra"
                  value={gotra}
                  onChange={(e) => setGotra(e.target.value)}
                  className="field"
                >
                  <option value="">All</option>
                  {gotras.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="f-blood" className="label">
                  Blood group
                </label>
                <select
                  id="f-blood"
                  value={blood}
                  onChange={(e) => setBlood(e.target.value)}
                  className="field"
                >
                  <option value="">All</option>
                  {bloodGroups.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeFilters > 0 && (
              <button type="button" onClick={clearFilters} className="btn btn-ghost w-full">
                <X size={ICON.sm} />
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Announced as the member types, so a screen-reader user hears the
            result count change instead of searching in silence */}
        {/* Only while narrowing — when browsing it would repeat the segment
            counts a third time. Screen readers still hear results change. */}
        {!browsing && (
          <p className="mt-3 text-xs font-medium text-ink-soft" role="status" aria-live="polite">
            <span className="tnum">{count}</span>{" "}
            {mode === "households"
              ? count === 1
                ? "household"
                : "households"
              : count === 1
                ? "member"
                : "members"}
            {hasFuzzyMatches && count > 0 && (
              <span className="text-ink-faint"> · includes close spellings</span>
            )}
          </p>
        )}
      </div>

      {/* Results */}
      {count === 0 ? (
        <div className="card-mist mx-4 mt-4 px-5 py-8 text-center">
          <p className="font-display font-semibold">Nothing found</p>
          <p className="mt-1 text-sm text-ink-soft">
            Try a shorter spelling, or clear the filters.
          </p>
        </div>
      ) : mode === "households" ? (
        <GroupedList
          items={visibleHouseholds}
          grouped={browsing}
          letterOf={(h) => h.familyName}
          render={(h) => (
            <FlipLink
              flipId={`household:${h.id}`}
              href={`/household/${h.id}`}
              className="card card-tap flex items-center gap-3.5 p-3"
            >
              <AvatarLite label={h.headLabel} photo={h.headPhoto} size="row" />
              <div className="min-w-0 flex-1">
                {/* Two lines rather than an ellipsis — a member's own name
                    should never be truncated */}
                <p className="line-clamp-2 font-display text-base font-bold leading-snug">
                  {h.familyName}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-soft">
                  {[h.area, h.gotra].filter(Boolean).join(" · ") || "Indore"}
                  {" · "}
                  {h.memberCount} {h.memberCount === 1 ? "member" : "members"}
                </p>
              </div>
            </FlipLink>
          )}
        />
      ) : (
        <GroupedList
          items={visiblePeople}
          grouped={browsing}
          letterOf={(p) => p.name}
          render={(p) => (
            <FlipLink
              flipId={`person:${p.id}`}
              href={`/person/${p.id}`}
              className="card card-tap flex items-center gap-3.5 p-3"
            >
              <AvatarLite label={p.avatarLabel} photo={p.photo} size="row" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-display text-base font-bold leading-snug">
                  {p.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-soft">
                  {[p.label, p.area].filter(Boolean).join(" · ")}
                </p>
              </div>
            </FlipLink>
          )}
        />
      )}
    </>
  );
}

/**
 * The alphabet as landmarks. Flicking through 452 people needs something to
 * anchor the eye mid-scroll, so browsing mode gets sticky single-letter
 * headers — the thumb-index of a printed directory. They disappear the
 * moment a search or filter narrows the list, because a ranked handful of
 * results grouped under scattered letters reads as noise.
 */
function GroupedList<T extends { id: string }>({
  items,
  grouped,
  letterOf,
  render,
}: {
  items: T[];
  grouped: boolean;
  letterOf: (item: T) => string;
  render: (item: T) => React.ReactNode;
}) {
  if (!grouped) {
    return (
      <ul className="mt-3 space-y-2 px-4">
        {items.map((item) => (
          <li key={item.id}>{render(item)}</li>
        ))}
      </ul>
    );
  }

  const groups: { letter: string; items: T[] }[] = [];
  for (const item of items) {
    const first = (letterOf(item).charAt(0) || "#").toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : "#";
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) last.items.push(item);
    else groups.push({ letter, items: [item] });
  }

  return (
    <div className="mt-1">
      {groups.map((group) => (
        <Fragment key={group.letter}>
          {/* Opaque ground so rows slide beneath, not through */}
          <div className="sticky top-0 z-20 bg-cream px-5 pb-1 pt-3">
            <span className="font-serif text-sm font-semibold text-ink-faint">
              {group.letter}
            </span>
          </div>
          <ul className="space-y-2 px-4">
            {group.items.map((item) => (
              <li key={item.id}>{render(item)}</li>
            ))}
          </ul>
        </Fragment>
      ))}
    </div>
  );
}
