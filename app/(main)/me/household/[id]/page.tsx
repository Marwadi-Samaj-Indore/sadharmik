import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { updateHousehold } from "@/app/actions/data";
import { BackBar } from "@/components/ui";
import { SaveBar } from "@/components/SaveBar";
import { resolveReturnTo, returnLabel } from "@/lib/nav";

export default async function EditHouseholdPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const [db, session] = await Promise.all([getDb(), getSession()]);

  const household = db.households.find((h) => h.id === id);
  if (!household) notFound();
  if (!session.isAdmin && session.person?.householdId !== household.id) {
    redirect(`/household/${household.id}`);
  }

  const areas = [...new Set(db.households.map((h) => h.area).filter(Boolean))].sort();

  // Defaults to the household page; returns to Me or the admin queue when
  // opened from there
  const returnTo = resolveReturnTo(from ?? "household", {
    householdId: household.id,
  });

  return (
    <>
      <BackBar label={returnLabel(from) ?? "Edit household"} href={returnTo} />

      <form
        action={updateHousehold.bind(null, household.id)}
        className="px-4 pt-5"
      >
        <input type="hidden" name="returnTo" value={returnTo} />
        <h1 className="text-title">{household.familyName}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Details shared by everyone in this household.
        </p>

        <fieldset className="mt-6">
          <legend className="section-title mb-3">Home address</legend>
          <div className="space-y-4">
            <div>
              <label htmlFor="address" className="label">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                rows={3}
                defaultValue={household.address}
                className="field resize-none"
              />
            </div>
            <div>
              <label htmlFor="area" className="label">
                Area / colony
              </label>
              <input
                id="area"
                name="area"
                list="household-areas"
                defaultValue={household.area}
                placeholder="Vijay Nagar"
                className="field"
              />
              <datalist id="household-areas">
                {areas.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
              <p className="mt-1 text-2xs text-ink-faint">
                Members filter the directory by area, so this one is worth filling in.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="city" className="label">
                  City
                </label>
                <input
                  id="city"
                  name="city"
                  defaultValue={household.city}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="pincode" className="label">
                  Pincode
                </label>
                <input
                  id="pincode"
                  name="pincode"
                  inputMode="numeric"
                  maxLength={6}
                  defaultValue={household.pincode}
                  className="field tnum"
                />
              </div>
            </div>
            <div>
              <label htmlFor="mapsUrl" className="label">
                Google Maps link
              </label>
              <input
                id="mapsUrl"
                name="mapsUrl"
                type="url"
                defaultValue={household.mapsUrl}
                placeholder="https://maps.app.goo.gl/…"
                className="field"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <legend className="section-title mb-3">Family</legend>
          <div className="space-y-4">
            <div>
              <label htmlFor="anniversary" className="label">
                Wedding anniversary
              </label>
              <input
                id="anniversary"
                name="anniversary"
                type="date"
                defaultValue={household.anniversary ?? ""}
                max="2026-12-31"
                min="1940-01-01"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="gotra" className="label">
                Gotra / sub-community
              </label>
              <input
                id="gotra"
                name="gotra"
                defaultValue={household.gotra}
                placeholder="Shrimal, Porwal, Oswal…"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="nativePlace" className="label">
                Native place (mool gaam)
              </label>
              <input
                id="nativePlace"
                name="nativePlace"
                defaultValue={household.nativePlace}
                className="field"
              />
            </div>
          </div>
        </fieldset>

        <SaveBar cancelHref={returnTo} label="Save household" />
      </form>
    </>
  );
}
