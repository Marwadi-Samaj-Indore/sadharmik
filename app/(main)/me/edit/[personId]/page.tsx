import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { canEdit, getSession } from "@/lib/session";
import { updatePerson } from "@/app/actions/data";
import { BackBar } from "@/components/ui";
import { PhotoPicker, VisitingCardPicker } from "@/components/PhotoPicker";
import { SaveBar } from "@/components/SaveBar";
import { BUSINESS_CATEGORIES, OCCUPATION_TYPES, BLOOD_GROUPS } from "@/lib/categories";
import { resolveReturnTo, returnLabel } from "@/lib/nav";
import { fullName, initials, photoUrl, relationshipLabel } from "@/lib/util";

export default async function EditPersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ personId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ personId }, { from }] = await Promise.all([params, searchParams]);
  const [db, session] = await Promise.all([getDb(), getSession()]);

  const person = db.people.find((p) => p.id === personId);
  if (!person) notFound();
  if (!canEdit(session, person)) redirect(`/person/${person.id}`);

  const household = db.households.find((h) => h.id === person.householdId);
  const isHead = household?.headPersonId === person.id;

  // Back, Cancel and Save all return to wherever this screen was opened from
  const returnTo = resolveReturnTo(from, {
    personId: person.id,
    householdId: person.householdId,
  });

  return (
    <>
      <BackBar
        label={returnLabel(from) ?? `Edit ${person.firstName}`}
        href={returnTo}
      />

      <form action={updatePerson.bind(null, person.id)} className="px-4 pt-5">
        <input type="hidden" name="returnTo" value={returnTo} />
        <h1 className="text-title">{fullName(person)}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {relationshipLabel(person)}
          {household ? ` · ${household.familyName}` : ""}
        </p>

        <div className="mt-5">
          <PhotoPicker
            initialPhoto={person.photo}
            label={initials(person)}
            required={isHead}
          />
        </div>

        {/* ---------------------------------------------------------- name */}
        <fieldset className="mt-6">
          <legend className="section-title mb-3">Name</legend>
          <div className="space-y-4">
            <div>
              <label htmlFor="firstName" className="label">
                First name *
              </label>
              <input
                id="firstName"
                name="firstName"
                required
                defaultValue={person.firstName}
                className="field"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="middleName" className="label">
                  Middle name
                </label>
                <input
                  id="middleName"
                  name="middleName"
                  defaultValue={person.middleName}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="label">
                  Surname *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  required
                  defaultValue={person.lastName}
                  className="field"
                />
              </div>
            </div>
            <div>
              <label htmlFor="gender" className="label">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                defaultValue={person.gender}
                className="field"
              >
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* ------------------------------------------------------- contact */}
        <fieldset className="mt-7">
          <legend className="section-title mb-3">Contact</legend>
          <div className="space-y-4">
            <div>
              <label htmlFor="mobile" className="label">
                Mobile number
              </label>
              <input
                id="mobile"
                name="mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={14}
                defaultValue={person.mobile ?? ""}
                placeholder="98765 43210"
                className="field tnum"
              />
            </div>
            <div>
              <label htmlFor="whatsapp" className="label">
                WhatsApp number
              </label>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                inputMode="numeric"
                maxLength={14}
                defaultValue={person.whatsapp ?? ""}
                placeholder="Same as mobile if left blank"
                className="field tnum"
              />
              <p className="mt-1 text-2xs text-ink-faint">
                Leave blank if it is the same as your mobile number.
              </p>
            </div>
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={person.email}
                className="field"
              />
            </div>
          </div>
        </fieldset>

        {/* ------------------------------------------------------ personal */}
        <fieldset className="mt-7">
          <legend className="section-title mb-3">Personal</legend>
          <div className="space-y-4">
            <div>
              <label htmlFor="dob" className="label">
                Date of birth *
              </label>
              <input
                id="dob"
                name="dob"
                type="date"
                defaultValue={person.dob ?? ""}
                max="2026-12-31"
                min="1900-01-01"
                className="field"
              />
              <p className="mt-1 text-2xs text-ink-faint">
                The full date including the year. You can hide the year from other
                members below.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="bloodGroup" className="label">
                  Blood group
                </label>
                <select
                  id="bloodGroup"
                  name="bloodGroup"
                  defaultValue={person.bloodGroup}
                  className="field"
                >
                  <option value="">Not known</option>
                  {BLOOD_GROUPS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="maritalStatus" className="label">
                  Marital status
                </label>
                <select
                  id="maritalStatus"
                  name="maritalStatus"
                  defaultValue={person.maritalStatus}
                  className="field"
                >
                  <option value="">Not specified</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="livingIn" className="label">
                Currently living in
              </label>
              <input
                id="livingIn"
                name="livingIn"
                defaultValue={person.livingIn}
                placeholder="Indore, Mumbai, USA…"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="education" className="label">
                Education / qualification
              </label>
              <input
                id="education"
                name="education"
                defaultValue={person.education}
                placeholder="B.Com, CA, MBBS…"
                className="field"
              />
            </div>
          </div>
        </fieldset>

        {/* ------------------------------------------------------ business */}
        <fieldset className="mt-7">
          <legend className="section-title mb-1">Business & work</legend>
          <p className="mb-3 text-xs leading-relaxed text-ink-soft">
            This is what makes the app useful to the group — members search here when
            they need a supplier, a professional, or a recommendation.
          </p>
          <div className="space-y-4">
            <div>
              <label htmlFor="occupationType" className="label">
                What best describes you?
              </label>
              <select
                id="occupationType"
                name="occupationType"
                defaultValue={person.occupationType}
                className="field"
              >
                <option value="">Not specified</option>
                {OCCUPATION_TYPES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="businessCategory" className="label">
                Business category
              </label>
              <select
                id="businessCategory"
                name="businessCategory"
                defaultValue={person.business.category}
                className="field"
              >
                <option value="">Choose a category</option>
                {BUSINESS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-2xs text-ink-faint">
                Members browse by category, so picking one is how they find you.
              </p>
            </div>
            <div>
              <label htmlFor="businessName" className="label">
                Business name
              </label>
              <input
                id="businessName"
                name="businessName"
                defaultValue={person.business.name}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="businessDescription" className="label">
                What you do — one line
              </label>
              <input
                id="businessDescription"
                name="businessDescription"
                maxLength={160}
                defaultValue={person.business.description}
                placeholder="Wholesale supplier of plywood and laminates"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="businessKeywords" className="label">
                Products & services
              </label>
              <input
                id="businessKeywords"
                name="businessKeywords"
                defaultValue={person.business.keywords}
                placeholder="plywood, laminate, sunmica, veneer"
                className="field"
              />
              <p className="mt-1 text-2xs text-ink-faint">
                Separate with commas. Search reads these words, so add everything you
                deal in.
              </p>
            </div>
            <div>
              <label htmlFor="businessAddress" className="label">
                Business address
              </label>
              <input
                id="businessAddress"
                name="businessAddress"
                defaultValue={person.business.address}
                className="field"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="businessPhone" className="label">
                  Business phone
                </label>
                <input
                  id="businessPhone"
                  name="businessPhone"
                  type="tel"
                  inputMode="numeric"
                  defaultValue={person.business.phone}
                  className="field tnum"
                />
              </div>
              <div>
                <label htmlFor="businessInstagram" className="label">
                  Instagram
                </label>
                <input
                  id="businessInstagram"
                  name="businessInstagram"
                  defaultValue={person.business.instagram}
                  placeholder="@handle"
                  className="field"
                />
              </div>
            </div>
            <div>
              <label htmlFor="businessWebsite" className="label">
                Website
              </label>
              <input
                id="businessWebsite"
                name="businessWebsite"
                type="url"
                defaultValue={person.business.website}
                placeholder="https://"
                className="field"
              />
            </div>

            <VisitingCardPicker
              initialCard={person.business.visitingCard}
              initialCardUrl={photoUrl(person.business.visitingCard)}
            />
          </div>
        </fieldset>

        {/* ------------------------------------------------------- privacy */}
        <fieldset className="mt-7">
          <legend className="section-title mb-1">Privacy</legend>
          <p className="mb-3 text-xs leading-relaxed text-ink-soft">
            Everything below is visible to signed-in members unless you switch it
            to Hidden. Nothing is ever public outside the group.
          </p>
          {/* Each row states its outcome — "Visible" or "Hidden" — beside the
              switch, so what the group can see is readable at a glance rather
              than deduced from checkbox logic. Checked still means hidden,
              exactly what the server stores. */}
          <div className="card divide-y divide-line-soft">
            {(
              [
                ["hideMobile", "Mobile number", person.privacy.hideMobile],
                ["hideWhatsapp", "WhatsApp number", person.privacy.hideWhatsapp],
                ["hideEmail", "Email", person.privacy.hideEmail],
                [
                  "hideDobYear",
                  "Birth year — day & month always shown",
                  person.privacy.hideDobYear,
                ],
                ["hidePhoto", "Photo", person.privacy.hidePhoto],
              ] as const
            ).map(([name, label, checked]) => (
              <label
                key={name}
                htmlFor={name}
                className="flex min-h-[3rem] cursor-pointer items-center gap-3 px-4 py-2.5"
              >
                <span className="min-w-0 flex-1 text-sm">{label}</span>
                <input
                  id={name}
                  name={name}
                  type="checkbox"
                  defaultChecked={checked}
                  className="sr-only"
                />
                <span className="switch-state-on text-xs font-medium text-ink-faint">
                  Visible
                </span>
                <span className="switch-state-off text-xs font-semibold text-kesar-text">
                  Hidden
                </span>
                <span aria-hidden="true" className="switch" />
              </label>
            ))}
          </div>
        </fieldset>

        <SaveBar cancelHref={returnTo} />
      </form>
    </>
  );
}
