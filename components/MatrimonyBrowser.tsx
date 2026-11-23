"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { AvatarLite } from "./Avatar";
import { Badge, EmptyState } from "./ui";
import { matchesQuery } from "@/lib/util";
import { ICON } from "@/lib/icons";

/** Only what the list shows or filters on — nothing private travels. */
export interface MatchRow {
  id: string;
  name: string;
  avatarLabel: string;
  photo: string | null;
  age: number;
  education: string;
  occupation: string;
  area: string;
  gotra: string;
  nativePlace: string;
  /** "" means Indore; otherwise the city they live in now */
  livingIn: string;
  bloodGroup: string;
  extra: string;
}

const uniq = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

/**
 * The matrimony list with the filters families actually ask about: age,
 * gotra (above all — a match within one's own gotra is avoided, so "not my
 * gotra" is on by default when we know the viewer's), where they live now,
 * native place, area, occupation and blood group. Search covers name,
 * education and business.
 *
 * Filtering happens on the phone: the list is a few dozen people, so every
 * change answers instantly and nothing extra is fetched.
 */
export function MatrimonyBrowser({
  rows,
  noun,
  minAge,
  myGotra,
  from,
}: {
  rows: MatchRow[];
  noun: string;
  minAge: number;
  myGotra: string;
  /** Tells the profile page where Back should return to */
  from: "matrimony-boy" | "matrimony-girl";
}) {
  const ages = rows.map((r) => r.age);
  const lowest = Math.min(minAge, ...ages);
  const highest = Math.max(lowest, ...ages);

  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [ageFrom, setAgeFrom] = useState(lowest);
  const [ageTo, setAgeTo] = useState(highest);
  const [excludeMyGotra, setExcludeMyGotra] = useState(Boolean(myGotra));
  const [gotra, setGotra] = useState("");
  const [living, setLiving] = useState<"" | "indore" | "outside">("");
  const [native, setNative] = useState("");
  const [area, setArea] = useState("");
  const [occupation, setOccupation] = useState("");
  const [blood, setBlood] = useState("");

  // Opening a profile and coming Back redraws this list, so the filters are
  // kept for the session (per boy/girl list) and put back on return. The save
  // skips the render the restore happens in: that render still holds the blank
  // defaults, and saving them would wipe what is about to be put back.
  const storageKey = `matrimony-filters:${from}`;
  const skipSave = useRef(true);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      if (saved) {
        setQuery(saved.query ?? "");
        setShowFilters(Boolean(saved.showFilters));
        setAgeFrom(Math.max(lowest, Math.min(highest, saved.ageFrom ?? lowest)));
        setAgeTo(Math.max(lowest, Math.min(highest, saved.ageTo ?? highest)));
        setExcludeMyGotra(Boolean(saved.excludeMyGotra));
        setGotra(saved.gotra ?? "");
        setLiving(saved.living ?? "");
        setNative(saved.native ?? "");
        setArea(saved.area ?? "");
        setOccupation(saved.occupation ?? "");
        setBlood(saved.blood ?? "");
      }
    } catch {
      // Private browsing can refuse storage; the list simply starts fresh
    }
    skipSave.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ query, showFilters, ageFrom, ageTo, excludeMyGotra, gotra, living, native, area, occupation, blood })
      );
    } catch {}
  }, [storageKey, query, showFilters, ageFrom, ageTo, excludeMyGotra, gotra, living, native, area, occupation, blood]);

  const options = useMemo(
    () => ({
      gotras: uniq(rows.map((r) => r.gotra)),
      natives: uniq(rows.map((r) => r.nativePlace)),
      areas: uniq(rows.map((r) => r.area)),
      occupations: uniq(rows.map((r) => r.occupation)),
      bloods: uniq(rows.map((r) => r.bloodGroup)),
    }),
    [rows]
  );

  const ageSteps = useMemo(
    () => Array.from({ length: highest - lowest + 1 }, (_, i) => lowest + i),
    [lowest, highest]
  );

  const activeFilters = [
    ageFrom !== lowest || ageTo !== highest,
    excludeMyGotra,
    gotra,
    living,
    native,
    area,
    occupation,
    blood,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setAgeFrom(lowest);
    setAgeTo(highest);
    setExcludeMyGotra(false);
    setGotra("");
    setLiving("");
    setNative("");
    setArea("");
    setOccupation("");
    setBlood("");
  };

  const visible = rows.filter(
    (r) =>
      r.age >= ageFrom &&
      r.age <= ageTo &&
      !(excludeMyGotra && myGotra && r.gotra.toLowerCase() === myGotra.toLowerCase()) &&
      (!gotra || r.gotra === gotra) &&
      (!living ||
        (living === "indore" ? !r.livingIn || /indore/i.test(r.livingIn) : r.livingIn && !/indore/i.test(r.livingIn))) &&
      (!native || r.nativePlace === native) &&
      (!area || r.area === area) &&
      (!occupation || r.occupation === occupation) &&
      (!blood || r.bloodGroup === blood) &&
      (!query ||
        matchesQuery(
          [r.name, r.education, r.area, r.gotra, r.nativePlace, r.livingIn, r.extra].join(" "),
          query
        ))
  );

  const select = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    values: string[],
    any = "Any"
  ) => (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="field">
        <option value="">{any}</option>
        {values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <div className="px-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={ICON.sm}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <label htmlFor="m-search" className="sr-only">
              Search
            </label>
            <input
              id="m-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, education, business…"
              className="field rounded-chip pl-10"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-label={`Filters${activeFilters ? `, ${activeFilters} on` : ""}`}
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-chip border transition-colors ${
              activeFilters > 0 ? "border-ink bg-ink text-cream" : "border-line bg-surface text-ink"
            }`}
          >
            <SlidersHorizontal size={ICON.md} />
            {activeFilters > 0 && (
              <span className="tnum absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sun px-1 text-[0.625rem] font-bold text-[#15313b]">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="card mt-3 space-y-3 p-3.5">
            <div>
              <span className="label">Age</span>
              <div className="flex items-center gap-2">
                <label htmlFor="m-age-from" className="sr-only">
                  From age
                </label>
                <select
                  id="m-age-from"
                  value={ageFrom}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setAgeFrom(v);
                    if (v > ageTo) setAgeTo(v);
                  }}
                  className="field"
                >
                  {ageSteps.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-ink-soft">to</span>
                <label htmlFor="m-age-to" className="sr-only">
                  To age
                </label>
                <select
                  id="m-age-to"
                  value={ageTo}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setAgeTo(v);
                    if (v < ageFrom) setAgeFrom(v);
                  }}
                  className="field"
                >
                  {ageSteps.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {myGotra && (
              <label className="flex min-h-[2.75rem] cursor-pointer items-center gap-3 rounded-inner bg-sand px-3.5 py-2">
                <input
                  type="checkbox"
                  checked={excludeMyGotra}
                  onChange={(e) => setExcludeMyGotra(e.target.checked)}
                  className="h-5 w-5 accent-[var(--color-leaf)]"
                />
                <span className="text-sm">
                  Hide my own gotra <span className="text-ink-soft">({myGotra})</span>
                </span>
              </label>
            )}

            {select("m-gotra", "Gotra", gotra, setGotra, options.gotras)}

            <div>
              <span className="label">Lives in</span>
              <div className="grid grid-cols-3 gap-1 rounded-chip border border-line bg-sand p-1">
                {(
                  [
                    ["", "Anywhere"],
                    ["indore", "Indore"],
                    ["outside", "Outside"],
                  ] as const
                ).map(([value, text]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={living === value}
                    onClick={() => setLiving(value)}
                    className={`min-h-[2.5rem] rounded-chip text-sm font-semibold transition-colors ${
                      living === value ? "chip-active" : "text-ink-soft"
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>

            {options.natives.length > 0 &&
              select("m-native", "Native place", native, setNative, options.natives)}
            {options.areas.length > 0 && select("m-area", "Area / colony", area, setArea, options.areas)}
            {options.occupations.length > 0 &&
              select("m-occ", "Occupation", occupation, setOccupation, options.occupations)}
            {options.bloods.length > 0 &&
              select("m-blood", "Blood group", blood, setBlood, options.bloods)}

            {activeFilters > 0 && (
              <button type="button" onClick={clearFilters} className="btn btn-ghost w-full">
                <X size={ICON.sm} />
                Clear filters
              </button>
            )}
          </div>
        )}

        <p aria-live="polite" className="mt-3 text-sm text-ink-soft">
          <span className="tnum font-semibold text-ink">{visible.length}</span>
          {visible.length === rows.length ? "" : ` of ${rows.length}`} unmarried {noun}, youngest
          first
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={rows.length ? "No one matches these filters" : "Nobody listed yet"}
            body={
              rows.length
                ? "Try a wider age range or clear a filter."
                : "Members appear here once their profile says Single, with a gender and an age or date of birth."
            }
            action={
              rows.length && activeFilters ? (
                <button type="button" onClick={clearFilters} className="btn btn-ghost">
                  Clear filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="mx-4 mt-3 space-y-2">
          {visible.map((r) => (
            <li key={r.id}>
              <Link href={`/person/${r.id}?from=${from}`} className="card card-tap flex items-center gap-3 p-3">
                <AvatarLite label={r.avatarLabel} photo={r.photo} size="row" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-base font-semibold">{r.name}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {[`${r.age} yrs`, r.education, r.livingIn || r.area].filter(Boolean).join(" · ")}
                  </p>
                  {(r.gotra || r.nativePlace) && (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {r.gotra && <Badge tone="warn">{r.gotra}</Badge>}
                      {r.nativePlace && <Badge>{r.nativePlace}</Badge>}
                    </span>
                  )}
                </div>
                <ChevronRight size={ICON.md} className="shrink-0 text-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
