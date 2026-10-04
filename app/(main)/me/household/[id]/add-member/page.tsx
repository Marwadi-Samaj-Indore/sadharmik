import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { addFamilyMember } from "@/app/actions/data";
import { BackBar } from "@/components/ui";
import { SaveBar } from "@/components/SaveBar";
import { resolveReturnTo, returnLabel } from "@/lib/nav";

export default async function AddFamilyMemberPage({
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

  const returnTo = resolveReturnTo(from ?? "me", { householdId: household.id });

  return (
    <>
      <BackBar label={returnLabel(from) ?? "Back to Me"} href={returnTo} />

      <form action={addFamilyMember.bind(null, household.id)} className="px-4 pt-5">
        <input type="hidden" name="returnTo" value={returnTo} />
        <h1 className="text-title">Add a family member</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Add anyone in {household.familyName} who isn&apos;t listed yet — a child,
          parent, or other relative living with you. You can fill in the rest of their
          profile afterwards.
        </p>

        <fieldset className="mt-6">
          <legend className="section-title mb-3">Name</legend>
          <div className="space-y-4">
            <div>
              <label htmlFor="firstName" className="label">
                First name *
              </label>
              <input id="firstName" name="firstName" required className="field" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="middleName" className="label">
                  Middle name
                </label>
                <input id="middleName" name="middleName" className="field" />
              </div>
              <div>
                <label htmlFor="lastName" className="label">
                  Surname *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  required
                  defaultValue={household.surname}
                  className="field"
                />
              </div>
            </div>
            <div>
              <label htmlFor="gender" className="label">
                Gender
              </label>
              <select id="gender" name="gender" defaultValue="" className="field">
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <legend className="section-title mb-3">Relationship</legend>
          <div className="space-y-4">
            <div>
              <label htmlFor="relationship" className="label">
                This person is my household&apos;s
              </label>
              <select
                id="relationship"
                name="relationship"
                defaultValue="son"
                className="field"
              >
                <option value="son">Son</option>
                <option value="daughter">Daughter</option>
                <option value="father">Father</option>
                <option value="mother">Mother</option>
              </select>
            </div>
            <div>
              <label htmlFor="dob" className="label">
                Date of birth
              </label>
              <input
                id="dob"
                name="dob"
                type="date"
                max="2026-12-31"
                min="1900-01-01"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="mobile" className="label">
                Mobile number
              </label>
              <input
                id="mobile"
                name="mobile"
                type="tel"
                inputMode="numeric"
                maxLength={14}
                placeholder="Only if they have their own"
                className="field tnum"
              />
            </div>
          </div>
        </fieldset>

        <SaveBar cancelHref={returnTo} label="Add to household" />
      </form>
    </>
  );
}
